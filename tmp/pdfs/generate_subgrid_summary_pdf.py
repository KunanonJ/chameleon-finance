from pathlib import Path
import textwrap

OUTPUT_PATH = Path("/Users/kunanonjarat/Desktop/subgrid/output/pdf/subgrid-summary.pdf")

PAGE_W = 612
PAGE_H = 792
MARGIN_L = 54
MARGIN_R = 54
MARGIN_T = 54
MARGIN_B = 54

TITLE_SIZE = 18
TITLE_LEADING = 22
HEADING_SIZE = 12
HEADING_LEADING = 16
BODY_SIZE = 10
BODY_LEADING = 13
SECTION_SPACING = 6

BODY_WRAP = 82
BULLET_WRAP = 74


def escape_pdf_text(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def add_line(commands, text, x, y, font, size):
    safe = escape_pdf_text(text)
    commands.append(f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({safe}) Tj ET")


def add_wrapped(commands, text, x, y, font, size, wrap_width, leading):
    lines = textwrap.wrap(text, width=wrap_width)
    for line in lines:
        add_line(commands, line, x, y, font, size)
        y -= leading
    return y


def add_heading(commands, text, x, y):
    add_line(commands, text, x, y, "F2", HEADING_SIZE)
    return y - HEADING_LEADING


def add_bullets(commands, bullets, x, y):
    bullet_x = x
    indent_x = x + 12
    for bullet in bullets:
        lines = textwrap.wrap(bullet, width=BULLET_WRAP)
        if not lines:
            continue
        add_line(commands, f"- {lines[0]}", bullet_x, y, "F1", BODY_SIZE)
        y -= BODY_LEADING
        for line in lines[1:]:
            add_line(commands, line, indent_x, y, "F1", BODY_SIZE)
            y -= BODY_LEADING
    return y


def main():
    commands = []
    y = PAGE_H - MARGIN_T

    # Title
    add_line(commands, "SubGrid - One-Page Summary", MARGIN_L, y, "F2", TITLE_SIZE)
    y -= TITLE_LEADING
    y -= SECTION_SPACING

    # What it is
    y = add_heading(commands, "What it is", MARGIN_L, y)
    y = add_wrapped(
        commands,
        "SubGrid is a static, in-browser tool that visualizes subscription spending as proportional layouts (grid/treemap, beeswarm, circle pack).",
        MARGIN_L,
        y,
        "F1",
        BODY_SIZE,
        BODY_WRAP,
        BODY_LEADING,
    )
    y = add_wrapped(
        commands,
        "It helps you see monthly and yearly totals at a glance and compare which services dominate your budget.",
        MARGIN_L,
        y,
        "F1",
        BODY_SIZE,
        BODY_WRAP,
        BODY_LEADING,
    )
    y -= SECTION_SPACING

    # Who it's for
    y = add_heading(commands, "Who it's for", MARGIN_L, y)
    y = add_wrapped(
        commands,
        "People who want a quick visual breakdown of their personal subscription costs.",
        MARGIN_L,
        y,
        "F1",
        BODY_SIZE,
        BODY_WRAP,
        BODY_LEADING,
    )
    y -= SECTION_SPACING

    # What it does
    y = add_heading(commands, "What it does", MARGIN_L, y)
    y = add_bullets(
        commands,
        [
            "Add and edit subscriptions with price, billing cycle, currency, and URL.",
            "Visualize costs in a proportional grid (treemap) plus beeswarm and circle pack views.",
            "Compute monthly and yearly totals in the selected currency.",
            "Quick-add presets for popular services.",
            "Import bank CSVs and detect recurring charges as subscriptions.",
            "Export the visualization to PNG.",
            "Backup and restore data via JSON, stored in browser localStorage.",
        ],
        MARGIN_L,
        y,
    )
    y -= SECTION_SPACING

    # How it works
    y = add_heading(commands, "How it works", MARGIN_L, y)
    y = add_bullets(
        commands,
        [
            "Static assets: index.html, styles.css, and js/*.js served as a single-page UI (Tailwind via CDN).",
            "State and persistence: subs array in js/app.js saved to localStorage by js/storage.js.",
            "Rendering: treemap.js, beeswarm.js, circlepack.js compute layout and render DOM; modern-screenshot exports PNG.",
            "Import and presets: bank-import.js parses CSV and suggests recurring charges; presets.js seeds quick-add list.",
            "External services: exchange rates from https://open.er-api.com (cached daily) and logos from logo.dev.",
            "Backend/API: Not found in repo (static frontend only).",
        ],
        MARGIN_L,
        y,
    )
    y -= SECTION_SPACING

    # How to run
    y = add_heading(commands, "How to run", MARGIN_L, y)
    y = add_bullets(
        commands,
        [
            "From repo root, run `npx serve .` or `python -m http.server`.",
            "Open the local server URL in a browser.",
        ],
        MARGIN_L,
        y,
    )

    if y < MARGIN_B:
        raise SystemExit("Content overflowed the page. Reduce text or font sizes.")

    content_stream = "\n".join(commands).encode("utf-8")

    # Build PDF objects
    objects = []

    def add_obj(obj_str):
        objects.append(obj_str)

    add_obj("<< /Type /Catalog /Pages 2 0 R >>")
    add_obj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add_obj(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"
    )
    add_obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    add_obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    add_obj(f"<< /Length {len(content_stream)} >>\nstream\n" + content_stream.decode("utf-8") + "\nendstream")

    # Write PDF
    xref_positions = []
    pdf_parts = ["%PDF-1.4\n"]

    for i, obj in enumerate(objects, start=1):
        xref_positions.append(sum(len(part.encode("utf-8")) for part in pdf_parts))
        pdf_parts.append(f"{i} 0 obj\n{obj}\nendobj\n")

    xref_start = sum(len(part.encode("utf-8")) for part in pdf_parts)

    xref = ["xref\n", f"0 {len(objects) + 1}\n", "0000000000 65535 f \n"]
    for pos in xref_positions:
        xref.append(f"{pos:010d} 00000 n \n")

    trailer = (
        "trailer\n"
        f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        "startxref\n"
        f"{xref_start}\n"
        "%%EOF\n"
    )

    with OUTPUT_PATH.open("wb") as f:
        for part in pdf_parts:
            f.write(part.encode("utf-8"))
        f.write("".join(xref).encode("utf-8"))
        f.write(trailer.encode("utf-8"))


if __name__ == "__main__":
    main()
