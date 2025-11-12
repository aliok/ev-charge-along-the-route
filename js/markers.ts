import state, { ExtendedMarker, StationData, DetourData, LiveSocketData, LiveSocketDataState } from './state.js';
import { translate, currentLang } from './i18n.js';
import { formatDistance, formatDuration, getFaviconUrlFromReportUrl, showTemporaryMessage } from './utils.js';
import { 
    DEFAULT_POI_ZINDEX,
    HOVER_POI_ZINDEX,
    SELECTED_POI_ZINDEX,
    DEFAULT_EV_SVG_ICON,
    DEFAULT_EV_SVG_DATA_URI,
    DETOUR_ERROR_KEY,
    DETOUR_LOADING_KEY,
    STATION_SOCKETS_API_URL_TEMPLATE,
    API_HEADERS,
    MAX_API_RETRIES,
    SOCKET_API_RETRY_DELAY,
    IGNORE_ICON_SVG,
    translations
} from './config.js';
import { createElement, createBadge, createImageWithFallback } from './dom-utils.js';
import { toLatLng, createGoogleMapsLink } from './geo-utils.js';
import { analyzeStationSockets, getAvailabilityInfo, formatPower, getPowerEmoji } from './socket-utils.js';
import { withRetry, fetchJson } from './async-utils.js';

// Callbacks for business logic (set by main.js)
let calculateAndDisplayDetourOnClickCallback: ((marker: ExtendedMarker, poiLocation: google.maps.LatLng, startLoc: google.maps.LatLng, endLoc: google.maps.LatLng, originalDist: number, originalDur: number) => void) | null = null;

interface MarkerCallbacks {
    calculateAndDisplayDetourOnClick?: (marker: ExtendedMarker, poiLocation: google.maps.LatLng, startLoc: google.maps.LatLng, endLoc: google.maps.LatLng, originalDist: number, originalDur: number) => void;
}

export function setupMarkerCallbacks(callbacks: MarkerCallbacks): void {
    if (callbacks.calculateAndDisplayDetourOnClick) {
        calculateAndDisplayDetourOnClickCallback = callbacks.calculateAndDisplayDetourOnClick;
    }
}

// --- Marker Creation ---
export function createMarkerForStation(stationData: StationData): ExtendedMarker | null {
    try {
        const brandName = stationData.brand;
        const stationIdString = stationData.id;
        const iconContainerId = `poi-icon-container-${stationIdString}`;

        // Build marker DOM structure using utilities
        const markerWrapper = createElement('div', { className: 'marker-pin-wrapper' });
        const container = createElement('div', { className: 'poi-marker-content-container' });

        // Icon container with favicon or fallback
        const iconContainer = createElement('div', { 
            className: 'poi-icon-container',
            id: iconContainerId 
        });
        
        const googleFaviconUrl = getFaviconUrlFromReportUrl(stationData.reportUrl);
        const altText = translate('markerLogoAlt', {
            name: brandName || stationData.title || stationIdString
        });
        
        if (googleFaviconUrl) {
            const img = createImageWithFallback(
                googleFaviconUrl, 
                altText, 
                'poi-marker-img', 
                DEFAULT_EV_SVG_ICON,
                iconContainerId
            );
            iconContainer.appendChild(img);
        } else {
            iconContainer.innerHTML = DEFAULT_EV_SVG_ICON;
        }
        container.appendChild(iconContainer);

        // Analyze sockets and create badges using utilities
        const socketAnalysis = analyzeStationSockets(stationData.sockets);
        
        const badgeContainer = createElement('div', { className: 'marker-badges' });
        if (socketAnalysis.hasAC) {
            badgeContainer.appendChild(createBadge('AC', 'badge-ac'));
        }
        if (socketAnalysis.hasDC) {
            badgeContainer.appendChild(createBadge('DC', 'badge-dc'));
        }
        if (socketAnalysis.powerCategory > 0) {
            badgeContainer.appendChild(
                createBadge('⚡'.repeat(socketAnalysis.powerCategory), `badge-power-${socketAnalysis.powerCategory}`)
            );
        }
        if (badgeContainer.hasChildNodes()) {
            container.appendChild(badgeContainer);
        }

        // Detour text element
        const detourText = createElement('span', {
            className: 'poi-marker-detour-text',
            id: `poi-marker-detour-${stationIdString}`
        });
        container.appendChild(detourText);

        // Favorite badge
        const favBadge = createElement('span', {
            className: 'marker-fav-badge',
            textContent: '⭐',
            id: `poi-marker-fav-${stationIdString}`
        });
        container.appendChild(favBadge);

        markerWrapper.appendChild(container);

        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: stationData.lat, lng: stationData.lng },
            map: state.map,
            title: brandName || stationData.title || `Station ${stationIdString}`,
            content: markerWrapper,
            zIndex: DEFAULT_POI_ZINDEX
        }) as ExtendedMarker;

        // Attach data and listeners
        marker.poiData = stationData;
        marker.stationId = stationIdString;
        marker.detourData = null;
        marker.liveSocketData = null;
        marker.cachedInfoWindowContent = null;
        
        marker.addListener('click', () => {
            if (marker.map != null) {
                fetchPoiDetails(marker, marker.poiData!, false);
            }
        });
        
        container.addEventListener('mouseover', () => {
            if (marker !== state.selectedPoiMarker) {
                marker.zIndex = HOVER_POI_ZINDEX;
            }
        });
        
        container.addEventListener('mouseout', () => {
            if (marker !== state.selectedPoiMarker) {
                marker.zIndex = DEFAULT_POI_ZINDEX;
            }
        });

        return marker;

    } catch (error) {
        console.error(`Error creating AdvancedMarkerElement for Station ${stationData.id}:`, error);
        return null;
    }
}

