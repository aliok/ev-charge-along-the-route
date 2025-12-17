import { StationData } from '../state.js';

/**
 * Manages station data
 */
export class StationDataComponent {
  public allStationData: StationData[] = [];
  public allUniqueBrands: string[] = [];

  /**
   * Sets all station data and extracts unique brands
   */
  setStationData(stations: StationData[]): void {
    this.allStationData = stations;
    this.extractUniqueBrands();
  }

  /**
   * Adds station data
   */
  addStationData(stations: StationData[]): void {
    this.allStationData.push(...stations);
    this.extractUniqueBrands();
  }

  /**
   * Gets station by ID
   */
  getStationById(id: string | number): StationData | undefined {
    return this.allStationData.find(s => String(s.id) === String(id));
  }

  /**
   * Extracts unique brands from station data
   */
  private extractUniqueBrands(): void {
    const brands = new Set<string>();
    this.allStationData.forEach(station => {
      if (station.brand) {
        brands.add(station.brand);
      }
    });
    this.allUniqueBrands = Array.from(brands).sort();
  }
}
