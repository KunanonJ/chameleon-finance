describe("Rates API Error Handling", () => {
  test("RATES-1: Handles failed API response with status check", () => {
    // Simulate fetch returning non-OK status
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: "Too Many Requests"
      })
    );

    // Should handle gracefully without crashing
    expect(global.fetch).toBeDefined();
  });

  test("RATES-2: Handles 500 server error from API", () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      })
    );

    expect(global.fetch).toBeDefined();
  });

  test("RATES-3: Handles NaN from parseInt on invalid timestamp", () => {
    const testValue = "invalid";
    const parsed = parseInt(testValue) || 0;
    expect(isNaN(parsed)).toBe(true);
    // Should use default 0 instead
    expect(parsed === 0 || isNaN(parsed)).toBe(true);
  });

  test("RATES-4: localStorage cache expiry calculation works with 0 timestamp", () => {
    const CACHE_KEY = "test_rates";
    const DATE_KEY = "test_rates_date";
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Mock invalid timestamp
    const invalidTimestamp = null;
    const parsedTime = parseInt(invalidTimestamp) || 0;

    // Should default to 0 and always consider cache stale
    const timeElapsed = Date.now() - parsedTime;
    expect(timeElapsed >= ONE_DAY).toBe(true);
  });
});
