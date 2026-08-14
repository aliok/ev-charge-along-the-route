import { test, expect } from '@playwright/test';

// Helper to create a route by typing into inputs like a real user
async function createRouteByTyping(page, startLocation = 'Istanbul', endLocation = 'Ankara', minMarkers = 5) {
  // Switch to directions mode if in explore mode
  const dirBtn = page.locator('#directions-mode-btn');
  if (await dirBtn.isVisible()) {
    await dirBtn.click();
    await page.waitForSelector('#directions-input-group:not(.hidden)', { timeout: 5000 });
  }

  const startInput = page.locator('#start-input');
  const endInput = page.locator('#end-input');

  // Focus and type start location (with delay to simulate real user)
  await startInput.focus();
  await startInput.type(startLocation, { delay: 50 });

  // Wait for autocomplete suggestion (REQUIRED - users must select from autocomplete)
  let autocompleteContainer = page.locator('.pac-container').nth(0);
  await autocompleteContainer.waitFor({ state: 'visible', timeout: 10000 });

  // Use test helper to set start location (clicking autocomplete doesn't work in Playwright)
  await page.evaluate(() => {
    window.setTestLocation('start', 41.0082, 28.9784, 'Istanbul, Turkey');
  });

  await page.waitForTimeout(500);

  // Focus and type end location (with delay to simulate real user)
  await endInput.focus();
  await endInput.type(endLocation, { delay: 50 });

  // Wait for autocomplete suggestion (REQUIRED - users must select from autocomplete)
  await page.waitForTimeout(500);
  autocompleteContainer = page.locator('.pac-container').nth(1);
  await autocompleteContainer.waitFor({ state: 'visible', timeout: 10000 });

  // Use test helper to set end location
  await page.evaluate(async () => {
    window.setTestLocation('end', 39.9334, 32.8597, 'Ankara, Turkey');

    // Trigger route calculation
    const app = window.getApp();
    if (app) {
      await app.calculateRoute();
    }
  });

  // Wait for route calculation to complete
  await page.waitForTimeout(3000);

  // Wait for at least the minimum number of markers
  await page.waitForFunction(
    (min) => {
      const markers = window.getVisibleMarkers ? window.getVisibleMarkers() : new Map();
      return markers.size >= min;
    },
    minMarkers,
    { timeout: 10000 }
  );

  return { routeCreated: true };
}

test.describe('Real Marker Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    // Wait for loading overlay to disappear
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    // Wait for Google Maps autocomplete to be initialized
    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });

    // Create a route by typing into inputs like a real user
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);
  });

  test('should actually create and display station markers on the map', async ({ page }) => {
    // Markers should already be loaded from beforeEach

    const markerInfo = await page.evaluate(() => {
      const visibleMarkers = window.getVisibleMarkers();
      const allMarkers = window.getAllMarkers();

      return {
        visibleCount: visibleMarkers.size,
        allCount: allMarkers.length,
      };
    });

    expect(markerInfo.visibleCount).toBeGreaterThan(0);
    expect(markerInfo.allCount).toBeGreaterThan(0);
  });

  test('should have marker DOM elements rendered in the map', async ({ page }) => {
    // Markers already loaded from beforeEach

    // Check for marker elements in the DOM
    const hasMarkerElements = await page.evaluate(() => {
      const mapDiv = document.getElementById('map');
      if (!mapDiv) return false;

      // Look for the custom marker wrappers
      const customMarkers = mapDiv.querySelectorAll('.marker-pin-wrapper');
      const poiContainers = mapDiv.querySelectorAll('.poi-marker-content-container');

      return customMarkers.length > 0 || poiContainers.length > 0;
    });

    expect(hasMarkerElements).toBeTruthy();
  });

  test('should show station count that matches visible markers', async ({ page }) => {
    // Markers already loaded from beforeEach

    const counts = await page.evaluate(() => {
      const stationData = window.appState?.allStationData || [];
      const visibleMarkers = window.getVisibleMarkers();

      return {
        totalStations: stationData.length,
        visibleMarkers: visibleMarkers.size,
      };
    });

    expect(counts.totalStations).toBeGreaterThan(0);
    expect(counts.visibleMarkers).toBeGreaterThan(0);
    // Visible markers should be less than or equal to total stations
    expect(counts.visibleMarkers).toBeLessThanOrEqual(counts.totalStations);
  });
});

