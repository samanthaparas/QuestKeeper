import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { loadHomebrewStart } from "../../utils/homebrewStart";
import Button from "../Button/Button";

// "Use as a starting point" on a free (SRD or Open5e) option: opens My
// Homebrew with a copy of it filled in, ready to change and save.
//
// startFrom: { category, index } from the detail panel.
// onStart(prefill): used instead of going to My Homebrew (character creation
// opens its own homebrew pop-up, so progress isn't lost).
// hint: a line beside the button, shown only when the button is.
function StartFromButton({ startFrom, onStart, label = "Use as a starting point", hint }) {
  const navigate = useNavigate();
  const signedIn = Boolean(useAuth()?.user);
  const [state, setState] = useState("idle"); // "loading" | "error"

  // Homebrew is saved to your account, so this needs you signed in.
  if (!signedIn) return null;

  async function handleClick() {
    setState("loading");
    try {
      const prefill = await loadHomebrewStart(startFrom.category, startFrom.index);
      setState("idle");
      if (onStart) onStart(prefill);
      else navigate("/homebrew", { state: { newHomebrew: prefill } });
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={state === "loading"}
        title="Make your own version: a homebrew copy with everything filled in, ready to change"
        onClick={handleClick}
      >
        {state === "loading" ? "Copying..." : label}
      </Button>
      {hint && <span className="detail-panel__start-hint">{hint}</span>}
      {state === "error" && (
        <span className="start-from__error" role="alert">
          Couldn&apos;t copy it. Try again.
        </span>
      )}
    </>
  );
}

export default StartFromButton;
