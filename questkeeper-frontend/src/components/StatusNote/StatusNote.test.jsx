import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusNote from "./StatusNote";
import InlineLoading from "./InlineLoading";

describe("StatusNote", () => {
  it("reads a loading note out politely and an error note out at once", () => {
    const { rerender } = render(<StatusNote variant="loading">Loading your things...</StatusNote>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your things...");
    rerender(<StatusNote variant="error">Couldn't load.</StatusNote>);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load.");
  });

  it("is a plain note, with no live announcement, when it is just empty", () => {
    render(<StatusNote>Nothing here yet.</StatusNote>);
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers Try again only on an error, only when it can be tried again", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<StatusNote variant="error">Couldn't load.</StatusNote>);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<StatusNote variant="error" onRetry={onRetry}>Couldn't load.</StatusNote>);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<StatusNote variant="loading" onRetry={onRetry}>Loading...</StatusNote>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("can sit inside a list, and can take keyboard focus when it appears", () => {
    render(
      <ul>
        <StatusNote as="li" variant="loading" focusOnShow>
          Loading...
        </StatusNote>
      </ul>,
    );
    expect(screen.getByRole("status").tagName).toBe("LI");
    expect(screen.getByRole("status")).toHaveFocus();
  });
});

describe("InlineLoading", () => {
  it("is a polite one-line status that never takes focus", () => {
    render(<InlineLoading>Loading details...</InlineLoading>);
    const line = screen.getByRole("status");
    expect(line).toHaveTextContent("Loading details...");
    expect(line).not.toHaveAttribute("tabindex");
    expect(line).not.toHaveFocus();
  });
});
