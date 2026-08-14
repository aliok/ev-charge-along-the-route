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

  await startInput.focus();
  await startInput.type(startLocation, { delay: 50 });

  let autocompleteContainer = page.locator('.pac-container').nth(0);
  await autocompleteContainer.waitFor({ state: 'visible', timeout: 10000 });

  await page.evaluate(() => {
    window.setTestLocation('start', 41.0082, 28.9784, 'Istanbul, Turkey');
  });

  await page.waitForTimeout(500);

  await endInput.focus();
  await endInput.type(endLocation, { delay: 50 });

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

  await page.waitForTimeout(3000);

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

test.describe('Brand Management - Favorites', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });
  });

  test('should favorite a brand and verify it updates state', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    const markerInfo = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const firstMarker = Array.from(markers.values())[0];
      return {
        stationId: firstMarker.stationId,
        brand: firstMarker.poiData?.brand,
      };
    });

    expect(markerInfo.brand).toBeTruthy();

    // Favorite the brand directly (don't rely on panel opening)
    await page.evaluate((brand) => {
      window.handleInfoWindowBrandAction(brand, 'favorite');
    }, markerInfo.brand);

    await page.waitForTimeout(500);

    // Verify brand is favorited
    const isFavorited = await page.evaluate((brand) => {
      const app = window.getApp();
      return app && app.preferencesComponent.favoriteBrands.has(brand);
    }, markerInfo.brand);

    expect(isFavorited).toBeTruthy();
  });

  test('should unfavorite a brand', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    const markerInfo = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const firstMarker = Array.from(markers.values())[0];
      const brand = firstMarker.poiData?.brand;

      // Favorite the brand first
      const app = window.getApp();
      if (app && brand) {
        app.preferencesComponent.favoriteBrands.add(brand);
      }

      return {
        stationId: firstMarker.stationId,
        brand: brand,
      };
    });

    // Click marker
    await page.evaluate((stationId) => {
      const markers = window.getVisibleMarkers();
      const marker = markers.get(stationId);
      if (marker && marker.content) {
        marker.content.click();
      }
    }, markerInfo.stationId);

    await page.waitForTimeout(2000);

    // Unfavorite
    await page.evaluate((brand) => {
      window.handleInfoWindowBrandAction(brand, 'favorite');
    }, markerInfo.brand);

    await page.waitForTimeout(500);

    // Verify unfavorited
    const isFavorited = await page.evaluate((brand) => {
      const app = window.getApp();
      return app && app.preferencesComponent.favoriteBrands.has(brand);
    }, markerInfo.brand);

    expect(isFavorited).toBeFalsy();
  });
});

test.describe('Brand Management - Blocking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });
  });

  test('should block a brand and verify markers disappear', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    const initialData = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const firstMarker = Array.from(markers.values())[0];
      const brand = firstMarker.poiData?.brand;

      let brandCount = 0;
      markers.forEach(marker => {
        if (marker.poiData?.brand === brand) {
          brandCount++;
        }
      });

      return {
        stationId: firstMarker.stationId,
        brand: brand,
        totalMarkers: markers.size,
        brandMarkerCount: brandCount,
      };
    });

    expect(initialData.brandMarkerCount).toBeGreaterThan(0);

    // Block the brand using the handler
    await page.evaluate((brand) => {
      window.handleInfoWindowBrandAction(brand, 'blacklist');
    }, initialData.brand);

    await page.waitForTimeout(1000);

    // Verify brand is blacklisted
    const isBlocked = await page.evaluate((brand) => {
      const app = window.getApp();
      return app && app.preferencesComponent.blacklistedBrands.has(brand);
    }, initialData.brand);

    expect(isBlocked).toBeTruthy();

    // Verify markers of that brand disappeared
    const afterBlockCount = await page.evaluate(() => window.getVisibleMarkers().size);

    expect(afterBlockCount).toBeLessThan(initialData.totalMarkers);
    expect(afterBlockCount).toBe(initialData.totalMarkers - initialData.brandMarkerCount);
  });

  test('should unblock a brand and verify markers reappear', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    // Block a brand
    const markerInfo = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const firstMarker = Array.from(markers.values())[0];
      const brand = firstMarker.poiData?.brand;

      // Block it
      window.handleInfoWindowBrandAction(brand, 'blacklist');

      return { brand: brand };
    });

    await page.waitForTimeout(1000);

    const afterBlockCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Unblock
    await page.evaluate((brand) => {
      window.handleInfoWindowBrandAction(brand, 'blacklist');
    }, markerInfo.brand);

    await page.waitForTimeout(1000);

    const afterUnblockCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(afterUnblockCount).toBeGreaterThan(afterBlockCount);
  });
});

