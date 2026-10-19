import { Link } from "react-router-dom";
import "./About.css";

// What QuestKeeper does today (for players, DMs, and anyone deciding
// whether to look closer), then the sources and credits. Only describes
// what's built; plans aren't promised here.
function About() {
  return (
    <main className="about">
      <section className="about__hero">
        <h1 className="about__title">About QuestKeeper</h1>
        <p className="about__intro">
          QuestKeeper is a free companion for Dungeons &amp; Dragons 5th Edition. It turns rules into
          friendly, guided choices for new players, and keeps a whole table&apos;s characters and fights in
          one place during a game.
        </p>
      </section>

      <section className="about__section" aria-labelledby="about-does-title">
        <h2 id="about-does-title" className="about__section-title">
          What it does today
        </h2>
        <div className="about__grid">
          <article className="about__card">
            <h3>Reference</h3>
            <p>
              Races, classes, backgrounds, spells, feats and magic items from the free rules (SRD 5.1 and
              5.2) and openly licensed books, plus short summaries and links for the official books. Search
              by name, or by meaning (&ldquo;help me sneak past guards&rdquo;). Rules words explain
              themselves where they appear.
            </p>
          </article>
          <article className="about__card">
            <h3>Characters</h3>
            <p>
              A character quiz that suggests three builds, guided character creation, a level-up wizard, and
              a sheet that rolls dice, tracks hit points, spells, resources, inventory and companions. You
              can make and share your own homebrew options.
            </p>
          </article>
          <article className="about__card">
            <h3>Players</h3>
            <p>
              Join your DM&apos;s table with a code, see the turn order, attack monsters from your sheet, and
              keep notes in a shared journal with handouts from your DM.
            </p>
          </article>
          <article className="about__card">
            <h3>Dungeon Masters</h3>
            <p>
              Run a table: initiative, monsters whose HP and AC stay hidden from players, the party&apos;s
              health and conditions at a glance, and a monster library for your encounters.
            </p>
          </article>
        </div>
        <p className="about__try">
          Try it without an account: <Link to="/sample/character">a sample character sheet</Link>,{" "}
          <Link to="/sample/table">a sample DM table</Link>, or <Link to="/quiz">the character quiz</Link>.
        </p>
      </section>

      <section className="about__section" aria-labelledby="about-why-title">
        <h2 id="about-why-title" className="about__section-title">
          For recruiters and business owners
        </h2>
        <p>
          <strong>The problem:</strong> tabletop games lose new players to rulebook homework, and groups
          juggle paper sheets, browser tabs and spreadsheets during a session.{" "}
          <strong>The approach:</strong> plain-language guidance at every choice, and one shared place for
          the table, so the game keeps moving.
        </p>
        <p>
          It&apos;s built with React, Supabase (with row-level security keeping each person&apos;s data and
          the DM&apos;s secrets private), a Node API, and Claude for search by meaning and short rule
          summaries. Accessibility (WCAG 2.2 AA) is treated as a baseline, with automated checks plus
          keyboard and screen-reader testing.
        </p>
        <p className="about__try">
          See it in a minute: <Link to="/sample/table">the sample DM table</Link> or{" "}
          <Link to="/sample/character">the sample character sheet</Link>. The code is on{" "}
          <a
            className="about__link"
            href="https://github.com/samanthaparas/QuestKeeper"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </section>

      <section className="about__credits" aria-labelledby="about-credits-title">
        <h2 id="about-credits-title" className="about__credits-title">
          Sources &amp; Attribution
        </h2>
        <p className="about__credits-text">
          Game content on QuestKeeper, including races, classes, backgrounds, feats, and spells, comes from
          the System Reference Document 5.1 (2014 rules) and System Reference Document 5.2 (2024 rules) by
          Wizards of the Coast LLC. It is retrieved through the free{" "}
          <a className="about__link" href="https://www.dnd5eapi.co" target="_blank" rel="noopener noreferrer">
            D&amp;D 5e API
          </a>
          . QuestKeeper adds an edition label to each entry so you can tell the 2014 and 2024 rules apart.
        </p>
        <p className="about__credits-text">
          Both documents are licensed under the{" "}
          <a
            className="about__link"
            href="https://creativecommons.org/licenses/by/4.0/legalcode"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution 4.0 International License
          </a>
          .
        </p>
        <p className="about__credits-text">
          Extra races, subraces, backgrounds and subclasses come from Tome of Heroes (Kobold Press), the
          Tal'Dorei Campaign Setting (Green Ronin Publishing) and Open5e's own originals, through{" "}
          <a className="about__link" href="https://open5e.com" target="_blank" rel="noopener noreferrer">
            Open5e
          </a>
          , under the Open Game License 1.0a. Each option is badged with its book, and the full credits and
          license text are on the{" "}
          <Link className="about__link" to="/attributions">
            Attributions page
          </Link>
          .
        </p>
        <p className="about__credits-text">
          Found a mistake or something missing? Please{" "}
          <a
            className="about__link"
            href="https://github.com/samanthaparas/QuestKeeper/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            tell us on GitHub
          </a>
          .
        </p>
        <p className="about__credits-note">
          QuestKeeper is an independent fan project. It is not affiliated with or endorsed by Wizards of the
          Coast.
        </p>
      </section>
    </main>
  );
}

export default About;
