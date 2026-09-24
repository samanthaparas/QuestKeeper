import { Link } from "react-router-dom";
import DiceRoller from "../../components/DiceRoller/DiceRoller";
import {
  ABILITY_SCORES,
  ABILITY_LABELS,
  ABILITY_ABBREVIATIONS,
  getAbilityModifier,
  formatModifier,
} from "../../utils/characterSheet";
import "./Guide.css";

const SECTIONS = [
  { id: "dice", label: "Dice" },
  { id: "abilities", label: "Abilities" },
  { id: "turns", label: "Your turn" },
  { id: "choices", label: "Your choices" },
];

const SCORE_BANDS = [6, 8, 10, 12, 14, 16, 18, 20].map((low) => ({
  range: low === 20 ? "20" : `${low}–${low + 1}`,
  modifier: formatModifier(getAbilityModifier(low)),
}));

const FRIENDLY_ABILITY_DESCRIPTIONS = {
  strength:
    "Your raw physical power. Think lifting a heavy gate, climbing a cliff, grappling an enemy, or swinging a heavy weapon.",
  dexterity:
    "Your agility, balance, and reflexes. It helps with sneaking, ranged attacks, initiative, and avoiding hits.",
  constitution:
    "Your health and stamina. It affects your hit points and helps you push through poison, exhaustion, and other rough days.",
  intelligence:
    "Your memory and book smarts. Use it to recall lore, investigate clues, and understand arcane magic.",
  wisdom:
    "Your awareness and instincts. It helps you notice danger, read people, handle animals, and survive in the wild.",
  charisma:
    "Your presence and force of personality. Use it to persuade, perform, intimidate, deceive, or cast magic through sheer confidence.",
};

