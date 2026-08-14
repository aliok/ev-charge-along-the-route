declare namespace markerClusterer {
  interface Cluster {
    markers: google.maps.marker.AdvancedMarkerElement[];
    position: google.maps.LatLng;
    count: number;
    bounds?: google.maps.LatLngBounds;
  }

  interface ClusterStats {
    clusters: { markers: google.maps.marker.AdvancedMarkerElement[] }[];
  }

  interface Renderer {
    render(
      cluster: Cluster,
      stats: ClusterStats,
      map: google.maps.Map
    ): google.maps.marker.AdvancedMarkerElement;
  }

  interface Algorithm {
    calculate(input: {
      markers: google.maps.marker.AdvancedMarkerElement[];
      map: google.maps.Map;
      mapCanvasProjection: google.maps.MapCanvasProjection;
    }): { clusters: Cluster[]; changed: boolean };
  }

  class SuperClusterAlgorithm implements Algorithm {
    constructor(options?: { maxZoom?: number; radius?: number });
    calculate(input: {
      markers: google.maps.marker.AdvancedMarkerElement[];
      map: google.maps.Map;
      mapCanvasProjection: google.maps.MapCanvasProjection;
    }): { clusters: Cluster[]; changed: boolean };
  }

  class MarkerClusterer {
    constructor(options: {
      map: google.maps.Map;
      markers?: google.maps.marker.AdvancedMarkerElement[];
      renderer?: Renderer;
      algorithm?: Algorithm;
      onClusterClick?: (
        event: google.maps.MapMouseEvent,
        cluster: Cluster,
        map: google.maps.Map
      ) => void;
    });

    addMarker(
      marker: google.maps.marker.AdvancedMarkerElement,
      noDraw?: boolean
    ): void;

    addMarkers(
      markers: google.maps.marker.AdvancedMarkerElement[],
      noDraw?: boolean
    ): void;

    removeMarker(
      marker: google.maps.marker.AdvancedMarkerElement,
      noDraw?: boolean
    ): boolean;

    removeMarkers(
      markers: google.maps.marker.AdvancedMarkerElement[],
      noDraw?: boolean
    ): boolean;

    clearMarkers(noDraw?: boolean): void;
    render(): void;
    setMap(map: google.maps.Map | null): void;

    markers: google.maps.marker.AdvancedMarkerElement[];
  }
}
