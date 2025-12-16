import state from './state.js';
import { translate } from './i18n.js';
import { formatDistance, formatDuration } from './utils.js';
import { 
    defaultFilters, 
    DEFAULT_DISTANCE_THRESHOLD, 
    OFFSET_INCREMENT_KM,
    IGNORE_ICON_SVG,
    EYE_ICON_SVG_ROUTE_PANEL,
    EYE_SLASH_ICON_SVG_ROUTE_PANEL
} from './config.js';
import { createElement, createButton, clearChildren, setButtonDisabled } from './dom-utils.js';

// --- UI Element References ---
let controlPanel: HTMLElement | null = null;
let inputContainer: HTMLElement | null = null;
let hamburgerButton: HTMLElement | null = null;
let startInput: HTMLInputElement | null = null;
let endInput: HTMLInputElement | null = null;
let clearStartBtn: HTMLElement | null = null;
let clearEndBtn: HTMLElement | null = null;
let pasteStartBtn: HTMLElement | null = null;
let pasteEndBtn: HTMLElement | null = null;
let useLocationStartBtn: HTMLButtonElement | null = null;
let useLocationEndBtn: HTMLButtonElement | null = null;
let messageBox: HTMLElement | null = null;
let distanceContainer: HTMLElement | null = null;
let distanceSlider: HTMLInputElement | null = null;
let distanceValueDisplay: HTMLElement | null = null;
let mapTypeControlContainer: HTMLElement | null = null;
let mapTypeButtons: NodeListOf<HTMLButtonElement> | HTMLButtonElement[] = [];
let loadingOverlay: HTMLElement | null = null;
let loadingText: HTMLElement | null = null;
let loadingDetails: HTMLElement | null = null;
let loadingProgressBarInner: HTMLElement | null = null;
let filterToggleButton: HTMLElement | null = null;
let filterPanel: HTMLElement | null = null;
let closeFilterButton: HTMLElement | null = null;
let resetFiltersButton: HTMLElement | null = null;
let brandFilterModeButton: HTMLElement | null = null;
let filterInputs: {
    connectorType: NodeListOf<HTMLInputElement>;
    powerLevel: NodeListOf<HTMLInputElement>;
    serviceType: NodeListOf<HTMLInputElement>;
} = {
    connectorType: document.querySelectorAll('#filter-connector-type input[name="connectorType"]') as NodeListOf<HTMLInputElement>,
    powerLevel: document.querySelectorAll('#filter-power input[name="powerLevel"]') as NodeListOf<HTMLInputElement>,
    serviceType: document.querySelectorAll('#filter-service-type input[name="serviceType"]') as NodeListOf<HTMLInputElement>
};
let brandListContainer: HTMLElement | null = null;
let brandListViewControls: HTMLElement | null = null;
let ignoredStationsListContainer: HTMLElement | null = null;
let offsetControlsContainer: HTMLElement | null = null;
let startOffsetDisplay: HTMLElement | null = null;
let destOffsetDisplay: HTMLElement | null = null;
let offsetStartIncBtn: HTMLButtonElement | null = null;
let offsetStartDecBtn: HTMLButtonElement | null = null;
let offsetDestIncBtn: HTMLButtonElement | null = null;
let offsetDestDecBtn: HTMLButtonElement | null = null;
let routeBuilderToggleButton: HTMLElement | null = null;
let routeBuilderPanel: HTMLElement | null = null;
let closeRouteBuilderBtn: HTMLElement | null = null;
let waypointsListContainer: HTMLElement | null = null;
let clearWaypointsBtn: HTMLElement | null = null;
let routeSummaryContainer: HTMLElement | null = null;
let optimizeRouteBtn: HTMLButtonElement | null = null;
let togglePoiVisibilityBtn: HTMLButtonElement | null = null;
let openRouteInGmapsBtn: HTMLButtonElement | null = null;

