import { MIN_ATTRACTION_ZOOM, ATTRACTION_DEBOUNCE_MS } from '../config.js';
import { translate } from '../i18n.js';
import state from '../state.js';

export class TouristAttractionComponent {
  private readonly map: google.maps.Map;
  private readonly placesService: google.maps.places.PlacesService;
  private placeMarkers: Map<string, google.maps.marker.AdvancedMarkerElement> = new Map();
  private enabledTypes: Set<string> = new Set();
  private _visible = true;
  private _minZoom: number = MIN_ATTRACTION_ZOOM;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private detailsCache: Map<string, google.maps.places.PlaceResult> = new Map();
  private activeSearches: Map<string, number> = new Map();
  private currentPopupPlaceId: string | null = null;
  private currentPopupType: string | null = null;
  private starredPlaceIds: Set<string> = new Set();
  private hiddenPlaceIds: Set<string> = new Set();
  private placeNameCache: Map<string, string> = new Map();
  private placeLocationCache: Map<string, { lat: number; lng: number }> = new Map();
  private selectedPlaceMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private _showStarredOnly = false;
  onProgress: ((searches: Map<string, number>) => void) | null = null;
  onStarChange: (() => void) | null = null;
  onOpenPanel: ((content: string) => void) | null = null;
  onUpdatePanel: ((content: string) => void) | null = null;
  onClosePanel: (() => void) | null = null;
  onPanToMarker: ((position: google.maps.LatLng | google.maps.LatLngLiteral) => void) | null = null;

  constructor(map: google.maps.Map) {
    this.map = map;
    this.placesService = new google.maps.places.PlacesService(map);
  }

  get hasEnabledTypes(): boolean {
    return this.enabledTypes.size > 0;
  }

  get visible(): boolean {
    return this._visible;
  }

  get minZoom(): number {
    return this._minZoom;
  }

  setMinZoom(zoom: number): void {
    this._minZoom = zoom;
    if (this._visible && this.enabledTypes.size > 0) {
      this.fetchIfReady();
    }
  }

  setVisible(visible: boolean): void {
    this._visible = visible;
    if (visible && this.enabledTypes.size > 0) {
      this.placeMarkers.forEach(marker => { marker.map = this.map; });
      this.fetchIfReady();
    } else {
      this.placeMarkers.forEach(marker => { marker.map = null; });
      this.onClosePanel?.();
    }
  }

  setEnabledTypes(types: string[]): void {
    const newSet = new Set(types);
    const removed = [...this.enabledTypes].filter(t => !newSet.has(t));
    this.enabledTypes = newSet;

    if (removed.length > 0) {
      this.removeMarkersForTypes(removed);
    }

    if (this._visible && this.enabledTypes.size > 0) {
      this.fetchIfReady();
    } else if (this.enabledTypes.size === 0) {
      this.clear();
    }
  }

