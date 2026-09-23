import "./About.css";

function About() {
  return (
    <main className="about">
      <section className="about__hero">
        <h1 className="about__title">About QuestKeeper</h1>
        <p className="about__intro">
          QuestKeeper was created to provide Dungeons & Dragons players with a
          centralized reference library during character creation and gameplay.
          Instead of opening multiple browser tabs, players can quickly search
          and explore races, classes, backgrounds, and spells from a single
          application.
        </p>
      </section>

      <section className="about__credits" aria-labelledby="about-credits-title">
        <h2 id="about-credits-title" className="about__credits-title">
          Sources &amp; Attribution
        </h2>
        <p className="about__credits-text">
          Game content on QuestKeeper, including races, classes, backgrounds,
          feats, and spells, comes from the System Reference Document 5.1 (2014
          rules) and System Reference Document 5.2 (2024 rules) by Wizards of
          the Coast LLC. It is retrieved through the free{" "}
          <a
            className="about__link"
            href="https://www.dnd5eapi.co"
            target="_blank"
            rel="noopener noreferrer"
          >
            D&amp;D 5e API
          </a>
          . QuestKeeper adds an edition label to each entry so you can tell the
          2014 and 2024 rules apart.
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
        <p className="about__credits-note">
          QuestKeeper is an independent fan project. It is not affiliated with
          or endorsed by Wizards of the Coast.
        </p>
      </section>
    </main>
  );
}

export default About;
