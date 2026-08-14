import { test, expect } from '@playwright/test';

test.describe('Application UI Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#map', { state: 'visible' });

    // Wait for loading overlay to disappear
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveClass(/hidden/, { timeout: 15000 });

    // Switch to directions mode
    await page.locator('#directions-mode-btn').click();
    await page.waitForSelector('#directions-input-group:not(.hidden)', { timeout: 5000 });
  });

  test('should load the application with functional map', async ({ page }) => {
    await expect(page).toHaveTitle(/EV Stations Along Route/);

    // Verify map is actually initialized, not just visible
    const mapInitialized = await page.evaluate(() => {
      return window.appState?.map !== null;
    });
    expect(mapInitialized).toBeTruthy();
  });

  test('should open and close filter panel when clicking filter button', async ({ page }) => {
    const filterBtn = page.locator('#filter-toggle-btn');
    const filterPanel = page.locator('#filter-panel');

    // Panel should be hidden initially
    await expect(filterPanel).not.toHaveClass(/open/);

    // Click to open
    await filterBtn.click();
    await page.waitForTimeout(300);
    await expect(filterPanel).toHaveClass(/open/);

    // Click close button to close
    await page.locator('#close-filter-btn').click();
    await page.waitForTimeout(300);
    await expect(filterPanel).not.toHaveClass(/open/);
  });

  test('should change map type when clicking map type buttons', async ({ page }) => {
    const roadmapBtn = page.locator('button[data-maptypeid="roadmap"]');
    const hybridBtn = page.locator('button[data-maptypeid="hybrid"]');
    const terrainBtn = page.locator('button[data-maptypeid="terrain"]');

    // Click hybrid
    await hybridBtn.click();
    await page.waitForTimeout(500);

    let mapType = await page.evaluate(() => window.appState?.map?.getMapTypeId());
    expect(mapType).toBe('hybrid');

    // Click terrain
    await terrainBtn.click();
    await page.waitForTimeout(500);

    mapType = await page.evaluate(() => window.appState?.map?.getMapTypeId());
    expect(mapType).toBe('terrain');

    // Click roadmap
    await roadmapBtn.click();
    await page.waitForTimeout(500);

    mapType = await page.evaluate(() => window.appState?.map?.getMapTypeId());
    expect(mapType).toBe('roadmap');
  });

  test('should update distance value when moving slider', async ({ page }) => {
    const distanceSlider = page.locator('#distance-slider');
    const distanceValue = page.locator('#distance-value');

    // Default is 5
    await expect(distanceSlider).toHaveValue('5');
    await expect(distanceValue).toHaveText('5');

    // Change to 15
    await distanceSlider.fill('15');
    await page.waitForTimeout(300);

    // Verify UI updated
    await expect(distanceValue).toHaveText('15');

    // Verify state updated
    const stateValue = await page.evaluate(() => window.appState?.distanceThresholdKm);
    expect(stateValue).toBe(15);
  });

  test('should apply connector type filter and update state', async ({ page }) => {
    // Open filter panel
    await page.locator('#filter-toggle-btn').click();
    await page.waitForTimeout(300);

    // Select DC filter
    const dcLabel = page.locator('label:has(input[name="connectorType"][value="DC"])');
    await dcLabel.click();
    await page.waitForTimeout(500);

    // Verify filter is checked
    await expect(page.locator('input[name="connectorType"][value="DC"]')).toBeChecked();

    // Verify state updated
    const filterValue = await page.evaluate(() => window.appState?.currentFilters?.connectorType);
    expect(filterValue).toBe('DC');
  });

  test('should reset filters when clicking reset button', async ({ page }) => {
    // Open filter panel
    await page.locator('#filter-toggle-btn').click();
    await page.waitForTimeout(300);

    // Change some filters
    await page.locator('label:has(input[name="connectorType"][value="DC"])').click();
    await page.locator('label:has(input[name="powerLevel"][value="low"])').click();
    await page.waitForTimeout(500);

    // Get state before reset
    const beforeReset = await page.evaluate(() => ({
      connectorType: window.appState?.currentFilters?.connectorType,
      powerLevels: window.appState?.currentFilters?.powerLevels,
    }));

    expect(beforeReset.connectorType).toBe('DC');

    // Reset filters
    await page.locator('#reset-filters-btn').click();
    await page.waitForTimeout(500);

    // Verify state reset
    const afterReset = await page.evaluate(() => ({
      connectorType: window.appState?.currentFilters?.connectorType,
      powerLevels: window.appState?.currentFilters?.powerLevels,
    }));

    expect(afterReset.connectorType).toBe('ALL');
    expect(afterReset.powerLevels).toContain('low');
  });

  test('should toggle brand filter mode when clicking button', async ({ page }) => {
    const brandModeBtn = page.locator('#brand-filter-mode-btn');

    // First, add a favorite brand so toggling is possible
    await page.evaluate(() => {
      const app = window.getApp();
      if (app) {
        app.preferencesComponent.favoriteBrands.add('Tesla');
      }
    });

    // Get initial state (should be 'all')
    const initialMode = await page.evaluate(() => window.appState?.brandFilterMode);
    expect(initialMode).toBe('all');

    // Click to toggle to favorites only
    await brandModeBtn.click();
    await page.waitForTimeout(300);

    const afterFirstClick = await page.evaluate(() => window.appState?.brandFilterMode);
    expect(afterFirstClick).toBe('favoritesOnly');

    // Click to toggle back to all
    await brandModeBtn.click();
    await page.waitForTimeout(300);

    const afterSecondClick = await page.evaluate(() => window.appState?.brandFilterMode);
    expect(afterSecondClick).toBe('all');
  });

  test('should toggle route builder panel when clicking button', async ({ page }) => {
    const routeBuilderBtn = page.locator('#route-builder-toggle-btn');
    const routeBuilderPanel = page.locator('#route-builder-panel');

    // Panel should be closed initially
    await expect(routeBuilderPanel).not.toHaveClass(/open/);

    // Click to open
    await routeBuilderBtn.click();
    await page.waitForTimeout(300);

    await expect(routeBuilderPanel).toHaveClass(/open/);

    // Click to close
    await page.locator('#close-route-builder-btn').click();
    await page.waitForTimeout(300);

    await expect(routeBuilderPanel).not.toHaveClass(/open/);
  });

  test('should have working power level checkboxes', async ({ page }) => {
    // Open filter panel
    await page.locator('#filter-toggle-btn').click();
    await page.waitForTimeout(300);

    // Initially all should be checked
    await expect(page.locator('input[name="powerLevel"][value="low"]')).toBeChecked();
    await expect(page.locator('input[name="powerLevel"][value="medium"]')).toBeChecked();
    await expect(page.locator('input[name="powerLevel"][value="high"]')).toBeChecked();

    // Uncheck low
    await page.locator('label:has(input[name="powerLevel"][value="low"])').click();
    await page.waitForTimeout(300);

    // Verify unchecked in UI
    await expect(page.locator('input[name="powerLevel"][value="low"]')).not.toBeChecked();

    // Verify state updated
    const powerLevels = await page.evaluate(() => window.appState?.currentFilters?.powerLevels);
    expect(powerLevels).not.toContain('low');
    expect(powerLevels).toContain('medium');
    expect(powerLevels).toContain('high');
  });

  test('should have working service type checkboxes', async ({ page }) => {
    // Open filter panel
    await page.locator('#filter-toggle-btn').click();
    await page.waitForTimeout(300);

    // PUBLIC should be checked by default
    await expect(page.locator('input[name="serviceType"][value="PUBLIC"]')).toBeChecked();

    // Uncheck PUBLIC
    await page.locator('label:has(input[name="serviceType"][value="PUBLIC"])').click();
    await page.waitForTimeout(300);

    // Verify unchecked
    await expect(page.locator('input[name="serviceType"][value="PUBLIC"]')).not.toBeChecked();

    // Verify state updated
    const serviceTypes = await page.evaluate(() => window.appState?.currentFilters?.serviceTypes);
    expect(serviceTypes).not.toContain('PUBLIC');
  });

  test('should clear route when pressing X key', async ({ page }) => {
    // Set up a route first using test helpers
    await page.evaluate(async () => {
      window.setTestLocation('start', 41.0082, 28.9784, 'Istanbul, Turkey');
      window.setTestLocation('end', 39.9334, 32.8597, 'Ankara, Turkey');

      const app = window.getApp();
      if (app) {
        await app.calculateRoute();
      }
    });

    await page.waitForTimeout(2000);

    // Verify route exists
    const hasRoute = await page.evaluate(() => window.appState?.isRouteActive);
    expect(hasRoute).toBeTruthy();

    // Press X key
    await page.keyboard.press('x');
    await page.waitForTimeout(500);

    // Verify route cleared
    const afterClear = await page.evaluate(() => ({
      isRouteActive: window.appState?.isRouteActive,
      startLocation: window.appState?.startLocation,
      endLocation: window.appState?.endLocation,
    }));

    expect(afterClear.isRouteActive).toBeFalsy();
    expect(afterClear.startLocation).toBeNull();
    expect(afterClear.endLocation).toBeNull();
  });
});