test.describe('Brand Management - Favorites Only Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });
  });

  test('should show only favorite brand markers when in favorites-only mode', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    // Favorite two brands
    const brandData = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const markerArray = Array.from(markers.values());

      const brand1 = markerArray[0]?.poiData?.brand;
      let brand2 = null;
      for (let i = 1; i < markerArray.length; i++) {
        if (markerArray[i]?.poiData?.brand !== brand1) {
          brand2 = markerArray[i]?.poiData?.brand;
          break;
        }
      }

      const app = window.getApp();
      if (app && brand1) {
        app.preferencesComponent.favoriteBrands.add(brand1);
      }
      if (app && brand2) {
        app.preferencesComponent.favoriteBrands.add(brand2);
      }

      return {
        brand1,
        brand2,
        totalMarkers: markers.size,
      };
    });

    const initialCount = brandData.totalMarkers;

    // Toggle to favorites-only mode
    const brandModeBtn = page.locator('#brand-filter-mode-btn');
    await brandModeBtn.click();
    await page.waitForTimeout(1000);

    // Verify mode
    const mode = await page.evaluate(() => window.appState?.brandFilterMode);
    expect(mode).toBe('favoritesOnly');

    // Verify only favorites visible
    const favoritesCount = await page.evaluate(() => window.getVisibleMarkers().size);

    expect(favoritesCount).toBeLessThanOrEqual(initialCount);
    expect(favoritesCount).toBeGreaterThan(0);

    // Verify all visible are favorites
    const allAreFavorites = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const app = window.getApp();
      if (!app) return false;

      const favBrands = app.preferencesComponent.favoriteBrands;

      for (const marker of markers.values()) {
        const brand = marker.poiData?.brand;
        if (!favBrands.has(brand)) {
          return false;
        }
      }
      return true;
    });

    expect(allAreFavorites).toBeTruthy();
  });

  test('should toggle back to show all brands', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    const initialCount = await page.evaluate(() => window.getVisibleMarkers().size);

    // Favorite a brand
    await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const firstMarker = Array.from(markers.values())[0];
      const brand = firstMarker.poiData?.brand;

      const app = window.getApp();
      if (app && brand) {
        app.preferencesComponent.favoriteBrands.add(brand);
      }
    });

    // Toggle to favorites-only
    const brandModeBtn = page.locator('#brand-filter-mode-btn');
    await brandModeBtn.click();
    await page.waitForTimeout(1000);

    const favoritesCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(favoritesCount).toBeLessThan(initialCount);

    // Toggle back
    await brandModeBtn.click();
    await page.waitForTimeout(1000);

    const allCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(allCount).toBe(initialCount);

    const mode = await page.evaluate(() => window.appState?.brandFilterMode);
    expect(mode).toBe('all');
  });
});

test.describe('Brand Management - Ignore Stations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });
  });

  test('should ignore individual station and verify it disappears from markers', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    const stationData = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const markerArray = Array.from(markers.values());
      const firstMarker = markerArray[0];

      return {
        stationId: firstMarker.stationId,
        brand: firstMarker.poiData?.brand,
        totalMarkers: markers.size,
      };
    });

    // Ignore the station using the handler
    await page.evaluate((stationId) => {
      window.handleIgnoreStationClick(String(stationId));
    }, stationData.stationId);

    await page.waitForTimeout(1000);

    // Verify station is ignored in state
    const isIgnored = await page.evaluate((stationId) => {
      const app = window.getApp();
      return app && app.preferencesComponent.ignoredStationIds.has(String(stationId));
    }, stationData.stationId);

    expect(isIgnored).toBeTruthy();

    // Verify marker count decreased by 1
    const afterIgnoreCount = await page.evaluate(() => window.getVisibleMarkers().size);
    expect(afterIgnoreCount).toBe(stationData.totalMarkers - 1);

    // Verify the ignored station is not in visible markers
    const stationStillVisible = await page.evaluate((stationId) => {
      const markers = window.getVisibleMarkers();
      return markers.has(stationId);
    }, stationData.stationId);

    expect(stationStillVisible).toBeFalsy();
  });
});

test.describe('Brand Management - Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForFunction(() => {
      return window.appState?.autocompleteStart !== null &&
             window.appState?.autocompleteEnd !== null;
    }, { timeout: 10000 });
  });

  test('should persist favorites and blacklist after page refresh', async ({ page }) => {
    await createRouteByTyping(page, 'Istanbul', 'Ankara', 5);

    // Get two brands
    const brands = await page.evaluate(() => {
      const markers = window.getVisibleMarkers();
      const markerArray = Array.from(markers.values());

      const brand1 = markerArray[0]?.poiData?.brand;
      let brand2 = null;
      for (let i = 1; i < markerArray.length; i++) {
        if (markerArray[i]?.poiData?.brand !== brand1) {
          brand2 = markerArray[i]?.poiData?.brand;
          break;
        }
      }

      // Favorite brand1 and block brand2
      const app = window.getApp();
      if (app) {
        if (brand1) app.preferencesComponent.favoriteBrands.add(brand1);
        if (brand2) app.preferencesComponent.blacklistedBrands.add(brand2);

        // Save settings
        app.saveSettings();
      }

      return { brand1, brand2 };
    });

    // Refresh
    await page.reload();

    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Verify restored
    const restored = await page.evaluate((expectedBrands) => {
      const app = window.getApp();
      if (!app) return { hasFavorite: false, hasBlacklist: false };

      return {
        hasFavorite: app.preferencesComponent.favoriteBrands.has(expectedBrands.brand1),
        hasBlacklist: app.preferencesComponent.blacklistedBrands.has(expectedBrands.brand2),
      };
    }, brands);

    expect(restored.hasFavorite).toBeTruthy();
    expect(restored.hasBlacklist).toBeTruthy();
  });
});
