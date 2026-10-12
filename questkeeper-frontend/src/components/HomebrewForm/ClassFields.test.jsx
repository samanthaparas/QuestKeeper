import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomebrewForm from "./HomebrewForm";
import { emptyHomebrewForm } from "../../utils/homebrewForm";

function renderClassForm(onSave = vi.fn().mockResolvedValue()) {
  render(
    <MemoryRouter>
      <HomebrewForm initialForm={emptyHomebrewForm("class")} onSave={onSave} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  return onSave;
}

describe("homebrew class form", () => {
  it("allows two saving throws and asks for them before saving", async () => {
    const onSave = renderClassForm();
    await userEvent.type(screen.getByLabelText("Name"), "Tinkerer");
    await userEvent.click(screen.getByRole("button", { name: "Save class" }));
    expect(screen.getByRole("alert")).toHaveTextContent("two saving throws");

    await userEvent.click(screen.getByRole("checkbox", { name: "Constitution" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Intelligence" }));
    expect(screen.getByRole("checkbox", { name: "Wisdom" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Save class" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: "class", name: "Tinkerer" }),
    );
    expect(onSave.mock.calls[0][0].data.savingThrows).toEqual(["con", "int"]);
  });

  it("shows the spellcasting options only for a caster, and previews the class", async () => {
    renderClassForm();
    expect(screen.queryByLabelText("Casts with")).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText("Spell slots"), "half-early");
    expect(screen.getByLabelText("Casts with")).toHaveValue("intelligence");
    expect(screen.getByLabelText("Uses the spell list of")).toHaveValue("wizard");

    await userEvent.selectOptions(screen.getByLabelText("Hit die"), "10");
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("d10")).toBeInTheDocument();
  });
});
