import { StationData } from '../state.js';
import { toggleSetItem, setToArray, arrayToSet } from '../storage-utils.js';

/**
 * Manages user preferences: favorites, blacklisted brands, ignored stations
 */
export class PreferencesComponent {
    public favoriteBrands: Set<string> = new Set();
    public blacklistedBrands: Set<string> = new Set();
    public ignoredStationIds: Set<string> = new Set(); // Always as strings
    public brandFilterMode: 'all' | 'favoritesOnly' = 'all';
    public allUniqueBrands: string[] = [];

    /**
     * Checks if a station matches preference filters (not ignored, not blacklisted, matches brand mode)
     */
    stationMatchesPreferences(stationData: StationData): boolean {
        const stationIdString = String(stationData.id);
        
        // Check if ignored
        if (this.ignoredStationIds.has(stationIdString)) {
            return false;
        }

        const brand = stationData.brand;
        
        // Check if blacklisted
        if (brand && this.blacklistedBrands.has(brand)) {
            return false;
        }

        // Check brand filter mode
        if (this.brandFilterMode === 'favoritesOnly') {
            if (!brand || !this.favoriteBrands.has(brand)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Toggles favorite status for a brand
     */
    toggleFavorite(brandName: string): boolean {
        const wasAdded = toggleSetItem(this.favoriteBrands, brandName);
        if (wasAdded) {
            this.blacklistedBrands.delete(brandName); // Remove from blacklist if present
        }
        return wasAdded;
    }

    /**
     * Toggles blacklist status for a brand
     */
    toggleBlacklist(brandName: string): boolean {
        const wasAdded = toggleSetItem(this.blacklistedBrands, brandName);
        if (wasAdded) {
            this.favoriteBrands.delete(brandName); // Remove from favorites if present
        }
        return wasAdded;
    }

    /**
     * Ignores a station
     */
    ignoreStation(stationId: string | number): void {
        this.ignoredStationIds.add(String(stationId));
    }

    /**
     * Un-ignores a station
     */
    unignoreStation(stationId: string): void {
        this.ignoredStationIds.delete(stationId);
    }

    /**
     * Toggles brand filter mode between 'all' and 'favoritesOnly'
     */
    toggleBrandFilterMode(): boolean {
        if (this.brandFilterMode === 'all') {
            if (this.favoriteBrands.size > 0) {
                this.brandFilterMode = 'favoritesOnly';
                return true; // Changed to favorites only
            }
            return false; // Cannot switch, no favorites
        } else {
            this.brandFilterMode = 'all';
            return true; // Changed to all
        }
    }

    /**
     * Clears all preferences
     */
    clearAll(): void {
        this.favoriteBrands.clear();
        this.blacklistedBrands.clear();
        this.ignoredStationIds.clear();
        this.brandFilterMode = 'all';
    }

    /**
     * Gets a serializable representation for storage
     */
    toJSON(): {
        favoriteBrands: string[];
        blacklistedBrands: string[];
        ignoredStationIds: string[];
        brandFilterMode: 'all' | 'favoritesOnly';
    } {
        return {
            favoriteBrands: setToArray(this.favoriteBrands),
            blacklistedBrands: setToArray(this.blacklistedBrands),
            ignoredStationIds: setToArray(this.ignoredStationIds),
            brandFilterMode: this.brandFilterMode
        };
    }

    /**
     * Loads preferences from a serializable representation
     */
    fromJSON(data: {
        favoriteBrands?: string[];
        blacklistedBrands?: string[];
        ignoredStationIds?: string[];
        brandFilterMode?: 'all' | 'favoritesOnly';
    }): void {
        this.favoriteBrands = arrayToSet(data.favoriteBrands);
        this.blacklistedBrands = arrayToSet(data.blacklistedBrands);
        this.ignoredStationIds = arrayToSet(data.ignoredStationIds);
        if (data.brandFilterMode) {
            this.brandFilterMode = data.brandFilterMode;
        }
    }
}

