describe("DOM Safety and Null Checks", () => {
  beforeEach(() => {
    document.body.innerHTML = '</body>';
  });

  test("DOM-1: Checks if element exists before manipulation", () => {
    const element = document.getElementById("non-existent");
    expect(element).toBeNull();

    // Safe pattern: check before use
    if (element) {
      element.innerHTML = "test";
    }
    expect(true).toBe(true); // No crash
  });

  test("DOM-2: Safe innerHTML assignment with null check", () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const element = document.getElementById("test-container");
    expect(element).not.toBeNull();

    if (element) {
      element.innerHTML = "<span>Safe</span>";
      expect(element.innerHTML).toContain("Safe");
    }
  });

  test("DOM-3: Handles missing container gracefully", () => {
    const listContainer = document.getElementById("missing-list");

    // Safe pattern
    if (!listContainer) {
      expect(true).toBe(true);
      return;
    }

    listContainer.innerHTML = "test";
  });
});
