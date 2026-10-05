import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationStepRail from "./CreationStepRail";

const groups = [
  { label: "Name & Idea", status: "complete", firstIndex: 0 },
  { label: "Ancestry", status: "current", firstIndex: 1 },
  { label: "Class & Role", status: "upcoming", firstIndex: 2 },
  { label: "Review", status: "upcoming", firstIndex: 3 },
];

describe("CreationStepRail", () => {
  it("lists every step in order and marks the current one", () => {
    render(<CreationStepRail groups={groups} onJump={vi.fn()} />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "✓Name & Idea",
      "2Ancestry",
      "3Class & Role",
      "4Review",
    ]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
  });

  it("lets you go back to a finished step but not skip ahead", async () => {
    const onJump = vi.fn();
    render(<CreationStepRail groups={groups} onJump={onJump} />);

    await userEvent.click(screen.getByRole("button", { name: /Name & Idea/ }));

    expect(onJump).toHaveBeenCalledWith(0);
    expect(
      screen.queryByRole("button", { name: /Class & Role/ }),
    ).not.toBeInTheDocument();
  });

  it("opens Review once it is marked clickable, even though it is still upcoming", async () => {
    const onJump = vi.fn();
    render(
      <CreationStepRail
        groups={groups.map((group) =>
          group.label === "Review" ? { ...group, clickable: true } : group,
        )}
        onJump={onJump}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Review/ }));

    expect(onJump).toHaveBeenCalledWith(3);
  });
});