export function updateMarker(type: 'start' | 'end', location: google.maps.LatLng, title: string): void {
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('custom-marker-content');
    if (type === 'start') {
        contentDiv.textContent = translate('markerStart');
        contentDiv.classList.add('start-marker-content');
    } else {
        contentDiv.textContent = translate('markerDest');
        contentDiv.classList.add('dest-marker-content');
    }
    const markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
        position: location,
        map: state.map,
        title: title,
        content: contentDiv,
        zIndex: 100
    };
    try {
        if (type === 'start') {
            if (state.startMarker) state.startMarker.map = null;
            state.startMarker = new google.maps.marker.AdvancedMarkerElement(markerOptions) as ExtendedMarker;
        } else if (type === 'end') {
            if (state.endMarker) state.endMarker.map = null;
            state.endMarker = new google.maps.marker.AdvancedMarkerElement(markerOptions) as ExtendedMarker;
        }
    } catch (error) {
        console.error(`Error creating AdvancedMarkerElement for ${type}:`, error);
        showTemporaryMessage(`Failed to create ${type} marker.`, true);
        if (type === 'start') state.startMarker = null;
        else if (type === 'end') state.endMarker = null;
    }
}

// --- Marker State Management ---
export function resetSelectedMarkerZIndex(): void {
    if (state.selectedPoiMarker) {
        state.selectedPoiMarker.zIndex = DEFAULT_POI_ZINDEX;
        console.log(`Reset zIndex for ${state.selectedPoiMarker.stationId}`);
    }
    state.selectedPoiMarker = null;
}

export function updateMarkerDetourText(marker: ExtendedMarker, detourData: DetourData | null): void {
    if (!marker || !marker.content) return;
    const contentElement = marker.content as HTMLElement;
    const detourEl = contentElement.querySelector('.poi-marker-detour-text') as HTMLElement | null;
    if (!detourEl) {
        return;
    }
    let text = '';
    if (detourData && detourData.status === 'OK') {
        const distKm = (detourData.extraDist || 0) / 1000;
        const timeMin = Math.round((detourData.extraTime || 0) / 60);
        if (Math.abs(distKm) >= 0.1 || Math.abs(timeMin) >= 1) {
            text = `${distKm >= 0 ? '+' : ''}${distKm.toFixed(1)}${translate('unitKm')}`;
        } else {
            text = '';
        }
    } else if (detourData && detourData.status === 'Error') {
        text = translate('markerDetourError');
    } else {
        text = '';
    }
    detourEl.textContent = text;
}

