import { splitRulesWords } from "../../utils/rulesWords";
import RuleTerm from "./RuleTerm";

// A block of rules text with its rules words ("advantage", "saving throw",
// "prone"...) explained on hover. Each word is marked the first time it
// appears in the text.
//
// withLists: the text keeps its line breaks, and lines starting with "- "
// become a bulleted list (the SRD writes lists that way). Only for places
// where a list is allowed, like inside a list item.
function RulesText({ text, withLists = false }) {
  if (!text) return null;
  if (withLists && /^- /m.test(text)) return <RulesBlocks text={text} />;
  return <RulesWords text={text} />;
}

function RulesWords({ text }) {
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

// Plain lines as short blocks; runs of "- " lines as one bulleted list.
function RulesBlocks({ text }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const bullet = line.match(/^- (.*)/);
    const last = blocks[blocks.length - 1];
    if (bullet && last?.type === "list") last.items.push(bullet[1]);
    else if (bullet) blocks.push({ type: "list", items: [bullet[1]] });
    else if (line.trim()) blocks.push({ type: "line", text: line });
  }

  return blocks.map((block, index) =>
    block.type === "list" ? (
      <ul className="rules-text__list" key={index}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            <RulesWords text={item} />
          </li>
        ))}
      </ul>
    ) : (
      <span className="rules-text__line" key={index}>
        <RulesWords text={block.text} />
      </span>
    ),
  );
}

export default RulesText;
