import { Link, useLocation } from "react-router-dom";
import "./BackLink.css";

// "← Back to your quiz results": shown at the top of a page when the link
// that opened it said where "back" is (location state { backTo, backLabel }).
// Only QuestKeeper's own pages count as somewhere to go back to.
function BackLink() {
  const { state } = useLocation();
  const backTo = state?.backTo;
  if (typeof backTo !== "string" || !backTo.startsWith("/") || backTo.startsWith("//")) return null;

  return (
    <div className="back-link">
      <Link className="back-link__button" to={backTo}>
        ← {state.backLabel || "Back"}
      </Link>
    </div>
  );
}

export default BackLink;
