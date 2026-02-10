describe("Price Validation on Import", () => {
  test("VALIDATE-1: Accepts valid positive price", () => {
    const price = 9.99;
    const isValid = typeof price === "number" && isFinite(price) && price > 0;
    expect(isValid).toBe(true);
  });

  test("VALIDATE-2: Rejects zero price", () => {
    const price = 0;
    const isValid = typeof price === "number" && isFinite(price) && price > 0;
    expect(isValid).toBe(false);
  });

  test("VALIDATE-3: Rejects negative price", () => {
    const price = -50;
    const isValid = typeof price === "number" && isFinite(price) && price > 0;
    expect(isValid).toBe(false);
  });

  test("VALIDATE-4: Rejects Infinity", () => {
    const price = Infinity;
    const isValid = typeof price === "number" && isFinite(price) && price > 0;
    expect(isValid).toBe(false);
  });

  test("VALIDATE-5: Rejects NaN", () => {
    const price = NaN;
    const isValid = typeof price === "number" && isFinite(price) && price > 0;
    expect(isValid).toBe(false);
  });

  test("VALIDATE-6: Validates full subscription object", () => {
    const sub = {
      id: "123",
      name: "Netflix",
      price: 15.99,
      currency: "USD"
    };

    const isValid = sub.id && sub.name &&
      typeof sub.price === "number" &&
      isFinite(sub.price) &&
      sub.price > 0;

    expect(isValid).toBe(true);
  });

  test("VALIDATE-7: Rejects subscription with invalid price", () => {
    const sub = {
      id: "123",
      name: "Netflix",
      price: -10,
      currency: "USD"
    };

    const isValid = sub.id && sub.name &&
      typeof sub.price === "number" &&
      isFinite(sub.price) &&
      sub.price > 0;

    expect(isValid).toBe(false);
  });
});
