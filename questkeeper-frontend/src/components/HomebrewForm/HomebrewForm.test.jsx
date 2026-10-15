import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomebrewForm from "./HomebrewForm";
import { emptyHomebrewForm } from "../../utils/homebrewForm";

function renderForm(props = {}) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue();
  render(
    <MemoryRouter>
      <HomebrewForm
        initialForm={emptyHomebrewForm(props.category ?? "race")}
        raceOptions={[{ index: "elf", name: "Elf", source: "SRD 5.1" }]}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    </MemoryRouter>,
  );
  return onSave;
}

describe("HomebrewForm", () => {
  it("updates the preview as you type", async () => {
    renderForm();
    const preview = screen.getByRole("complementary", { name: "Preview" });

    expect(within(preview).getByText("Unnamed Race")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Owlfolk");
    expect(within(preview).getByText("Owlfolk")).toBeInTheDocument();
    expect(within(preview).getByText("Homebrew")).toBeInTheDocument();
  });

  it("adds and removes trait rows", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Add a trait" }));
    expect(screen.getAllByPlaceholderText(/Trait name/)).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    expect(screen.getAllByPlaceholderText(/Trait name/)).toHaveLength(1);
  });

  it("won't save until required choices are made", async () => {
    const onSave = renderForm({ category: "subrace" });
    await userEvent.type(screen.getByLabelText("Name"), "Moon Elf");
    await userEvent.click(screen.getByRole("button", { name: "Save subrace" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/which race/);
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.selectOptions(
      screen.getByLabelText("Which race is this a subrace of?"),
      "elf",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save subrace" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "subrace",
        name: "Moon Elf",
        data: expect.objectContaining({ parentRace: "elf", parentRaceName: "Elf" }),
      }),
    );
  });

  it("shows a save error from the database", async () => {
    renderForm({ onSave: vi.fn().mockRejectedValue(new Error("Network down")) });
    await userEvent.type(screen.getByLabelText("Name"), "Owlfolk");
    await userEvent.click(screen.getByRole("button", { name: "Save race" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
  });

  it("lets a background offer a skill pick", async () => {
    renderForm({ category: "background" });
    await userEvent.click(screen.getByLabelText(/choose extra skills from a list/));
    expect(screen.getByText(/tick at least one skill/)).toBeInTheDocument();
  });

  it("lets a race offer skill choices, like a Half-Elf's any 2", async () => {
    renderForm({ category: "race" });
    await userEvent.click(screen.getByLabelText(/choose extra skills from a list/));
    await userEvent.click(screen.getByRole("button", { name: "Allow any skill" }));
    expect(screen.getByText(/Pick from: any skill/)).toBeInTheDocument();
  });
});
