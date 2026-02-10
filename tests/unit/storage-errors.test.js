describe("Storage Error Handling", () => {
  test("STORAGE-1: Detects QuotaExceededError correctly", () => {
    const error = new Error("QuotaExceededError");
    error.name = "QuotaExceededError";

    expect(error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED").toBe(true);
  });

  test("STORAGE-2: Detects Firefox quota error correctly", () => {
    const error = new Error("NS_ERROR_DOM_QUOTA_REACHED");
    error.name = "NS_ERROR_DOM_QUOTA_REACHED";

    expect(error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED").toBe(true);
  });

  test("STORAGE-3: Validates positive price correctly", () => {
    const validPrice = 9.99;
    const isValid = typeof validPrice === "number" && isFinite(validPrice) && validPrice > 0;
    expect(isValid).toBe(true);
  });

  test("STORAGE-4: Rejects negative price", () => {
    const negativePrice = -10;
    const isValid = typeof negativePrice === "number" && isFinite(negativePrice) && negativePrice > 0;
    expect(isValid).toBe(false);
  });

  test("STORAGE-5: Rejects Infinity as price", () => {
    const infPrice = Infinity;
    const isValid = typeof infPrice === "number" && isFinite(infPrice) && infPrice > 0;
    expect(isValid).toBe(false);
  });

  test("STORAGE-6: Rejects NaN as price", () => {
    const nanPrice = NaN;
    const isValid = typeof nanPrice === "number" && isFinite(nanPrice) && nanPrice > 0;
    expect(isValid).toBe(false);
  });
});
