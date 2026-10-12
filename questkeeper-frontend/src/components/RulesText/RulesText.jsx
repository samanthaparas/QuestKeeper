import { splitRulesWords } from "../../utils/rulesWords";
import RuleTerm from "./RuleTerm";

// A block of rules text with its rules words ("advantage", "saving throw",
// "prone"...) explained on hover. Each word is marked the first time it
// appears in the text.
function RulesText({ text }) {
  if (!text) return null;
  return splitRulesWords(text).map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <RuleTerm key={index} word={part.word}>
        {part.text}
      </RuleTerm>
    ),
  );
}

export default RulesText;