function scrollToSection(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Guide() {
  return (
    <main className="guide">
      <section className="guide__hero">
        <span className="guide__eyebrow">New to D&amp;D?</span>
        <h1 className="guide__title">Learn the Basics</h1>
        <p className="guide__intro">
          New game, strange dice, a character sheet full of numbers. You do not
          have to memorize all of D&amp;D before you play. This guide covers
          what you need for your first session, and explains the unfamiliar
          words as soon as they show up.
        </p>
        <nav className="guide__contents" aria-label="Guide sections">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className="guide__chip"
              onClick={() => scrollToSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </section>

      <section
        id="dice"
        className="guide__section"
        aria-labelledby="dice-title"
      >
        <h2 id="dice-title" className="guide__section-title">
          First, meet the dice
        </h2>
        <p>
          D&amp;D names dice by their number of sides. The letter{" "}
          <strong>d </strong>
          just means “die,” so a <strong>d6</strong> is the familiar six-sided
          one and a <strong>d20</strong> is the pointy twenty-sided one you will
          roll constantly.
        </p>

        <p className="guide__example">
          <strong>How to read dice shorthand:</strong> If something deals{" "}
          <strong>2d6+3</strong> damage, roll two d6s, add them together, then
          add 3. That is it, no secret wizard math hiding in there.
        </p>

        <h3 className="guide__subheading">The “does this work?” roll</h3>
        <p>
          Most uncertain moments use the same recipe: roll a d20, add the number
          your character is good at, and compare the total to a target. Meet or
          beat the target and you succeed.
        </p>

        <ul className="guide__list">
          <li>
            When you attack, the target is the enemy&apos;s{" "}
            <strong>Armor Class (AC)</strong>. This just means how hard they are
            to hit.
          </li>
          <li>
            For something like climbing a wall or spotting a hidden door, the
            target is a <strong>Difficulty Class (DC)</strong>. This is the
            number you need to meet or beat.
          </li>
        </ul>

        <p className="guide__aside">
          <strong>Who picks the DC?</strong> Usually your <strong>DM</strong>,
          or Dungeon Master: the person describing the world, playing its
          characters and monsters, and helping everyone use the rules. Think
          narrator, referee, and professional maker-of-suspicious-noises.
        </p>

        <h3 className="guide__subheading">Advantage and disadvantage</h3>
        <p>
          If the situation is helping you, you may get{" "}
          <strong>advantage</strong>: roll two d20s and keep the higher result.
          If the situation is making things harder, you may have{" "}
          <strong>disadvantage</strong>: roll two and keep the lower result. If
          you somehow have both, they cancel each other out and you roll one d20
          as usual.
        </p>

        <h3 className="guide__subheading">Natural 20s and 1s</h3>
        <p>
          A “natural” roll means the number showing on the die before you add
          anything. On an attack, a <strong>natural 20</strong> always hits and
          becomes a <strong>critical hit</strong>, often shortened to “crit.”
          Roll the attack&apos;s damage dice twice, then add your normal
          modifier once. A natural 1 on an attack always misses. It happens to
          every hero eventually. Sometimes spectacularly.
        </p>

        <p className="guide__aside">
          <strong>Good to know:</strong> Natural 20s and 1s are automatic
          success or failure on attack rolls. Ability checks and saving throws
          still use the final total unless a feature or your table&apos;s rules
          say otherwise.
        </p>

        <h3 className="guide__subheading">Things you may hear at the table</h3>
        <dl className="guide__lingo">
          <div>
            <dt>“Roll to hit.”</dt>
            <dd>Make an attack roll against the target&apos;s AC.</dd>
          </div>
          <div>
            <dt>“Make a check.”</dt>
            <dd>Roll a d20 and add the ability or skill the DM names.</dd>
          </div>
          <div>
            <dt>“What&apos;s the DC?”</dt>
            <dd>Someone is asking what total they need to succeed.</dd>
          </div>
        </dl>

        <DiceRoller />
      </section>

      <section
        id="abilities"
        className="guide__section"
        aria-labelledby="abilities-title"
      >
        <h2 id="abilities-title" className="guide__section-title">
          Your six abilities
        </h2>
        <p>
          Abilities are six broad ways the game describes what your character is
          good at. Each has a score, usually between 8 and 20, plus a smaller{" "}
          <strong>modifier</strong>. The modifier is the number you will usually
          add to a d20 roll.
        </p>

        <p className="guide__example">
          <strong>Example:</strong> Lyra has 16 Charisma, which gives her a +3
          Charisma modifier. If the DM asks for a Charisma check, she rolls a
          d20 and adds 3.
        </p>

        <ul className="guide__abilities">
          {ABILITY_SCORES.map((ability) => (
            <li className="guide__ability" key={ability}>
              <span className="guide__ability-abbr">
                {ABILITY_ABBREVIATIONS[ability]}
              </span>
              <span>
                <span className="guide__ability-name">
                  {ABILITY_LABELS[ability]}.
                </span>{" "}
                {FRIENDLY_ABILITY_DESCRIPTIONS[ability]}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="guide__subheading">From score to modifier</h3>
        <p>
          You do not need to memorize this table. Your character sheet does the
          math for you; it is here for the curious adventurers who want to know
          where that little +2 came from.
        </p>
        <div className="guide__table-wrapper">
          <table className="guide__table">
            <thead>
              <tr>
                <th scope="row">Score</th>
                {SCORE_BANDS.map((band) => (
                  <th scope="col" key={band.range}>
                    {band.range}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Modifier</th>
                {SCORE_BANDS.map((band) => (
                  <td key={band.range}>{band.modifier}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="guide__subheading">Proficiency</h3>
        <p>
          <strong>Proficient</strong> is D&amp;D&apos;s way of saying “trained
          in this.” Your class and background give you proficiency in certain
          skills, saving throws, weapons, or tools. When proficiency applies,
          add your proficiency bonus too. It starts at +2 and grows as your
          character levels up.
        </p>

        <dl className="guide__lingo">
          <div>
            <dt>Skill check</dt>
            <dd>
              A roll to attempt something, such as sneaking, persuading, or
              searching a room.
            </dd>
          </div>
          <div>
            <dt>Saving throw, or “save”</dt>
            <dd>
              A defensive roll to resist something happening to you, such as
              poison, a spell, or a dragon&apos;s breath.
            </dd>
          </div>
          <div>
            <dt>Modifier</dt>
            <dd>The plus or minus number you add to the roll.</dd>
          </div>
        </dl>
      </section>

      <section
        id="turns"
        className="guide__section"
        aria-labelledby="turns-title"
      >
        <h2 id="turns-title" className="guide__section-title">
          What happens on your turn?
        </h2>
        <p>
          Combat is divided into <strong>rounds</strong>. One round represents
          about six seconds in the story, during which everyone gets a turn. At
          the start, everyone rolls <strong>initiative</strong>, a d20 plus
          their Dexterity modifier, to decide the turn order.
        </p>

        <p className="guide__example">
          <strong>The short version:</strong> On your turn, you can move, take
          one action, and maybe use a bonus action. You do not have to use all
          of them, and you can always ask, “What can I do from here?”
        </p>

        <h3 className="guide__subheading">On your turn, you can</h3>
        <ul className="guide__list">
          <li>
            <strong>Move</strong> up to your speed, usually 30 feet. You can
            split it up, moving some before your action and some after.
          </li>
          <li>
            <strong>Take one action.</strong> The most common are Attack, Cast a
            Spell, Dash (move up to your speed again), Disengage (move away
            without inviting an opportunity attack), Dodge (make attacks against
            you harder), Help (give an ally advantage), Hide, and Use an Object.
          </li>
          <li>
            <strong>Use a bonus action</strong> if one of your spells or
            features says it uses a bonus action. You do not automatically have
            to find something to spend it on every turn.
          </li>
          <li>
            <strong>Interact with one object</strong> for free, like drawing a
            sword or opening a door.
          </li>
        </ul>

        <h3 className="guide__subheading">Off your turn</h3>
        <p>
          You can take one <strong>reaction</strong> between the start of your
          turn and the start of your next turn, but only when something triggers
          it. The most common is an <strong>opportunity attack</strong>: a melee
          attack you can make when an enemy carelessly leaves your reach.
        </p>

        <p className="guide__tip">
          <strong>Friendly table tip:</strong> While someone else is taking
          their turn, look over your attacks or spells and pick a first choice.
          Plans may change and D&amp;D loves chaos, but you will feel much less
          put on the spot when your name comes up.
        </p>
      </section>

      <section
        id="choices"
        className="guide__section"
        aria-labelledby="choices-title"
      >
        <h2 id="choices-title" className="guide__section-title">
          The big character choices
        </h2>
        <p>
          Character creation has a lot of smaller decisions, but three choices
          shape most of your hero: race, class, and background. QuestKeeper
          walks you through them one at a time. You are not expected to know the
          “best build,” and there is no test at the end—choose what sounds fun
          to play.
        </p>

        <div className="guide__choices">
          <div className="guide__choice">
            <h3 className="guide__choice-title">Race</h3>
            <p>
              Your character&apos;s people and heritage. It may affect their
              size, speed, abilities, and special traits.{" "}
              <strong>Darkvision</strong>, for example, means seeing in darkness
              better than most people, not seeing perfectly with the lights off.
            </p>
            <Link className="guide__link" to="/races">
              Browse races
            </Link>
          </div>

          <div className="guide__choice">
            <h3 className="guide__choice-title">Class</h3>
            <p>
              What your character does as an adventurer: fight, heal, sneak,
              cast spells, support friends, or mix a few together. Your class
              determines things like hit points, equipment training, and your
              major features. If someone asks, “What do you play?” they usually
              mean your class.
            </p>
            <Link className="guide__link" to="/classes">
              Browse classes
            </Link>
          </div>

          <div className="guide__choice">
            <h3 className="guide__choice-title">Background</h3>
            <p>
              Who you were before the adventure began. A background provides
              useful training, equipment, and story hooks. They're ideas your DM
              can use to connect your character to the world.
            </p>
            <Link className="guide__link" to="/backgrounds">
              Browse backgrounds
            </Link>
          </div>
        </div>

        <div className="guide__aside guide__aside--spaced">
          <h3 className="guide__choice-title">And then what?</h3>
          <p>
            You will assign ability scores, choose skills, collect starting
            equipment, and if your class uses magic, you pick spells. A{" "}
            <strong>cantrip</strong> is a small spell you can cast without using
            a spell slot. A <strong>spell slot</strong> is a limited use of
            leveled magic; think of it like magical energy you spend and regain
            after resting.
          </p>
          <p>
            QuestKeeper handles the totals and shows how many choices you need.
            If you are unsure, pick the option that sounds the most fun. Your
            first character does not need to be perfect to become memorable.
          </p>
        </div>

        <Link className="guide__cta" to="/characters/new">
          Build your hero
        </Link>
      </section>
    </main>
  );
}

export default Guide;