// --- Info Window Management ---
export function updateInfoWindowIfVisible(marker: ExtendedMarker): void {
    if (!state.infoWindow || !marker) return;
    const infoWindowWithMethods = state.infoWindow as google.maps.InfoWindow & { getAnchor?: () => ExtendedMarker | null; getMap?: () => google.maps.Map | null };
    const anchor = infoWindowWithMethods.getAnchor?.();
    const map = infoWindowWithMethods.getMap?.();
    if (anchor !== marker || !map) {
        if (marker) {
            // Update cache even if not visible, in case it becomes visible later
            const fetchStatus = marker.liveSocketData === null ? 'loading' : (marker.liveSocketData === false ? 'error' : 'ok');
            const detourHtml = getDetourHtmlFromData(marker.detourData);
            marker.cachedInfoWindowContent = buildInfoWindowHtml(marker, marker.poiData!, marker.liveSocketData ?? null, fetchStatus, detourHtml);
        }
        return;
    }

    console.log(`Updating visible IW for ${marker.stationId}`);
    const fetchStatus = marker.liveSocketData === null ? 'loading' : (marker.liveSocketData === false ? 'error' : 'ok');
    const detourHtml = getDetourHtmlFromData(marker.detourData);
    const finalContentString = buildInfoWindowHtml(marker, marker.poiData!, marker.liveSocketData ?? null, fetchStatus, detourHtml);
    marker.cachedInfoWindowContent = finalContentString;
    state.infoWindow.setContent(finalContentString);
}

function getDetourHtmlFromData(detourData: DetourData | null | undefined): string {
    if (!state.isRouteActive) return '';
    if (!detourData || detourData.status === 'Pending') {
        return translate(DETOUR_LOADING_KEY);
    }

    switch (detourData.status) {
        case 'OK':
            const extraDistStr = (detourData.extraDist || 0) > 0 ? `+${formatDistance(detourData.extraDist || 0, translate)}` : `${formatDistance(detourData.extraDist || 0, translate)}`;
            const extraDurStr = (detourData.extraTime || 0) >= 0 ? `+${formatDuration(detourData.extraTime || 0, translate)}` : `${formatDuration(detourData.extraTime || 0, translate)}`;
            const isNegligible = Math.abs(detourData.extraDist || 0) < 50 && Math.abs(detourData.extraTime || 0) < 10;

            let detourSummaryHtml = isNegligible ?
                `<span>${translate('iwDetourNegligible')}</span>` :
                `<span>${translate('iwDetourInfo', {extraDistStr: extraDistStr, extraDurStr: extraDurStr})}</span>`;

            let detailHtml = '';
            if (detourData.distFromStart !== undefined && detourData.timeFromStart !== undefined && detourData.distToEnd !== undefined && detourData.timeToEnd !== undefined) {
                const distFromStartStr = formatDistance(detourData.distFromStart, translate);
                const timeFromStartStr = formatDuration(detourData.timeFromStart, translate);
                const distToEndStr = formatDistance(detourData.distToEnd, translate);
                const timeToEndStr = formatDuration(detourData.timeToEnd, translate);

                detailHtml = `
                        <div class="detour-breakdown">
                            <span>${translate('iwFromStart')}</span> ${distFromStartStr}, ${timeFromStartStr}<br>
                            <span>${translate('iwToDest')}</span> ${distToEndStr}, ${timeToEndStr}
                        </div>
                    `;
            }

            return `${detourSummaryHtml}${detailHtml}`;

        case 'Error':
            const infoWindowWithMethods = state.infoWindow as google.maps.InfoWindow & { getAnchor?: () => ExtendedMarker | null } | null;
            const anchorMarker = infoWindowWithMethods?.getAnchor?.();
            const stationId = anchorMarker?.stationId;
            const retryButtonHtml = stationId ?
                `<button onclick='retryDetourCalculation(${JSON.stringify(stationId)})' class='retry-button'>${translate('iwRetry')}</button>` :
                '';
            return `<span class="text-red-600">${translate(DETOUR_ERROR_KEY)}</span> ${retryButtonHtml}`;
        default:
            return translate(DETOUR_LOADING_KEY);
    }
}

function buildDetourSectionHtml(detourHtml: string): string {
    if (!state.isRouteActive) return '';
    const content = `<div class="detour-info">${detourHtml || translate(DETOUR_LOADING_KEY)}</div>`;
    return `<div class="info-section">${content}</div>`;
}