// --- UI Initialization ---
export function getUIElements(): void {
    controlPanel = document.getElementById('control-panel');
    inputContainer = document.getElementById('input-container');
    hamburgerButton = document.getElementById('hamburger-btn');
    startInput = document.getElementById('start-input') as HTMLInputElement | null;
    endInput = document.getElementById('end-input') as HTMLInputElement | null;
    clearStartBtn = document.getElementById('clear-start-btn');
    clearEndBtn = document.getElementById('clear-end-btn');
    pasteStartBtn = document.getElementById('paste-start-btn');
    pasteEndBtn = document.getElementById('paste-end-btn');
    useLocationStartBtn = document.getElementById('use-location-start-btn') as HTMLButtonElement | null;
    useLocationEndBtn = document.getElementById('use-location-end-btn') as HTMLButtonElement | null;
    messageBox = document.getElementById('message-box');
    distanceContainer = document.getElementById('distance-container');
    distanceSlider = document.getElementById('distance-slider') as HTMLInputElement | null;
    distanceValueDisplay = document.getElementById('distance-value');
    mapTypeControlContainer = document.getElementById('map-type-control');
    mapTypeButtons = mapTypeControlContainer?.querySelectorAll('button') as NodeListOf<HTMLButtonElement> || [];
    loadingOverlay = document.getElementById('loading-overlay');
    loadingText = document.getElementById('loading-text');
    loadingDetails = document.getElementById('loading-details');
    loadingProgressBarInner = document.getElementById('loading-progress-inner');
    filterToggleButton = document.getElementById('filter-toggle-btn');
    brandFilterModeButton = document.getElementById('brand-filter-mode-btn');
    filterPanel = document.getElementById('filter-panel');
    closeFilterButton = document.getElementById('close-filter-btn');
    resetFiltersButton = document.getElementById('reset-filters-btn');
    filterInputs.connectorType = document.querySelectorAll('#filter-connector-type input[name="connectorType"]') as NodeListOf<HTMLInputElement>;
    filterInputs.powerLevel = document.querySelectorAll('#filter-power input[name="powerLevel"]') as NodeListOf<HTMLInputElement>;
    filterInputs.serviceType = document.querySelectorAll('#filter-service-type input[name="serviceType"]') as NodeListOf<HTMLInputElement>;
    brandListContainer = document.getElementById('brand-list-container');
    brandListViewControls = document.getElementById('brand-list-view-controls');
    ignoredStationsListContainer = document.getElementById('ignored-stations-list');
    offsetControlsContainer = document.getElementById('offset-controls');
    startOffsetDisplay = document.getElementById('start-offset-display');
    destOffsetDisplay = document.getElementById('dest-offset-display');
    offsetStartIncBtn = document.getElementById('offset-start-inc') as HTMLButtonElement | null;
    offsetStartDecBtn = document.getElementById('offset-start-dec') as HTMLButtonElement | null;
    offsetDestIncBtn = document.getElementById('offset-dest-inc') as HTMLButtonElement | null;
    offsetDestDecBtn = document.getElementById('offset-dest-dec') as HTMLButtonElement | null;
    routeBuilderToggleButton = document.getElementById('route-builder-toggle-btn');
    routeBuilderPanel = document.getElementById('route-builder-panel');
    closeRouteBuilderBtn = document.getElementById('close-route-builder-btn');
    waypointsListContainer = document.getElementById('route-waypoints-list-container');
    clearWaypointsBtn = document.getElementById('clear-waypoints-btn');
    routeSummaryContainer = document.getElementById('route-summary');
    optimizeRouteBtn = document.getElementById('optimize-route-btn') as HTMLButtonElement | null;
    togglePoiVisibilityBtn = document.getElementById('toggle-poi-visibility-btn') as HTMLButtonElement | null;
    openRouteInGmapsBtn = document.getElementById('open-route-in-gmaps-btn') as HTMLButtonElement | null;
}

export function validateUIElements(): boolean {
    return !!(loadingOverlay && loadingText && loadingDetails && loadingProgressBarInner && 
              controlPanel && inputContainer && hamburgerButton && startInput && endInput && 
              clearStartBtn && clearEndBtn && pasteStartBtn && pasteEndBtn && 
              useLocationStartBtn && useLocationEndBtn && messageBox && distanceContainer && 
              distanceSlider && distanceValueDisplay && mapTypeControlContainer && 
              filterToggleButton && brandFilterModeButton && filterPanel && closeFilterButton && 
              resetFiltersButton && brandListContainer && brandListViewControls && 
              ignoredStationsListContainer && offsetControlsContainer && startOffsetDisplay && 
              destOffsetDisplay && offsetStartIncBtn && offsetStartDecBtn && offsetDestIncBtn && 
              offsetDestDecBtn && routeBuilderToggleButton && routeBuilderPanel && 
              closeRouteBuilderBtn && waypointsListContainer && clearWaypointsBtn && 
              routeSummaryContainer && optimizeRouteBtn && togglePoiVisibilityBtn && 
              openRouteInGmapsBtn);
}

