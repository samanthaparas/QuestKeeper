import { useState } from "react";

export function useSrdDetailView() {
  const [view, setView] = useState(null);

  function open(title, loadDetails) {
    setView({ title, status: "loading", details: [] });

    loadDetails()
      .then((details) =>
        setView((current) =>
          current?.title === title
            ? { title, status: "ready", details }
            : current,
        ),
      )
      .catch(() =>
        setView((current) =>
          current?.title === title
            ? { title, status: "error", details: [] }
            : current,
        ),
      );
  }

  function close() {
    setView(null);
  }

  return { view, open, close };
}
