import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useOpenFromLink } from "./useOpenFromLink";

const ITEMS = [{ index: "elf" }, { index: "dwarf" }];

function Page({ items = ITEMS, ready = true, onOpen }) {
  useOpenFromLink({ items, ready, onOpen });
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

function renderAt(path, props) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Page {...props} />
    </MemoryRouter>,
  );
}

describe("useOpenFromLink", () => {
  it("opens the linked item and tidies the address, keeping other words", () => {
    const onOpen = vi.fn();
    renderAt("/races?open=dwarf&rarity=rare", { onOpen });

    expect(onOpen).toHaveBeenCalledWith(ITEMS[1], expect.any(URLSearchParams));
    expect(screen.getByTestId("search")).toHaveTextContent("?rarity=rare");
  });

  it("waits until the list has loaded", () => {
    const onOpen = vi.fn();
    renderAt("/races?open=elf", { onOpen, ready: false });

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByTestId("search")).toHaveTextContent("?open=elf");
  });

  it("does nothing without a link", () => {
    const onOpen = vi.fn();
    renderAt("/races", { onOpen });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
