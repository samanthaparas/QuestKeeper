import {
  SRD_CREDITS,
  SOURCE_CREDITS,
  OGL_PARAGRAPHS,
  OGL_COPYRIGHT_NOTICES,
} from "../../utils/licenses";
import "./AttributionsPage.css";

// Credits every book QuestKeeper's game content comes from. The licenses
// require this: CC-BY-4.0 asks for the SRD credit, and the Open Game License
// asks for its full text plus each book's copyright notice (Section 15).
function AttributionsPage() {
  return (
    <main className="attributions">
      <section className="attributions__section">
        <h1 className="attributions__title">Attributions</h1>
        <p className="attributions__intro">
          Every race, class, background and spell in QuestKeeper comes from a
          freely licensed source. Each one is marked with a badge naming its
          book. This page credits those books and includes the licenses they
          ask us to share.
        </p>
      </section>

      <section className="attributions__section" aria-labelledby="srd-title">
        <h2 id="srd-title" className="attributions__heading">
          System Reference Documents
        </h2>
        {SRD_CREDITS.map((credit) => (
          <p className="attributions__text" key={credit.title}>
            {credit.notice}
          </p>
        ))}
      </section>

      <section className="attributions__section" aria-labelledby="books-title">
        <h2 id="books-title" className="attributions__heading">
          Open Game Content
        </h2>
        <p className="attributions__text">
          Extra races, subraces, backgrounds and subclasses come from these
          books through{" "}
          <a
            className="attributions__link"
            href="https://open5e.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open5e
          </a>
          . All of their game rules text is Open Game Content under the Open
          Game License 1.0a below.
        </p>

        <ul className="attributions__list">
          {SOURCE_CREDITS.map((source) => (
            <li key={source.label}>
              <a
                className="attributions__link"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.label}
              </a>{" "}
              by {source.publisher}
            </li>
          ))}
        </ul>
      </section>

      <section className="attributions__section" aria-labelledby="ogl-title">
        <h2 id="ogl-title" className="attributions__heading">
          OPEN GAME LICENSE Version 1.0a
        </h2>

        {/* Sections 1-14 are the license's own words, unchanged. */}
        <div className="attributions__license">
          {OGL_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}

          <p>15. COPYRIGHT NOTICE.</p>
          {OGL_COPYRIGHT_NOTICES.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
          <p>END OF LICENSE</p>
        </div>
      </section>

      <p className="attributions__note">
        QuestKeeper is an independent fan project. It is not affiliated with or
        endorsed by Wizards of the Coast, Kobold Press, Green Ronin Publishing
        or Open5e.
      </p>
    </main>
  );
}

export default AttributionsPage;
