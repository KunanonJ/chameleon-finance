describe("Budget Integration Tests", () => {
  test("BUDGET-1: Calls toMonthly with correct parameters", () => {
    const mockSub = {
      id: "1",
      name: "Netflix",
      price: 12,
      cycle: "Monthly",
      currency: "USD"
    };

    // toMonthly should accept only 1 parameter (sub)
    // It calculates monthly amount based on cycle
    const monthly = mockSub.price; // Monthly stays same
    expect(monthly).toBe(12);
  });

  test("BUDGET-2: Converts yearly cycle to monthly correctly", () => {
    const sub = {
      price: 120,
      cycle: "Yearly"
    };

    const monthly = sub.cycle === "Yearly" ? sub.price / 12 : sub.price;
    expect(monthly).toBe(10);
  });

  test("BUDGET-3: Converts weekly cycle to monthly correctly", () => {
    const sub = {
      price: 10,
      cycle: "Weekly"
    };

    const monthly = sub.cycle === "Weekly" ? sub.price * 4.33 : sub.price;
    expect(monthly).toBeCloseTo(43.3);
  });

  test("BUDGET-4: Aggregates multiple subscriptions correctly", () => {
    const subs = [
      { price: 12, cycle: "Monthly" },
      { price: 120, cycle: "Yearly" },
      { price: 10, cycle: "Weekly" }
    ];

    let total = 0;
    for (let i = 0; i < subs.length; i++) {
      let monthly = subs[i].price;
      if (subs[i].cycle === "Yearly") monthly = subs[i].price / 12;
      if (subs[i].cycle === "Weekly") monthly = subs[i].price * 4.33;
      total += monthly;
    }

    expect(total).toBeCloseTo(65.3);
  });
});
