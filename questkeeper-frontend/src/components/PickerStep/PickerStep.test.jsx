import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PickerStep from "./PickerStep";

function renderPicker(props = {}) {
  render(
    <MemoryRouter>
      <PickerStep
        title="Choose a Race"
        description="Pick one."
        category="Race"
        fetchList={() => Promise.resolve([{ index: "elf", name: "Elf" }])}
        fetchDetails={vi.fn()}
        mapToDetailPanelResult={(data) => data}
        mapToSnapshot={(data) => data}
        onChoose={vi.fn()}
        onBack={vi.fn()}
        backLabel="Back"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("PickerStep", () => {
  it("offers 'Make your own' when given a handler", async () => {
    const onMakeOwn = vi.fn();
    renderPicker({ onMakeOwn, makeOwnLabel: "Make your own race" });
    await screen.findByText("Elf");

    await userEvent.click(screen.getByRole("button", { name: "Make your own race" }));
    expect(onMakeOwn).toHaveBeenCalled();
  });

  it("leaves it out otherwise", async () => {
    renderPicker();
    await screen.findByText("Elf");
    expect(screen.queryByText(/Can't find what you want/)).not.toBeInTheDocument();
  });

  it("starts with an entry selected when given one", async () => {
    renderPicker({ initialSelectedRaw: { index: "hb_r1", name: "Owlfolk", category: "Race" } });
    expect(await screen.findByRole("button", { name: "Choose Owlfolk" })).toBeInTheDocument();
  });
});