  onMapIdle(): void {
    if (!this._visible || this.enabledTypes.size === 0) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchIfReady();
    }, ATTRACTION_DEBOUNCE_MS);
  }

  closePanel(): void {
    this.deselectPlaceMarker();
    this.onClosePanel?.();
    this.currentPopupPlaceId = null;
    this.currentPopupType = null;
  }

  deselectPlaceMarker(): void {
    if (this.selectedPlaceMarker?.content) {
      (this.selectedPlaceMarker.content as HTMLElement).classList.remove('selected');
    }
    this.selectedPlaceMarker = null;
  }

  private selectPlaceMarker(placeId: string): void {
    this.deselectPlaceMarker();
    const marker = this.placeMarkers.get(placeId);
    if (marker?.content) {
      (marker.content as HTMLElement).classList.add('selected');
      this.selectedPlaceMarker = marker;
    }
  }

  refreshCurrentPopup(): void {
    if (!this.currentPopupPlaceId || !this.currentPopupType) return;
    const cached = this.detailsCache.get(this.currentPopupPlaceId);
    if (cached) {
      this.onUpdatePanel?.(this.buildDetailedInfoContent(cached, this.currentPopupType));
    }
  }

  get showStarredOnly(): boolean {
    return this._showStarredOnly;
  }

  get starredIds(): Set<string> {
    return this.starredPlaceIds;
  }

  get hiddenIds(): Set<string> {
    return this.hiddenPlaceIds;
  }

  setStarredPlaceIds(ids: Set<string>): void {
    this.starredPlaceIds = ids;
  }

  setHiddenPlaceIds(ids: Set<string>): void {
    this.hiddenPlaceIds = ids;
  }

  restorePlaceMetadata(entries: { id: string; name: string; lat: number; lng: number }[]): void {
    for (const e of entries) {
      this.placeNameCache.set(e.id, e.name);
      this.placeLocationCache.set(e.id, { lat: e.lat, lng: e.lng });
    }
  }

  setShowStarredOnly(val: boolean): void {
    this._showStarredOnly = val;
    this.applyVisibilityFilter();
  }

  toggleStar(placeId: string): boolean {
    if (this.starredPlaceIds.has(placeId)) {
      this.starredPlaceIds.delete(placeId);
    } else {
      this.starredPlaceIds.add(placeId);
      this.hiddenPlaceIds.delete(placeId);
    }
    this.updateMarkerStarredState(placeId);
    this.onStarChange?.();
    return this.starredPlaceIds.has(placeId);
  }

  toggleHidden(placeId: string): boolean {
    if (this.hiddenPlaceIds.has(placeId)) {
      this.hiddenPlaceIds.delete(placeId);
    } else {
      this.hiddenPlaceIds.add(placeId);
      this.starredPlaceIds.delete(placeId);
      const marker = this.placeMarkers.get(placeId);
      if (marker) {
        marker.map = null;
        this.placeMarkers.delete(placeId);
      }
      this.onClosePanel?.();
    }
    this.onStarChange?.();
    return this.hiddenPlaceIds.has(placeId);
  }

  isStarred(placeId: string): boolean {
    return this.starredPlaceIds.has(placeId);
  }

  isHidden(placeId: string): boolean {
    return this.hiddenPlaceIds.has(placeId);
  }

  unhide(placeId: string): void {
    this.hiddenPlaceIds.delete(placeId);
    this.onStarChange?.();
    if (this._visible && this.enabledTypes.size > 0) {
      this.fetchIfReady();
    }
  }

  getHiddenPlaces(): { id: string; name: string; lat: number; lng: number }[] {
    return [...this.hiddenPlaceIds].map(id => {
      const cached = this.placeLocationCache.get(id);
      return { id, name: this.placeNameCache.get(id) ?? id, lat: cached?.lat ?? 0, lng: cached?.lng ?? 0 };
    });
  }

  getStarredPlaces(): { id: string; name: string; lat: number; lng: number }[] {
    return [...this.starredPlaceIds].map(id => {
      const cached = this.placeLocationCache.get(id);
      return { id, name: this.placeNameCache.get(id) ?? id, lat: cached?.lat ?? 0, lng: cached?.lng ?? 0 };
    });
  }

  fetchMissingPlaceNames(): void {
    const ids = [...this.starredPlaceIds, ...this.hiddenPlaceIds];
    const missing = ids.filter(id => !this.placeNameCache.has(id));
    if (missing.length === 0) return;
    let remaining = missing.length;
    for (const placeId of missing) {
      this.placesService.getDetails(
        { placeId, fields: ['name', 'geometry', 'place_id'] },
        (detail, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
            if (detail.name) this.placeNameCache.set(placeId, detail.name);
            if (detail.geometry?.location) {
              const loc = detail.geometry.location;
              const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
              const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
              this.placeLocationCache.set(placeId, { lat, lng });
            }
          }
          remaining--;
          if (remaining === 0) this.onStarChange?.();
        }
      );
    }
  }

  getAllPlaceMetadata(): { id: string; name: string; lat: number; lng: number }[] {
    const ids = new Set([...this.starredPlaceIds, ...this.hiddenPlaceIds]);
    return [...ids].map(id => {
      const cached = this.placeLocationCache.get(id);
      return { id, name: this.placeNameCache.get(id) ?? id, lat: cached?.lat ?? 0, lng: cached?.lng ?? 0 };
    });
  }

  showPlaceById(placeId: string, position: google.maps.LatLng): void {
    const marker = this.placeMarkers.get(placeId);
    const type = marker ? ((marker as unknown as { _placeType?: string })._placeType ?? '') : '';
    const name = this.placeNameCache.get(placeId) ?? '';
    const place: google.maps.places.PlaceResult = { place_id: placeId, name, geometry: { location: position } };
    this.cachePositionAndShow(place, position, type);
  }

  goToPlace(placeId: string): void {
    const loc = this.placeLocationCache.get(placeId);
    if (!loc) return;
    const pos = new google.maps.LatLng(loc.lat, loc.lng);
    this.map.panTo(pos);
    const marker = this.placeMarkers.get(placeId);
    const type = marker ? ((marker as unknown as { _placeType?: string })._placeType ?? '') : '';
    const name = this.placeNameCache.get(placeId) ?? '';
    const place: google.maps.places.PlaceResult = { place_id: placeId, name, geometry: { location: pos } };
    this.cachePositionAndShow(place, pos, type);
  }

  private cachePositionAndShow(place: google.maps.places.PlaceResult, position: google.maps.LatLng, type: string): void {
    if (place.place_id) {
      const lat = typeof position.lat === 'function' ? position.lat() : Number(position.lat);
      const lng = typeof position.lng === 'function' ? position.lng() : Number(position.lng);
      this.placeLocationCache.set(place.place_id, { lat, lng });
    }
    this.fetchAndShowDetails(place, type);
  }

  private updateMarkerStarredState(placeId: string): void {
    const marker = this.placeMarkers.get(placeId);
    if (!marker) return;
    const el = marker.content as HTMLElement;
    if (this.starredPlaceIds.has(placeId)) {
      el.classList.add('starred');
    } else {
      el.classList.remove('starred');
    }
  }

  private applyVisibilityFilter(): void {
    for (const [id, marker] of this.placeMarkers) {
      if (this._showStarredOnly && !this.starredPlaceIds.has(id)) {
        marker.map = null;
      } else {
        marker.map = this._visible ? this.map : null;
      }
    }
  }

  clear(): void {
    this.deselectPlaceMarker();
    this.placeMarkers.forEach(marker => { marker.map = null; });
    this.placeMarkers.clear();
    this.onClosePanel?.();
  }

  private removeMarkersForTypes(types: string[]): void {
    const typeSet = new Set(types);
    for (const [id, marker] of this.placeMarkers) {
      const markerType = (marker as unknown as { _placeType?: string })._placeType;
      if (markerType && typeSet.has(markerType)) {
        marker.map = null;
        this.placeMarkers.delete(id);
      }
    }
  }

  private fetchIfReady(): void {
    if (!this._visible) return;
    const zoom = this.map.getZoom() ?? 0;
    if (zoom < this._minZoom) {
      this.placeMarkers.forEach(marker => { marker.map = null; });
      return;
    }

    for (const [id, marker] of this.placeMarkers) {
      if (this.hiddenPlaceIds.has(id)) continue;
      if (this._showStarredOnly && !this.starredPlaceIds.has(id)) continue;
      marker.map = this.map;
    }

    const bounds = this.map.getBounds();
    if (!bounds) return;

    for (const type of this.enabledTypes) {
      this.activeSearches.set(type, 1);
      this.notifyProgress();
      this.placesService.nearbySearch(
        { bounds, type },
        (results, status, pagination) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            this.activeSearches.delete(type);
            this.notifyProgress();
            return;
          }
          if (this._visible) {
            this.showPlaces(results, type);
          }
          if (pagination?.hasNextPage) {
            const currentPage = this.activeSearches.get(type) ?? 1;
            this.activeSearches.set(type, currentPage + 1);
            this.notifyProgress();
            setTimeout(() => pagination.nextPage(), 2000);
          } else {
            this.activeSearches.delete(type);
            this.notifyProgress();
          }
        }
      );
    }
  }

  private notifyProgress(): void {
    this.onProgress?.(this.activeSearches);
  }

  private showPlaces(places: google.maps.places.PlaceResult[], type: string): void {
    for (const place of places) {
      if (!place.place_id || !place.geometry?.location) continue;
      if (place.name) this.placeNameCache.set(place.place_id, place.name);
      const loc = place.geometry.location;
      const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
      const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
      this.placeLocationCache.set(place.place_id, { lat, lng });
      if (this.placeMarkers.has(place.place_id)) continue;
      if (this.hiddenPlaceIds.has(place.place_id)) continue;

      const shouldShow = !this._showStarredOnly || this.starredPlaceIds.has(place.place_id);

      const el = document.createElement('div');
      el.className = 'attraction-marker';
      if (this.starredPlaceIds.has(place.place_id)) el.classList.add('starred');
      el.textContent = this.emojiForType(type);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: place.geometry.location,
        map: shouldShow ? this.map : null,
        content: el,
        title: place.name ?? '',
        zIndex: 0,
      });

      (marker as unknown as { _placeType?: string })._placeType = type;

      marker.addListener('click', () => {
        this.fetchAndShowDetails(place, type);
      });

      this.placeMarkers.set(place.place_id, marker);
    }
  }

  private fetchAndShowDetails(place: google.maps.places.PlaceResult, type: string): void {
    const placeId = place.place_id;
    if (!placeId) return;

    this.currentPopupPlaceId = placeId;
    this.currentPopupType = type;
    this.selectPlaceMarker(placeId);

    const loc = this.placeLocationCache.get(placeId);
    if (loc) this.onPanToMarker?.(loc);

    const cached = this.detailsCache.get(placeId);
    if (cached) {
      this.onOpenPanel?.(this.buildDetailedInfoContent(cached, type));
      return;
    }

    this.onOpenPanel?.(this.buildBasicInfoContent(place, type));

    this.placesService.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'website', 'formatted_phone_number',
                 'opening_hours', 'photos', 'rating', 'user_ratings_total',
                 'business_status', 'url', 'place_id', 'geometry'],
      },
      (detail, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
          this.detailsCache.set(placeId, detail);
          this.onUpdatePanel?.(this.buildDetailedInfoContent(detail, type));
        }
      }
    );
  }

  private buildBasicInfoContent(place: google.maps.places.PlaceResult, type: string): string {
    const name = place.name ?? 'Unknown';
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    let html = `<div class="place-popup">`;
    html += `<div class="place-popup-name">${name}</div>`;
    html += `<div class="place-popup-type">${this.emojiForType(type)} ${this.labelForType(type)}</div>`;
    if (place.vicinity) {
      html += `<div class="place-popup-address">${place.vicinity}</div>`;
    }
    html += `<div class="place-popup-loading">Loading details...</div>`;
    html += this.buildActionButtons(place);
    html += this.buildDirectionsButton(place);
    html += this.buildAddToRouteButton(place);
    html += `<a href="${mapsUrl}" target="_blank" rel="noopener" class="place-popup-gmaps">Open in Google Maps &rarr;</a>`;
    html += `</div>`;
    return html;
  }

  private buildDetailedInfoContent(place: google.maps.places.PlaceResult, type: string): string {
    const name = place.name ?? 'Unknown';
    const mapsUrl = place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

    let html = `<div class="place-popup">`;

    html += `<div class="place-popup-name">${name}</div>`;
    html += `<div class="place-popup-type">${this.emojiForType(type)} ${this.labelForType(type)}</div>`;

    const bs = place.business_status;
    if (bs === 'CLOSED_TEMPORARILY') {
      html += `<span class="place-popup-badge closed">Temporarily Closed</span>`;
    } else if (bs === 'CLOSED_PERMANENTLY') {
      html += `<span class="place-popup-badge closed">Permanently Closed</span>`;
    }

    if (place.formatted_address) {
      html += `<div class="place-popup-address">${place.formatted_address}</div>`;
    }

    if (place.rating != null) {
      const stars = '★'.repeat(Math.round(place.rating)) + '☆'.repeat(5 - Math.round(place.rating));
      html += `<div class="place-popup-rating">`;
      html += `<span class="place-popup-stars">${stars}</span> <span class="place-popup-rating-text">${place.rating}`;
      if (place.user_ratings_total != null) {
        html += ` (${place.user_ratings_total})`;
      }
      html += `</span></div>`;
    }

    const oh = place.opening_hours;
    if (oh) {
      const isOpen = oh.isOpen?.();
      if (isOpen != null) {
        html += `<div class="place-popup-hours">`;
        html += isOpen
          ? `<span class="place-popup-open">Open now</span>`
          : `<span class="place-popup-closed-now">Closed now</span>`;
        const today = oh.weekday_text?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
        if (today) {
          const hoursOnly = today.includes(':') ? today.substring(today.indexOf(':') + 1).trim() : today;
          html += ` <span class="place-popup-today-hours">${hoursOnly}</span>`;
        }
        html += `</div>`;
      }
    }

    if (place.formatted_phone_number) {
      html += `<div class="place-popup-phone"><a href="tel:${place.formatted_phone_number}">${place.formatted_phone_number}</a></div>`;
    }

    if (place.website) {
      let domain = place.website;
      try { domain = new URL(place.website).hostname.replace(/^www\./, ''); } catch {}
      html += `<div class="place-popup-website"><a href="${place.website}" target="_blank" rel="noopener">${domain}</a></div>`;
    }

    if (place.photos && place.photos.length > 0) {
      const photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
      html += `<img class="place-popup-photo" src="${photoUrl}" alt="${name}">`;
    }

    html += this.buildActionButtons(place);
    html += this.buildDirectionsButton(place);
    html += this.buildAddToRouteButton(place);
    html += `<a href="${mapsUrl}" target="_blank" rel="noopener" class="place-popup-gmaps">Open in Google Maps &rarr;</a>`;
    html += `</div>`;
    return html;
  }

  private buildActionButtons(place: google.maps.places.PlaceResult): string {
    if (!place.place_id) return '';
    const starred = this.starredPlaceIds.has(place.place_id);
    let html = `<div class="place-popup-actions">`;
    html += `<button class="place-popup-star-btn${starred ? ' starred' : ''}" onclick="handleToggleStarPlace('${place.place_id}')">${starred ? translate('placeStarred') : translate('placeStar')}</button>`;
    const hidden = this.hiddenPlaceIds.has(place.place_id);
    html += `<button class="place-popup-hide-btn" onclick="handleToggleHidePlace('${place.place_id}')">${hidden ? translate('placeUnhide') : translate('placeHide')}</button>`;
    html += `</div>`;
    return html;
  }

  private buildAddToRouteButton(place: google.maps.places.PlaceResult): string {
    if (!place.place_id) return '';
    let lat: number | undefined;
    let lng: number | undefined;
    if (place.geometry?.location) {
      lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : Number(place.geometry.location.lat);
      lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : Number(place.geometry.location.lng);
    } else {
      const cached = this.placeLocationCache.get(place.place_id);
      if (cached) { lat = cached.lat; lng = cached.lng; }
    }
    if (lat == null || lng == null) return '';
    const escapedName = (place.name ?? 'Place').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `<button class="place-popup-add-route" onclick="handleAddPlaceToRoute('${place.place_id}','${escapedName}',${lat},${lng})">+ Add to route</button>`;
  }

  private buildDirectionsButton(place: google.maps.places.PlaceResult): string {
    if (!place.place_id) return '';
    const hasStart = state.routeWaypoints.some(wp => wp.type === 'start');
    const hasDest = state.routeWaypoints.some(wp => wp.type === 'destination');
    if (hasStart && hasDest) return '';

    let lat: number | undefined;
    let lng: number | undefined;
    if (place.geometry?.location) {
      lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : Number(place.geometry.location.lat);
      lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : Number(place.geometry.location.lng);
    } else {
      const cached = this.placeLocationCache.get(place.place_id);
      if (cached) { lat = cached.lat; lng = cached.lng; }
    }
    if (lat == null || lng == null) return '';

    const escapedName = (place.name ?? 'Place').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    let label: string;
    if (state.appMode === 'explore') {
      label = translate('buttonDirections');
    } else if (!hasStart) {
      label = translate('buttonSetSource');
    } else {
      label = translate('buttonSetDestination');
    }
    return `<button class="place-popup-directions" onclick="handleSetDirections('${escapedName}',${lat},${lng})">${label}</button>`;
  }

  emojiForType(type: string): string {
    const map: Record<string, string> = {
      tourist_attraction: '📍', museum: '🏛️', art_gallery: '🎨',
      library: '📚', university: '🎓',
      park: '🌳', zoo: '🦁', aquarium: '🐠', campground: '⛺',
      mosque: '🕌', church: '⛪', synagogue: '🕍', hindu_temple: '🛕',
      amusement_park: '🎢', stadium: '🏟️', casino: '🎰',
      movie_theater: '🎬', night_club: '🎵', spa: '💆',
      bowling_alley: '🎳', gym: '🏋️',
      restaurant: '🍽️', cafe: '☕', bar: '🍺', bakery: '🥐', supermarket: '🛒',
      shopping_mall: '🛍️', book_store: '📖', clothing_store: '👗',
      jewelry_store: '💎', department_store: '🏬', electronics_store: '📱',
      airport: '✈️', train_station: '🚆', bus_station: '🚌',
      subway_station: '🚇', lodging: '🏨',
      hospital: '🏥', pharmacy: '💊', doctor: '🩺',
      dentist: '🦷', physiotherapist: '🏃',
      car_dealer: '🚗', car_rental: '🔑', car_wash: '🚿',
      car_repair: '🔧', gas_station: '⛽',
      atm: '🏧', bank: '🏦', accounting: '📊', insurance_agency: '🛡️',
      hair_care: '💇', beauty_salon: '💅', laundry: '👔',
      post_office: '📮', travel_agency: '🧳', locksmith: '🔐',
      plumber: '🪠', electrician: '⚡', real_estate_agency: '🏠',
      lawyer: '⚖️', storage: '📦', funeral_home: '🕯️',
      pet_store: '🐾', veterinary_care: '🐕',
      local_government_office: '🏛️', fire_station: '🚒', police: '🚔',
      courthouse: '⚖️', city_hall: '🏛️', embassy: '🏳️',
    };
    return map[type] ?? '📍';
  }

  labelForType(type: string): string {
    return translate(`place_${type}`);
  }
}