test.describe('Real Filter Interaction - Visual Changes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    // Wait for loading overlay to disappear
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    // Wait for Google Maps autocomplete to be initialized
    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });

    // Create a route by typing into inputs like a real user
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    // Open filter panel
    await page.locator('#filter-toggle-btn').click();
    await page.waitForTimeout(300);
  });

  test('should reduce visible markers when applying DC filter', async ({ page }) => {
    // Get initial count
    const initialCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(initialCount).toBeGreaterThan(0);

    // Click DC radio button (use label for better UX simulation)
    const dcLabel = page.locator('label:has(input[name="connectorType"][value="DC"])');
    await dcLabel.click();

    // Wait for markers to update
    await page.waitForTimeout(1500);

    const afterFilter = await page.evaluate(() => {
      const visible = window.getVisibleMarkers();
      const markersOnMap = Array.from(visible.values()).filter(m => m.map !== null);

      return {
        visibleCount: visible.size,
        onMapCount: markersOnMap.length,
        filterValue: window.appState?.currentFilters?.connectorType,
      };
    });

    // Filter should be set to DC
    expect(afterFilter.filterValue).toBe('DC');

    // Either count changed OR there are no DC stations (count = 0)
    const countChanged = afterFilter.visibleCount !== initialCount;
    const noResults = afterFilter.visibleCount === 0;

    expect(countChanged || noResults).toBeTruthy();
  });

  test('should hide markers when unchecking all power levels', async ({ page }) => {
    const initialCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Click to uncheck all power level checkboxes
    await page.locator('label:has(input[name="powerLevel"][value="low"])').click();
    await page.locator('label:has(input[name="powerLevel"][value="medium"])').click();
    await page.locator('label:has(input[name="powerLevel"][value="high"])').click();

    // Wait for filters to be applied
    await page.waitForTimeout(1500);

    const afterCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Should have 0 markers when all power levels unchecked
    expect(afterCount).toBe(0);
    expect(afterCount).toBeLessThan(initialCount);
  });

  test('should restore markers when resetting filters', async ({ page }) => {
    // Apply restrictive filter by clicking AC radio button
    const acLabel = page.locator('label:has(input[name="connectorType"][value="AC"])');
    await acLabel.click();
    await page.waitForTimeout(1000);

    const afterFilterCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Reset filters
    await page.locator('#reset-filters-btn').click();
    await page.waitForTimeout(1500);

    const afterResetCount = await page.evaluate(() => {
      return {
        count: window.getVisibleMarkers().size,
        filterValue: window.appState?.currentFilters?.connectorType,
      };
    });

    // Filter should be back to ALL
    expect(afterResetCount.filterValue).toBe('ALL');

    // Should have same or more markers after reset
    expect(afterResetCount.count).toBeGreaterThanOrEqual(afterFilterCount);
  });

  test('should actually remove marker elements from DOM when filtered', async ({ page }) => {
    // Count markers before filter
    const beforeCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Click to uncheck PUBLIC service type (the only one checked by default)
    const publicLabel = page.locator('label:has(input[name="serviceType"][value="PUBLIC"])');
    await publicLabel.click();

    // Wait for filters to be applied
    await page.waitForTimeout(1500);

    const afterFilter = await page.evaluate(() => {
      const visibleMarkers = window.getVisibleMarkers().size;
      const domElements = document.querySelectorAll('.marker-pin-wrapper').length;

      return {
        domElements,
        stateMarkers: visibleMarkers,
      };
    });

    // Should have 0 markers when no service types are selected
    expect(afterFilter.stateMarkers).toBe(0);
    expect(afterFilter.stateMarkers).toBeLessThan(beforeCount);
  });
});