function buildInfoWindowHtml(marker: ExtendedMarker, poiData: StationData, liveSocketsData: LiveSocketDataState, fetchStatus: 'loading' | 'error' | 'ok', detourHtml: string = ''): string {
    const poiLocation = marker.position;
    if (!poiLocation) {
        console.error('Marker has no position');
        return '';
    }
    const contentElement = marker.content as HTMLElement | null;
    const iconContainer = contentElement?.querySelector('.poi-icon-container');
    let logoSrc = DEFAULT_EV_SVG_DATA_URI;
    if (iconContainer?.firstElementChild?.tagName === 'IMG') {
        logoSrc = (iconContainer.firstElementChild as HTMLImageElement).src;
    }

    let mainTitle = poiData.brand || poiData.title || `Station ${poiData.id}`;
    const currentBrand = poiData.brand;
    const stationId = poiData.id;
    const isFav = currentBrand && state.favoriteBrands.has(currentBrand);
    const isBlk = currentBrand && state.blacklistedBrands.has(currentBrand);
    const isIgnored = state.ignoredStationIds.has(stationId);

    let titlePrefix = '';
    if (isFav) titlePrefix = '⭐ ';
    else if (isBlk) titlePrefix = '🚫 ';
    mainTitle = titlePrefix + mainTitle;

    let subTitle = '';
    if (poiData.brand && poiData.title && poiData.brand !== poiData.title) {
        subTitle = `<p class="info-subtitle">${poiData.title}</p>`;
    }

    let infoActionsHtml = '';
    if (!isIgnored) {
        infoActionsHtml = `<span class="info-actions">`;
        if (currentBrand) {
            const escapedBrand = JSON.stringify(currentBrand);
            infoActionsHtml += `<button class="brand-fav ${isFav ? 'active-fav' : ''}" onclick='handleInfoWindowBrandAction(${escapedBrand}, "favorite")' title="${translate('brandFavoriteAction')}">⭐</button>`;
            infoActionsHtml += `<button class="brand-blk ${isBlk ? 'active-blk' : ''}" onclick='handleInfoWindowBrandAction(${escapedBrand}, "blacklist")' title="${translate('brandBlacklistAction')}">🚫</button>`;
        }
        const escapedStationId = JSON.stringify(stationId);
        infoActionsHtml += `<button class="ignore-station" onclick='handleIgnoreStationClick(${escapedStationId})' title="${translate('ignoreStationAction')}">${IGNORE_ICON_SVG}</button>`;
        infoActionsHtml += `</span>`;
    } else {
        infoActionsHtml = `<span class="text-xs text-gray-500 ml-2">${translate('iwIgnored')}</span>`;
    }

    const operatorTitle = poiData.operatorTitle || translate('iwNA');
    const address = poiData.address || translate('iwNA');
    const phoneRaw = poiData.phone;
    const phoneHtml = phoneRaw ? `<a href="tel:${phoneRaw}">${phoneRaw}</a>` : translate('iwNA');
    const websiteUrl = poiData.reportUrl;

    const gmapsLink = createGoogleMapsLink(poiLocation);

    const detourSection = buildDetourSectionHtml(detourHtml);

    let socketsHtml = '';
    const baseSockets = poiData.sockets;
    if (!baseSockets || baseSockets.length === 0) {
        socketsHtml = `<p class="text-sm text-gray-600">${translate('iwNoSockets')}</p>`;
    } else {
        socketsHtml = '<ul class="socket-list">';
        baseSockets.forEach(baseSocket => {
            const socketId = baseSocket.id;
            const liveInfo = (fetchStatus === 'ok' && Array.isArray(liveSocketsData)) 
                ? liveSocketsData.find(liveSock => liveSock.id === socketId) 
                : null;

            // Determine status using socket-utils
            let statusClass: string;
            let statusTextKey: string;
            
            if (fetchStatus === 'loading') {
                statusClass = 'status-loading';
                statusTextKey = 'iwLoading';
            } else if (fetchStatus === 'error' || !liveInfo?.availability) {
                statusClass = 'status-unknown';
                statusTextKey = 'iwUnknown';
            } else {
                const availInfo = getAvailabilityInfo(liveInfo.availability);
                statusClass = availInfo.statusClass;
                statusTextKey = availInfo.statusKey;
            }
            
            const statusText = translate(statusTextKey);

            // Price display
            let priceDisplay: string;
            if (fetchStatus === 'loading') {
                priceDisplay = `<span class="status-loading">${translate('iwLoading')}</span>`;
            } else if (fetchStatus === 'ok' && liveInfo && typeof liveInfo.price === 'number') {
                priceDisplay = `₺${liveInfo.price.toFixed(2)}`;
            } else {
                priceDisplay = `<span class="status-unknown">${translate('iwNA')}</span>`;
            }

            // Socket type, power display using socket-utils
            const socketTypeDisplay = baseSocket.type ? baseSocket.type.toUpperCase() : '?';
            const powerDisplay = formatPower(baseSocket.power);
            const powerEmoji = getPowerEmoji(baseSocket.power);

            socketsHtml += `<li class="socket-item">
                                    <div class="socket-details">
                                        <div class="socket-type-power"><span class="socket-type">${socketTypeDisplay}</span><span class="socket-power">${powerDisplay}</span><span class="socket-power-emoji">${powerEmoji}</span></div>
                                        <span class="socket-price">${priceDisplay}</span>
                                    </div>
                                    <span class="socket-status ${statusClass}">${statusText}</span>
                                </li>`;
        });
        socketsHtml += '</ul>';
    }

    const disclaimerText = `<p class="status-disclaimer">${translate('iwDisclaimer')}</p>`;
    const socketsSection = `
            <div class="info-section">
                <h4>${translate('iwSockets')}</h4>
                ${socketsHtml}
                ${fetchStatus === 'error' ? `<p class="text-xs text-red-500 mt-1">${translate('iwSocketStatusError')}</p>` : ''}
                ${(baseSockets && baseSockets.length > 0) ? disclaimerText : ''}
            </div>`;

    const linksStaticInfoSection = `
            <div class="info-section links-static-info-section">
                 <a href="${gmapsLink}" target="_blank" class="map-link block mb-2">${translate('iwOpenMap')}</a>
                 ${websiteUrl ? `<p class="mb-1"><a href="${websiteUrl}" target="_blank">${translate('iwVisitWebsite')}</a></p>` : ''}
                 <p class="hidden md:block"><strong>${translate('iwOperator')}</strong> ${operatorTitle}</p>
                 <p class="hidden md:block"><strong>${translate('iwAddress')}</strong> ${address}</p>
                 <p class="hidden md:block"><strong>${translate('iwPhone')}</strong> ${phoneHtml}</p>
            </div>`;

    const escHintHtml = `<span class="esc-hint hidden sm:inline">${translate('iwEscHint')}</span>`;

    let addToRouteButtonHtml = '';
    const canAddToRoute = state.routeWaypoints.some(wp => wp.type === 'start') && state.routeWaypoints.some(wp => wp.type === 'destination');
    const isAlreadyInRoute = state.routeWaypoints.some(wp => wp.type === 'station' && wp.id === String(poiData.id));

    if (canAddToRoute) {
        addToRouteButtonHtml = `
                <button class="add-to-route-btn"
                        onclick="handleAddStationToRoute('${poiData.id}')"
                        ${isAlreadyInRoute ? 'disabled' : ''}>
                    ${isAlreadyInRoute ? translate('buttonInRoute') : translate('buttonAddToRoute')}
                </button>
             `;
    }

    return `
            <div class="poi-info-window">
                 <img src="${logoSrc}" class="info-logo" alt="${translate('markerLogoAlt', {name: poiData.brand || poiData.title || poiData.id})}" onerror="this.src='${DEFAULT_EV_SVG_DATA_URI}'; this.onerror=null;">
                 <div class="title-area">
                     <h3>${mainTitle}${addToRouteButtonHtml}</h3>
                     ${infoActionsHtml}
                 </div>
                ${subTitle}
                ${detourSection}
                ${socketsSection}
                ${linksStaticInfoSection}
                ${escHintHtml}
            </div>`;
}