// --- UI Update Functions ---
export function updateRouteBuilderUI(directionsResult: google.maps.DirectionsResult | null = null): void {
    if (!waypointsListContainer) return;
    waypointsListContainer.innerHTML = '';

    if (state.routeWaypoints.length < 2) {
        waypointsListContainer.innerHTML = `<div class="waypoint-placeholder" data-i18n-key="routeBuilderPlaceholder">${translate('routeBuilderPlaceholder')}</div>`;
        routeBuilderToggleButton?.classList.remove('route-active');
        return;
    }

    routeBuilderToggleButton?.classList.add('route-active');

    const legs = directionsResult?.routes?.[0]?.legs;

    state.routeWaypoints.forEach((wp, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'waypoint-item-wrapper';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'waypoint-item';

        let icon = '';
        let name = wp.name || `Waypoint ${index + 1}`;

        if (wp.type === 'start') {
            icon = '📍';
            name = `<strong>${translate('labelStart')}:</strong> ${name}`;
        } else if (wp.type === 'destination') {
            icon = '🏁';
            name = `<strong>${translate('labelDestination')}:</strong> ${name}`;
        } else if (wp.type === 'station') {
            icon = '🔌';
        }

        const isFirst = index === 0;
        const isLast = index >= state.routeWaypoints.length - 1;
        const isStation = wp.type === 'station';

        const disableUp = isFirst || !isStation || state.routeWaypoints[index - 1]?.type === 'start';
        const disableDown = isLast || !isStation || state.routeWaypoints[index + 1]?.type === 'destination';
        const disableRemove = !isStation;

        itemDiv.innerHTML = `
                <span class="waypoint-icon">${icon}</span>
                <span class="waypoint-name" title="${wp.name}">${name}</span>
                <div class="waypoint-controls" data-index="${index}">
                    <button class="move-waypoint-up-btn" title="${translate('tooltipMoveUp')}" ${disableUp ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button class="move-waypoint-down-btn" title="${translate('tooltipMoveDown')}" ${disableDown ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    <button class="remove-waypoint-btn" title="${translate('tooltipRemoveWaypoint')}" ${disableRemove ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            `;
        wrapper.appendChild(itemDiv);

        if (legs && index < legs.length) {
            const leg = legs[index];
            const legInfoDiv = document.createElement('div');
            legInfoDiv.className = 'leg-info';
            const distanceStr = leg.distance ? formatDistance(leg.distance.value, translate) : '?';
            const durationStr = leg.duration ? formatDuration(leg.duration.value, translate) : '?';
            legInfoDiv.innerHTML = `<span>${distanceStr} &bull; ${durationStr}</span>`;
            wrapper.appendChild(legInfoDiv);
        }

        if (waypointsListContainer) {
            waypointsListContainer.appendChild(wrapper);
        }
    });
}

export function updatePoiVisibilityButtonUI(): void {
    if (!togglePoiVisibilityBtn) return;

    if (state.isRouteActive) {
        togglePoiVisibilityBtn.disabled = false;
        togglePoiVisibilityBtn.innerHTML = state.arePoisVisible ? EYE_SLASH_ICON_SVG_ROUTE_PANEL : EYE_ICON_SVG_ROUTE_PANEL;
        const titleKey = state.arePoisVisible ? 'titleHidePois' : 'titleShowPois';
        const titleText = translate(titleKey);
        togglePoiVisibilityBtn.setAttribute('title', titleText);
        togglePoiVisibilityBtn.setAttribute('aria-label', titleText);
    } else {
        togglePoiVisibilityBtn.disabled = true;
        const titleText = translate('titlePoisHiddenNoRoute');
        togglePoiVisibilityBtn.setAttribute('title', titleText);
        togglePoiVisibilityBtn.setAttribute('aria-label', titleText);
    }
}

