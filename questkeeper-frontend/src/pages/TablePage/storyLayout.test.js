import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// (Read from disk: the test setup turns imported CSS into nothing.)
const css = readFileSync(join(import.meta.dirname, "TablePage.css"), "utf8");

// A component test can't measure a rendered layout, so this guards the one
// rule that caused the tablet overlap: the journal's notes may only be a
// bounded, flex-sized scroll box on tall, wide windows. Everywhere else they
// must be plain page flow, or they run underneath the note box.

describe("Story journal layout rules (source check)", () => {
  const notes = ".table-page--dm .table-journal--feed > .table-journal__scroll";

  it("makes the notes plain page flow by default", () => {
    const block = css.split(`${notes} {`).filter((_, i) => i > 0).map((part) => part.split("}")[0]);
    // the last rule outside any media block comes right after the explanatory comment
    const base = css.slice(css.indexOf("/* By default (tablet, phone"));
    const rule = base.slice(base.indexOf(`${notes} {`), base.indexOf("}", base.indexOf(`${notes} {`)));
    expect(rule).toMatch(/flex:\s*0 0 auto/);
    expect(rule).toMatch(/overflow:\s*visible/);
    expect(block.length).toBeGreaterThan(1);
  });

  it("only gives the notes a flex-sized scroll box inside the tall-and-wide media query", () => {
    const start = css.lastIndexOf("@media (min-width: 900px) and (min-height: 620px) {");
    const media = css.slice(start, css.indexOf("\n}\n", start) + 3);
    expect(media).toContain(".table-journal--feed > .table-journal__scroll");
    expect(media).toMatch(/flex:\s*1 1 0/);
    expect(media).toMatch(/overflow-y:\s*auto/);
    // and no stray "flex: 1 1 0" on the notes outside that block after the correction
    const before = css.slice(0, start);
    const after = before.slice(before.indexOf("/* By default (tablet, phone"));
    expect(after).not.toMatch(/journal--feed > \.table-journal__scroll \{[^}]*flex:\s*1 1 0/);
  });

  it("gives the note box one solid surface", () => {
    expect(css).toMatch(/\.table-journal--feed > \.table-journal__composer \{[^}]*background-color:\s*color-mix\(in srgb, var\(--qk-surface-muted\) 22%, var\(--qk-surface\)\)/);
  });
});
