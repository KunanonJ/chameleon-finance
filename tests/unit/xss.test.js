const { escapeHtml } = (() => {
  // Load the escapeHtml function
  function escapeHtml(text) {
    if (!text) return "";
    const element = document.createElement("div");
    element.textContent = text;
    return element.innerHTML;
  }
  return { escapeHtml };
})();

describe("HTML Escaping for XSS Prevention", () => {
  test("XSS-1: Escapes single quotes in attributes", () => {
    const input = "'; alert('xss'); //";
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain("'");
    expect(escaped).toContain("&");
  });

  test("XSS-2: Escapes double quotes in attributes", () => {
    const input = '"; alert("xss"); //';
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain('"');
    expect(escaped).toContain("&");
  });

  test("XSS-3: Escapes HTML tags", () => {
    const input = "<script>alert('xss')</script>";
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
  });

  test("XSS-4: Handles normal text safely", () => {
    const input = "Netflix";
    const escaped = escapeHtml(input);
    expect(escaped).toBe("Netflix");
  });

  test("XSS-5: Handles special characters safely", () => {
    const input = "Netflix & Disney+ <3";
    const escaped = escapeHtml(input);
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
    expect(escaped).not.toContain("<");
  });
});
