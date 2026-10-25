import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageLightbox from "./ImageLightbox";

// jsdom has no <dialog> pop-up support; open and close just flip the flag.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

describe("ImageLightbox", () => {
  it("opens the picture big in a pop-up, not a new tab", async () => {
    render(<ImageLightbox src="https://example.test/map.png" alt="Handout: The Old Map" caption="The Old Map" />);

    await userEvent.click(screen.getByRole("button", { name: "Show Handout: The Old Map bigger" }));

    expect(screen.getByRole("dialog", { name: "The Old Map" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open full size" })).toHaveAttribute(
      "href",
      "https://example.test/map.png",
    );
  });

  it("closes with the ✕ button, Esc, or a tap outside the picture", async () => {
    render(<ImageLightbox src="https://example.test/map.png" alt="Map" caption="Map" />);
    const open = () => userEvent.click(screen.getByRole("button", { name: "Show Map bigger" }));

    await open();
    await userEvent.click(screen.getByRole("button", { name: "Close picture" }));
    expect(screen.queryByRole("link", { name: "Open full size" })).not.toBeInTheDocument();

    await open();
    fireEvent(screen.getByRole("dialog", { hidden: true }), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("link", { name: "Open full size" })).not.toBeInTheDocument();

    await open();
    fireEvent.click(screen.getByRole("dialog", { hidden: true }));
    expect(screen.queryByRole("link", { name: "Open full size" })).not.toBeInTheDocument();
  });
});

describe("ImageLightbox on a phone", () => {
  it("closes with the phone's Back instead of leaving the page, and keeps the page still while open", async () => {
    render(<ImageLightbox src="https://example.test/map.png" alt="Map" caption="Map" />);
    await userEvent.click(screen.getByRole("button", { name: "Show Map bigger" }));
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(window.history.state?.qkPopup).toBeTruthy();

    window.history.back();
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Open full size" })).not.toBeInTheDocument(),
    );
    expect(document.documentElement.style.overflow).toBe("");
  });
});