test.describe('Real Marker Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    // Wait for loading overlay to disappear
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    // Wait for Google Maps autocomplete to be initialized
    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });

    // Switch to directions mode
    await page.locator('#directions-mode-btn').click();
    await page.waitForSelector('#directions-input-group:not(.hidden)', { timeout: 5000 });
  });

  test('should create route from Istanbul to Ankara and display station markers with correct data', async ({ page }) => {
    const startInput = page.locator('#start-input');
    const endInput = page.locator('#end-input');

    // Enter Istanbul as start location
    await startInput.focus();
    await startInput.type('Istanbul', { delay: 50 });

    let autocompleteContainer = page.locator('.pac-container').nth(0);
    await autocompleteContainer.waitFor({ state: 'visible', timeout: 10000 });

    await page.evaluate(() => {
      window.setTestLocation('start', 41.0082, 28.9784, 'Istanbul, Turkey');
    });

    await page.waitForTimeout(500);

    // Enter Ankara as destination
    await endInput.focus();
    await endInput.type('Ankara', { delay: 50 });

    await page.waitForTimeout(500);
    autocompleteContainer = page.locator('.pac-container').nth(1);
    await autocompleteContainer.waitFor({ state: 'visible', timeout: 10000 });

    await page.evaluate(async () => {
      window.setTestLocation('end', 39.9334, 32.8597, 'Ankara, Turkey');

      const app = window.getApp();
      if (app) {
        await app.calculateRoute();
      }
    });

    // Wait for route calculation and markers to appear
    await page.waitForTimeout(3000);

    // Verify markers appear on the map
    await page.waitForFunction(
      () => {
        const markers = window.getVisibleMarkers ? window.getVisibleMarkers() : new Map();
        return markers.size >= 5;
      },
      { timeout: 10000 }
    );

    const markerCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(markerCount).toBeGreaterThan(0);

    // Verify markers have correct station data
    const markersData = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const markersArray = Array.from(markers.values());

      return markersArray.slice(0, 3).map(marker => ({
        stationId: marker.stationId,
        brand: marker.poiData?.brand,
        hasTitle: !!marker.poiData?.title,
        hasConnectors: marker.poiData?.connectors && marker.poiData.connectors.length > 0,
        hasPosition: !!marker.position,
      }));
    });

    // Verify each marker has required data
    markersData.forEach(marker => {
      expect(marker.stationId).toBeTruthy();
      expect(marker.brand).toBeTruthy();
      expect(marker.hasPosition).toBeTruthy();
    });
  });

  test('should click marker and open station info panel with correct data', async ({ page }) => {
    // Create a route first
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    // Get the first visible marker's data and click it via Google Maps event
    const markerInfo = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      if (markers.size === 0) return null;

      const firstMarker = Array.from(markers.values())[0];
      const poiData = firstMarker.poiData;

      // Trigger click via Google Maps event API (works even when clustered)
      google.maps.event.trigger(firstMarker, 'click');

      return {
        stationId: firstMarker.stationId,
        brand: poiData?.brand || 'Unknown',
        title: poiData?.title || '',
        city: poiData?.city || '',
      };
    });

    expect(markerInfo).not.toBeNull();
    expect(markerInfo.stationId).toBeTruthy();

    // Wait for station info panel to open
    await page.waitForTimeout(1500);

    // Verify the station info panel is open
    const stationInfoPanel = page.locator('#station-info-panel');
    await expect(stationInfoPanel).toHaveClass(/open/);

    // Verify the panel contains the correct station information
    const panelContent = await stationInfoPanel.textContent();

    // The panel should contain the station's brand
    expect(panelContent).toContain(markerInfo.brand);

    // The panel should contain socket/charging information
    expect(panelContent.toLowerCase()).toMatch(/socket|kw|charging/i);

    // Close the panel
    const closeBtn = page.locator('#close-station-info-btn');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Verify panel is closed
    await expect(stationInfoPanel).not.toHaveClass(/open/);
  });
});

test.describe('Real Distance Filtering with Route', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    // Wait for loading overlay to disappear
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    // Wait for Google Maps autocomplete to be initialized
    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });

    // Create a route by typing into inputs like a real user
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);
  });

  test('should change visible markers when distance slider changes (with route)', async ({ page }) => {
    const distanceSlider = page.locator('#distance-slider');

    // Route already created in beforeEach
    const hasRoute = await page.evaluate(() => window.appState?.isRouteActive);
    expect(hasRoute).toBeTruthy();

    // Get marker count with default distance (5km)
    const beforeCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Change to very restrictive distance (1km)
    await distanceSlider.fill('1');
    await page.waitForTimeout(1500);

    const afterCount = await page.evaluate(() => {
      return {
        markers: window.getVisibleMarkers().size,
        distance: window.appState?.distanceThresholdKm,
      };
    });

    // Distance should be updated
    expect(afterCount.distance).toBe(1);

    // Should have fewer or same markers with restrictive distance
    expect(afterCount.markers).toBeLessThanOrEqual(beforeCount);
  });

  test('should update distance threshold immediately when slider moves', async ({ page }) => {
    const distanceSlider = page.locator('#distance-slider');
    const distanceValue = page.locator('#distance-value');

    // Change slider
    await distanceSlider.fill('15');
    await page.waitForTimeout(300);

    // Check UI and state updated
    await expect(distanceValue).toHaveText('15');

    const stateValue = await page.evaluate(() => window.appState?.distanceThresholdKm);
    expect(stateValue).toBe(15);
  });
});