// --- POI Details Fetching ---
export async function fetchPoiDetails(marker: ExtendedMarker, poiData: StationData, suppressInfoWindowOpen: boolean = false): Promise<void> {
    if (!marker || !poiData || !poiData.id) return;
    const stationId = poiData.id;
    const poiLocation = marker.position;
    if (!poiLocation) {
        console.error("Clicked marker has no position.");
        return;
    }
    if (state.ignoredStationIds.has(stationId)) {
        console.log(`Station ${stationId} is ignored, not opening InfoWindow.`);
        return;
    }

    if (!suppressInfoWindowOpen) {
        marker.liveSocketData = null;
        marker.cachedInfoWindowContent = null;
        if (!marker.detourData || marker.detourData.status !== 'Pending') {
            marker.detourData = null;
        }
        resetSelectedMarkerZIndex();
        marker.zIndex = SELECTED_POI_ZINDEX;
        state.selectedPoiMarker = marker;
        console.log(`Set zIndex to ${SELECTED_POI_ZINDEX} for ${stationId}`);
    } else {
        if (marker.detourData) updateMarkerDetourText(marker, marker.detourData);
    }
    console.log(`Fetching details for Station ID: ${stationId}`, `Suppress InfoWindow: ${suppressInfoWindowOpen}`);

    let triggerOnDemandCalc = false;
    let initialDetourHtml = '';
    if (state.isRouteActive && state.originalRouteDistance !== null) {
        if (!marker.detourData || marker.detourData.status === 'Pending') {
            initialDetourHtml = translate(DETOUR_LOADING_KEY);
            if (!suppressInfoWindowOpen) triggerOnDemandCalc = true;
            updateMarkerDetourText(marker, null);
        } else {
            initialDetourHtml = getDetourHtmlFromData(marker.detourData);
            updateMarkerDetourText(marker, marker.detourData);
            if (marker.detourData.status === 'Error' && !suppressInfoWindowOpen) {
                triggerOnDemandCalc = true;
            }
        }
    } else {
        initialDetourHtml = '';
        updateMarkerDetourText(marker, null);
    }

    if (!suppressInfoWindowOpen && state.infoWindow && state.map && marker.position) {
        (state.map as any).setOptions({ padding: { top: 350 } });
        state.map.panTo(marker.position);

        const initialContent = buildInfoWindowHtml(marker, poiData, null, 'loading', initialDetourHtml);
        state.infoWindow.setContent(initialContent);
        state.infoWindow.open({
            anchor: marker,
            map: state.map,
            shouldFocus: false
        });
        console.log(`Displayed initial InfoWindow for ${stationId} with socket: loading, detour: "${initialDetourHtml}"`);
    } else if (suppressInfoWindowOpen) {
        console.log(`fetchPoiDetails called for POI ${stationId} with suppressInfoWindowOpen=true (pre-fetch)`);
    }

    // Fetch sockets if not already loaded/loading or if forced by direct click
    if (marker.liveSocketData === null || (suppressInfoWindowOpen && marker.liveSocketData === false)) {
        const socketsUrl = STATION_SOCKETS_API_URL_TEMPLATE.replace('{id}', stationId);
        console.log(`Starting socket fetch for ${stationId}...`);
        marker.liveSocketData = null;

        (async () => {
            try {
                const liveSocketsStatus = await withRetry<LiveSocketData[]>(
                    () => fetchJson<LiveSocketData[]>(socketsUrl, {
                        method: 'GET',
                        headers: API_HEADERS,
                        cache: 'reload'
                    }),
                    {
                        maxRetries: MAX_API_RETRIES,
                        retryDelay: SOCKET_API_RETRY_DELAY,
                        onRetry: (attempt, error) => {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.warn(`Socket fetch ERROR for ${stationId} (Attempt ${attempt}/${MAX_API_RETRIES + 1}):`, errorMessage);
                        }
                    }
                );
                console.log(`Socket fetch SUCCESS for ${stationId}`);
                marker.liveSocketData = liveSocketsStatus as LiveSocketDataState;
                updateInfoWindowIfVisible(marker);
            } catch (error) {
                console.error(`Final socket fetch attempt failed for ${stationId}.`);
                marker.liveSocketData = false;
                updateInfoWindowIfVisible(marker);
            }
        })();
    } else {
        console.log(`Skipping socket fetch for ${stationId} - data already exists or suppress=true.`);
        if (!suppressInfoWindowOpen) updateInfoWindowIfVisible(marker);
    }

    if (triggerOnDemandCalc && !suppressInfoWindowOpen && state.isRouteActive && state.startLocation && state.endLocation && state.originalRouteDistance !== null && state.originalRouteDuration !== null && marker.position) {
        console.log(`Starting on-demand detour calculation for ${stationId}...`);
        if (calculateAndDisplayDetourOnClickCallback) {
            const position = toLatLng(marker.position);
            calculateAndDisplayDetourOnClickCallback(marker, position, state.startLocation, state.endLocation, state.originalRouteDistance, state.originalRouteDuration);
        }
    }
}

