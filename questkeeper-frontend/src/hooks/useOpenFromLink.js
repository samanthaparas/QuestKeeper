import { useEffect, useEffectEvent } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

// The page-address words a link uses to open one item, e.g. quick-jump's
// "/races?open=elf" or "/classes?open=wizard&subclass=evocation".
const OPEN_PARAMS = ["open", "edition", "subclass"];

// Opens the item a link points to once the page's list has loaded, then
// tidies those words out of the address (keeping any others, like the Magic
// Items filters), so closing the item doesn't open it again.
//
// items: the page's list. ready: true once it has finished loading.
// onOpen(item, params): what clicking that item's card does.
// matches(item, params): which item the link means (by index by default).
export function useOpenFromLink({
  items,
  ready,
  onOpen,
  matches = (item, params) => item.index === params.get("open"),
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useLocation();
  const target = searchParams.get("open");

  const openTarget = useEffectEvent(() => {
    const item = items.find((entry) => matches(entry, searchParams));
    if (item) onOpen(item, searchParams);

    const next = new URLSearchParams(searchParams);
    OPEN_PARAMS.forEach((name) => next.delete(name));
    // Keep what the link carried (like where "back" is).
    setSearchParams(next, { replace: true, state });
  });

  useEffect(() => {
    if (target && ready) openTarget();
  }, [target, ready]);
}