export function updateMapTypeButtons(currentMapTypeId: string | google.maps.MapTypeId): void {
    if (!mapTypeButtons || mapTypeButtons.length === 0) return;
    const mapTypeIdStr = typeof currentMapTypeId === 'string' ? currentMapTypeId : String(currentMapTypeId);
    mapTypeButtons.forEach(button => {
        const buttonMapType = button.dataset.mapType;
        const isActive = buttonMapType === mapTypeIdStr;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

export function updateFilterControlsUI(): void {
    filterInputs.connectorType.forEach(input => {
        input.checked = (input.value === state.currentFilters.connectorType);
    });
    filterInputs.powerLevel.forEach(input => {
        input.checked = state.currentFilters.powerLevels.includes(input.value);
    });
    filterInputs.serviceType.forEach(input => {
        input.checked = state.currentFilters.serviceTypes.includes(input.value);
    });
}

export function updateDistanceSliderUI(): void {
    if (distanceSlider && distanceValueDisplay) {
        distanceSlider.value = String(state.distanceThresholdKm);
        distanceValueDisplay.textContent = String(state.distanceThresholdKm);
    }
}

export function updateBrandFilterModeButton(): void {
    if (!brandFilterModeButton) return;
    const isFavoritesOnly = state.brandFilterMode === 'favoritesOnly';
    brandFilterModeButton.classList.toggle('favorites-only', isFavoritesOnly);
    brandFilterModeButton.setAttribute('title', translate(isFavoritesOnly ? 'tooltipBrandFilterFavoritesOnly' : 'tooltipBrandFilterAll'));
    brandFilterModeButton.setAttribute('aria-label', translate(isFavoritesOnly ? 'tooltipBrandFilterFavoritesOnly' : 'tooltipBrandFilterAll'));
}

export function updateOffsetDisplay(): void {
    const unit = translate('unitKm');
    if (startOffsetDisplay) startOffsetDisplay.textContent = `${state.startOffsetKm} ${unit}`;
    if (destOffsetDisplay) destOffsetDisplay.textContent = `${state.endOffsetKm} ${unit}`;
}

export function updateOffsetButtonStates(): void {
    if (!state.isRouteActive || !state.originalRouteDistance) {
        setButtonDisabled(offsetStartIncBtn, true);
        setButtonDisabled(offsetStartDecBtn, true);
        setButtonDisabled(offsetDestIncBtn, true);
        setButtonDisabled(offsetDestDecBtn, true);
        return;
    }
    const originalRouteKm = state.originalRouteDistance / 1000;
    setButtonDisabled(offsetStartDecBtn, state.startOffsetKm <= 0);
    setButtonDisabled(offsetDestDecBtn, state.endOffsetKm <= 0);
    setButtonDisabled(offsetStartIncBtn, (state.startOffsetKm + OFFSET_INCREMENT_KM + state.endOffsetKm) >= originalRouteKm);
    setButtonDisabled(offsetDestIncBtn, (state.startOffsetKm + state.endOffsetKm + OFFSET_INCREMENT_KM) >= originalRouteKm);
}

export function updateOffsetControlsVisibility(): void {
    if (offsetControlsContainer) {
        offsetControlsContainer.style.display = state.isRouteActive ? 'flex' : 'none';
        if (state.isRouteActive) {
            updateOffsetButtonStates();
        }
    }
}

export function updateControlVisibility(): void {
    if (!controlPanel || !inputContainer || !hamburgerButton || !distanceContainer) {
        console.error("Cannot update control visibility: UI elements missing.");
        return;
    }
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        hamburgerButton.classList.remove('hidden');
        controlPanel.classList.add('pr-16');
        if (state.isRouteActive) {
            inputContainer.classList.add('hidden');
            distanceContainer.classList.remove('hidden');
        } else {
            inputContainer.classList.remove('hidden');
            distanceContainer.classList.remove('hidden');
        }
    } else {
        inputContainer.classList.remove('hidden');
        distanceContainer.classList.remove('hidden');
        hamburgerButton.classList.add('hidden');
        controlPanel.classList.remove('pr-16');
    }
}

export function updateGmapsButtonState(): void {
    if (!openRouteInGmapsBtn) return;

    const hasStart = state.routeWaypoints.some(wp => wp.type === 'start');
    const hasDestination = state.routeWaypoints.some(wp => wp.type === 'destination');

    openRouteInGmapsBtn.disabled = !(hasStart && hasDestination);
}

export function updateFilterIndicator(): void {
    if (!filterToggleButton) return;
    
    const filtersAreActive = 
        state.currentFilters.connectorType !== defaultFilters.connectorType ||
        JSON.stringify([...state.currentFilters.powerLevels].sort()) !== JSON.stringify([...defaultFilters.powerLevels].sort()) ||
        JSON.stringify([...state.currentFilters.serviceTypes].sort()) !== JSON.stringify([...defaultFilters.serviceTypes].sort()) ||
        state.distanceThresholdKm !== DEFAULT_DISTANCE_THRESHOLD ||
        state.brandFilterMode === 'favoritesOnly' ||
        state.blacklistedBrands.size > 0 ||
        state.ignoredStationIds.size > 0;
    
    filterToggleButton.classList.toggle('filters-active', filtersAreActive);
}

export function updateLoadingProgress(processedCount: number, totalCount: number): void {
    if (!loadingDetails || !loadingProgressBarInner) return;

    let percentage = 0;
    if (totalCount > 0) {
        percentage = Math.min(100, Math.round((processedCount / totalCount) * 100));
    }

    loadingDetails.textContent = translate('messageLoadingDetails', {
        processed: processedCount,
        total: totalCount,
        percent: percentage
    });

    loadingProgressBarInner.style.width = `${percentage}%`;
}

// --- UI Toggle Functions ---
export function toggleRouteBuilderPanel(): void {
    if (!routeBuilderPanel) return;
    routeBuilderPanel.classList.toggle('open');
}

export function toggleFilterPanel(): void {
    if (!filterPanel) return;
    const isOpen = filterPanel.classList.toggle('open');
    console.log("Filter panel toggled:", isOpen);
    if (isOpen) {
        populateBrandFilterList();
        populateIgnoredStationsList();
        const activeButton = brandListViewControls?.querySelector('button.active') as HTMLElement | null;
        filterBrandListView(activeButton?.dataset.view || 'all');
    }
}

export function togglePoiVisibility(): void {
    if (!state.isRouteActive) return;
    state.arePoisVisible = !state.arePoisVisible;
    console.log(`Toggling POI visibility to: ${state.arePoisVisible}`);

    for (const marker of state.visiblePoiMarkers.values()) {
        marker.map = state.arePoisVisible ? state.map : null;
    }

    updatePoiVisibilityButtonUI();
}

export function hideAllPois(resetSelectedMarkerZIndexCallback: (() => void) | null = null): void {
    console.log("Hiding all currently visible POIs...");

    for (const marker of state.visiblePoiMarkers.values()) {
        marker.map = null;
    }

    state.visiblePoiMarkers.clear();

    if (state.infoWindow) state.infoWindow.close();
    
    if (resetSelectedMarkerZIndexCallback) {
        resetSelectedMarkerZIndexCallback();
    }
}

// --- UI Population Functions ---
export function populateBrandFilterList(): void {
    if (!brandListContainer || !state.allUniqueBrands) return;
    clearChildren(brandListContainer);

    if (state.allUniqueBrands.length === 0) {
        brandListContainer.innerHTML = `<p class="filter-status-paragraph" data-i18n-key="filterStatusNoBrands">${translate('filterStatusNoBrands')}</p>`;
        return;
    }

    // Determine current view
    const activeButton = brandListViewControls?.querySelector('button.active') as HTMLElement | null;
    const currentView = activeButton?.dataset.view || 'all';

    state.allUniqueBrands.forEach(brand => {
        // Determine brand status
        const isFavorite = state.favoriteBrands.has(brand);
        const isBlacklisted = state.blacklistedBrands.has(brand);
        const itemStatus = isFavorite ? 'favorite' : (isBlacklisted ? 'blacklisted' : 'neutral');
        const namePrefix = isFavorite ? '⭐ ' : (isBlacklisted ? '🚫 ' : '');

        const itemDiv = createElement('div', {
            className: 'brand-item',
            attributes: { 'data-brand': brand, 'data-status': itemStatus }
        });

        const nameSpan = createElement('span', {
            className: 'brand-name',
            textContent: namePrefix + brand,
            title: brand
        });
        itemDiv.appendChild(nameSpan);

        const controlsDiv = createElement('div', { className: 'brand-item-controls' });

        // Show different buttons based on the current view
        if (currentView === 'fav') {
            // In Favorites view, only show remove button
            if (isFavorite) {
                const removeButton = createButton({
                    className: 'brand-remove',
                    title: translate('removeFavorite'),
                    textContent: '✕',
                    onClick: () => handleBrandPreferenceChangeCallback?.(brand, 'favorite')
                });
                controlsDiv.appendChild(removeButton);
            }
        } else if (currentView === 'blk') {
            // In Blacklist view, only show remove button
            if (isBlacklisted) {
                const removeButton = createButton({
                    className: 'brand-remove',
                    title: translate('removeBlacklist'),
                    textContent: '✕',
                    onClick: () => handleBrandPreferenceChangeCallback?.(brand, 'blacklist')
                });
                controlsDiv.appendChild(removeButton);
            }
        } else {
            // In All view, show both favorite and blacklist buttons
            const favButton = createButton({
                className: `brand-fav ${isFavorite ? 'active-fav' : ''}`,
                title: translate('brandFavoriteAction'),
                textContent: '⭐',
                onClick: () => handleBrandPreferenceChangeCallback?.(brand, 'favorite')
            });

            const blkButton = createButton({
                className: `brand-blk ${isBlacklisted ? 'active-blk' : ''}`,
                title: translate('brandBlacklistAction'),
                textContent: '🚫',
                onClick: () => handleBrandPreferenceChangeCallback?.(brand, 'blacklist')
            });

            controlsDiv.appendChild(favButton);
            controlsDiv.appendChild(blkButton);
        }

        itemDiv.appendChild(controlsDiv);
        brandListContainer?.appendChild(itemDiv);
    });
}

export function populateIgnoredStationsList(): void {
    if (!ignoredStationsListContainer) return;
    clearChildren(ignoredStationsListContainer);

    if (state.ignoredStationIds.size === 0) {
        ignoredStationsListContainer.innerHTML = `<p class="filter-status-paragraph" data-i18n-key="filterStatusNoIgnoredStations">${translate('filterStatusNoIgnoredStations')}</p>`;
        return;
    }

    state.ignoredStationIds.forEach(stationId => {
        const station = state.allStationData.find(s => String(s.id) === String(stationId));
        if (!station) return;

        const brandName = station.brand || translate('iwNA');
        const stationTitle = station.title || '';

        const itemDiv = createElement('div', {
            className: 'ignored-item',
            attributes: { 'data-station-id': stationId }
        });

        // Line 1: Brand name + buttons
        const line1Div = createElement('div', { className: 'ignored-line-1' });

        const brandSpan = createElement('span', {
            className: 'ignored-brand',
            textContent: brandName,
            title: brandName
        });
        line1Div.appendChild(brandSpan);

        const controlsDiv = createElement('div', { className: 'ignored-controls' });

        const unignoreButton = createButton({
            className: 'unignore-btn',
            title: translate('unignoreStationAction'),
            textContent: translate('buttonUnignore'),
            attributes: { 'data-station-id': stationId }
        });
        controlsDiv.appendChild(unignoreButton);

        const mapButton = createButton({
            className: 'map-btn',
            title: translate('titleOpenMap'),
            innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>`,
            attributes: {
                'data-lat': String(station.lat),
                'data-lng': String(station.lng)
            }
        });
        controlsDiv.appendChild(mapButton);

        line1Div.appendChild(controlsDiv);
        itemDiv.appendChild(line1Div);

        // Line 2: Station title (if different from brand)
        if (stationTitle && stationTitle !== brandName) {
            const line2Div = createElement('div', {
                className: 'ignored-line-2',
                textContent: stationTitle,
                title: stationTitle
            });
            itemDiv.appendChild(line2Div);
        }

        ignoredStationsListContainer?.appendChild(itemDiv);
    });
}

export function filterBrandListView(viewType: string): void {
    console.log(`Filtering brand list view to: ${viewType}`);
    if (!brandListContainer || !brandListViewControls) return;

    // Update active button
    brandListViewControls.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view') === viewType);
    });

    // Repopulate the list to show appropriate buttons for the view
    populateBrandFilterList();

    // Filter visibility based on view
    const brandItems = brandListContainer.querySelectorAll('.brand-item');
    let visibleCountInList = 0;
    brandItems.forEach(item => {
        const itemStatus = item.getAttribute('data-status') || 'neutral';
        let show = false;
        if (viewType === 'all') {
            show = true;
        } else if (viewType === 'fav' && itemStatus === 'favorite') {
            show = true;
        } else if (viewType === 'blk' && itemStatus === 'blacklisted') {
            show = true;
        }
        item.classList.toggle('hidden-by-view', !show);
        if (show) visibleCountInList++;
    });

    const noResultsMessage = brandListContainer.querySelector('.no-results-message');
    if (visibleCountInList === 0 && brandItems.length > 0) {
        if (!noResultsMessage) {
            const p = document.createElement('p');
            p.className = 'filter-status-paragraph no-results-message';
            p.setAttribute('data-i18n-key', 'filterStatusNoBrandsView');
            p.textContent = translate('filterStatusNoBrandsView');
            brandListContainer.appendChild(p);
        } else {
            noResultsMessage.textContent = translate('filterStatusNoBrandsView');
        }
    } else {
        if (noResultsMessage) {
            noResultsMessage.remove();
        }
    }
}

// --- UI Event Handlers (Pure UI) ---
export function handleInputChange(inputElement: HTMLInputElement, clearButtonElement: HTMLElement): void {
    if (!clearButtonElement || !inputElement) return;
    clearButtonElement.classList.toggle('hidden', inputElement.value.trim().length === 0);
}

export function handleDistanceChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (distanceValueDisplay) distanceValueDisplay.textContent = target.value;
}

export function handleMapTypeChange(event: Event): void {
    if (!state.map) return;
    const button = event.currentTarget as HTMLButtonElement;
    const newMapTypeId = button.dataset.maptypeid;
    const typeMapping: Record<string, google.maps.MapTypeId> = {
        'roadmap': google.maps.MapTypeId.ROADMAP,
        'hybrid': google.maps.MapTypeId.HYBRID,
        'satellite': google.maps.MapTypeId.SATELLITE,
        'terrain': google.maps.MapTypeId.TERRAIN
    };
    if (newMapTypeId && typeMapping[newMapTypeId]) {
        const mapTypeIdConstant = typeMapping[newMapTypeId];
        state.map.setMapTypeId(mapTypeIdConstant);
        console.log("Map type changed to:", newMapTypeId);
        updateMapTypeButtons(mapTypeIdConstant);
        if (saveSettingsCallback) {
            saveSettingsCallback();
        }
    } else {
        console.error("Invalid map type id:", newMapTypeId);
    }
}

export function handleBrandListViewChange(event: Event): void {
    const button = (event.target as HTMLElement).closest('button');
    if (!button || !button.dataset.view) return;
    const viewType = button.dataset.view;
    filterBrandListView(viewType);
}

export function handleResize(): void {
    updateControlVisibility();
}

import { BrandAction } from './types.js';

// Callbacks for business logic (set by main.js)
let handleBrandPreferenceChangeCallback: ((brandName: string, action: BrandAction) => void) | null = null;
let handleUnignoreStationClickCallback: ((stationId: string) => void) | null = null;
let saveSettingsCallback: (() => void) | null = null;

export function setupUICallbacks(callbacks: {
    handleBrandPreferenceChange?: (brandName: string, action: BrandAction) => void;
    handleUnignoreStationClick?: (stationId: string) => void;
    saveSettings?: () => void;
}): void {
    if (callbacks.handleBrandPreferenceChange) {
        handleBrandPreferenceChangeCallback = callbacks.handleBrandPreferenceChange;
    }
    if (callbacks.handleUnignoreStationClick) {
        handleUnignoreStationClickCallback = callbacks.handleUnignoreStationClick;
    }
    if (callbacks.saveSettings) {
        saveSettingsCallback = callbacks.saveSettings;
    }
}

// --- Loading Overlay Functions ---
export function showLoadingOverlay(): void {
    loadingOverlay?.classList.remove('hidden');
}

export function hideLoadingOverlay(): void {
    loadingOverlay?.classList.add('hidden');
}

// --- Button State Management Functions ---
export function setUseLocationButtonsEnabled(enabled: boolean): void {
    setButtonDisabled(useLocationStartBtn, !enabled);
    setButtonDisabled(useLocationEndBtn, !enabled);
}

export function setOptimizeRouteButtonEnabled(enabled: boolean): void {
    setButtonDisabled(optimizeRouteBtn, !enabled);
}

// --- Input Manipulation Functions ---
export function setInputDisabled(inputType: 'start' | 'end', disabled: boolean): void {
    const input = inputType === 'start' ? startInput : endInput;
    if (input) input.disabled = disabled;
}

export function setInputPlaceholder(inputType: 'start' | 'end', placeholder: string): void {
    const input = inputType === 'start' ? startInput : endInput;
    if (input) input.placeholder = placeholder;
}

export function setInputValue(inputType: 'start' | 'end', value: string): void {
    const input = inputType === 'start' ? startInput : endInput;
    if (input) input.value = value;
}

// --- Route Summary Functions ---
export function updateRouteSummary(distance: number | null, duration: number | null): void {
    if (!routeSummaryContainer) return;
    
    if (distance == null || duration == null) {
        routeSummaryContainer.innerHTML = '';
        return;
    }
    
    routeSummaryContainer.innerHTML = `
        <div><span>${translate('summaryTotalDist')}:</span> <span>${formatDistance(distance, translate)}</span></div>
        <div><span>${translate('summaryTotalTime')}:</span> <span>${formatDuration(duration, translate)}</span></div>
    `;
}

export function clearRouteSummary(): void {
    if (routeSummaryContainer) routeSummaryContainer.innerHTML = '';
}

// --- Version Display Function ---
export function addVersionDisplay(version: string): void {
    if (!filterPanel || version.includes('__')) return;
    
    const versionDiv = document.createElement('div');
    versionDiv.className = 'mt-auto pt-4 text-center text-xs text-gray-400';
    versionDiv.textContent = `Version: ${version}`;
    filterPanel.appendChild(versionDiv);
}

// --- Hamburger Menu Functions ---
export function toggleInputContainerVisibility(): void {
    if (!inputContainer || !distanceContainer) return;
    inputContainer.classList.toggle('hidden');
    distanceContainer.classList.toggle('hidden', !inputContainer.classList.contains('hidden'));
}

// --- Language UI Initialization Helper ---
export function getLanguageUIElements(): {
    control: HTMLElement | null;
    selectorButton: HTMLElement | null;
    dropdown: HTMLElement | null;
    flagDisplay: HTMLElement | null;
} {
    return {
        control: document.getElementById('language-control'),
        selectorButton: document.getElementById('language-selector-btn'),
        dropdown: document.getElementById('language-dropdown'),
        flagDisplay: document.getElementById('language-flag')
    };
}

// --- Map Element Getter ---
export function getMapElement(): HTMLElement | null {
    return document.getElementById('map');
}

// --- Language Dropdown Functions ---
export function closeLanguageDropdown(): boolean {
    const languageDropdown = document.getElementById('language-dropdown');
    const languageSelectorButton = document.getElementById('language-selector-btn');
    if (languageDropdown?.classList.contains('show')) {
        languageDropdown.classList.remove('show');
        if (languageSelectorButton) languageSelectorButton.setAttribute('aria-expanded', 'false');
        return true;
    }
    return false;
}

// Export all UI elements and functions
export {
    // UI Elements
    controlPanel,
    inputContainer,
    hamburgerButton,
    startInput,
    endInput,
    clearStartBtn,
    clearEndBtn,
    pasteStartBtn,
    pasteEndBtn,
    useLocationStartBtn,
    useLocationEndBtn,
    messageBox,
    distanceContainer,
    distanceSlider,
    distanceValueDisplay,
    mapTypeControlContainer,
    mapTypeButtons,
    loadingOverlay,
    loadingText,
    loadingDetails,
    loadingProgressBarInner,
    filterToggleButton,
    filterPanel,
    closeFilterButton,
    resetFiltersButton,
    brandFilterModeButton,
    filterInputs,
    brandListContainer,
    brandListViewControls,
    ignoredStationsListContainer,
    offsetControlsContainer,
    startOffsetDisplay,
    destOffsetDisplay,
    offsetStartIncBtn,
    offsetStartDecBtn,
    offsetDestIncBtn,
    offsetDestDecBtn,
    routeBuilderToggleButton,
    routeBuilderPanel,
    closeRouteBuilderBtn,
    waypointsListContainer,
    clearWaypointsBtn,
    routeSummaryContainer,
    optimizeRouteBtn,
    togglePoiVisibilityBtn,
    openRouteInGmapsBtn
};

