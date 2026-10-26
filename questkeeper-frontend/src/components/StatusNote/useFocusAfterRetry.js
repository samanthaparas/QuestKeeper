import { useEffect, useRef } from "react";

// After "Try again" has finished loading (found or failed again), the button
// that was pressed is long gone, so keyboard focus goes to the page's main
// heading instead of being lost to the top of the page.
export function useFocusAfterRetry(hasRetried, isLoading) {
  const wasLoading = useRef(isLoading);
  useEffect(() => {
    if (hasRetried && wasLoading.current && !isLoading) {
      const heading = document.querySelector("main h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
    wasLoading.current = isLoading;
  }, [hasRetried, isLoading]);
}
