import { Link } from "react-router-dom";
import PageBanner from "../../components/PageBanner/PageBanner";
import { CONTACT_EMAIL, ERROR_REPORTING_ON, FEEDBACK_URL, PRIVACY_UPDATED, SITE_NAME } from "../../utils/siteInfo";
import "./PrivacyPage.css";

// The privacy policy, in plain English. It describes what the app really does
// today; when that changes (an analytics tool, payments), change this page and
// PRIVACY_UPDATED in utils/siteInfo.js in the same commit.
function PrivacyPage() {
  return (
    <main className="privacy">
      <PageBanner art="hearth" title="Privacy">
        <p className="page-banner__description">
          What {SITE_NAME} keeps about you, who can see it, and how to take it back. Last updated{" "}
          {PRIVACY_UPDATED}.
        </p>
      </PageBanner>

      <section className="privacy__section" aria-labelledby="privacy-short">
        <h2 id="privacy-short" className="privacy__heading">
          The short version
        </h2>
        <ul className="privacy__list">
          <li>You make an account with an email and password. We keep what you build here: characters, notes, tables and messages.</li>
          <li>Your game group can see what your table shares. Your private journal notes stay yours.</li>
          <li>We don&apos;t sell your information, show ads, or track you around the web.</li>
          <li>You can download your data or delete your account yourself, any time, in Settings.</li>
        </ul>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-collect">
        <h2 id="privacy-collect" className="privacy__heading">
          What we keep
        </h2>
        <ul className="privacy__list">
          <li>
            <strong>Your account:</strong> your email address, a display name if you add one, and your password.
            The login service keeps your password in a scrambled form, so even we can&apos;t read it.
          </li>
          <li>
            <strong>What you make:</strong> your characters, homebrew, journal notes, the messages you send,
            handouts and pictures you upload (such as character portraits), and the tables you run or join.
          </li>
          <li>
            <strong>On your own device:</strong> your sign-in, a saved copy of the character you are editing (so
            changes survive a weak connection), and your choices such as appearance, text size and, if you tick
            &ldquo;Remember my email&rdquo;, your email. Never your password.
          </li>
          <li>
            <strong>Technical records:</strong> like any website, the hosting services see your device&apos;s
            internet address and basic request details in their logs, so the site can run safely.
          </li>
        </ul>
        <p className="privacy__text">
          We don&apos;t collect payment details (there are no payments today), your location, your contacts, or
          anything from your camera or microphone.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-see">
        <h2 id="privacy-see" className="privacy__heading">
          Who can see what
        </h2>
        <ul className="privacy__list">
          <li>The Dungeon Master of a table you join can read the characters seated at their table (they can&apos;t change them), and sees what the table tracks.</li>
          <li>Other people at the table see what the table shares, such as the party strip, the turn order, handouts the DM reveals, and notes marked for the whole table.</li>
          <li>Messages can be read only by the people in that conversation.</li>
          <li>Notes marked &ldquo;Just me&rdquo; can be read only by you.</li>
          <li>Homebrew is visible to you, and to the tables and people you choose to share it with.</li>
          <li>
            Character portraits are stored with a web link that is hard to guess but works for anyone who has it.
            Handout and message pictures are private to the people they&apos;re for.
          </li>
        </ul>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-helpers">
        <h2 id="privacy-helpers" className="privacy__heading">
          Services that help us run it
        </h2>
        <p className="privacy__text">
          {SITE_NAME} is built on a few other services. They handle your information only to run the app for us.
        </p>
        <ul className="privacy__list">
          <li>
            <strong>Supabase</strong> keeps accounts, the database and uploaded files, and sends sign-up and
            password-reset emails.
          </li>
          <li>
            <strong>Render</strong> hosts the website and the server behind it.
          </li>
          <li>
            <strong>Anthropic</strong> powers the optional AI features (search by meaning, &ldquo;Summarize for my
            group&rdquo; and session recaps). Only what a feature needs is sent: the words you searched, the rules
            text you pasted, or the notes shared with your whole table for a recap. Private notes and character
            sheets are never sent. We don&apos;t keep a copy of what is sent. What Anthropic does with it is
            covered by{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
              its own privacy terms
            </a>
            .
          </li>
          {ERROR_REPORTING_ON && (
            <li>
              <strong>Sentry</strong> receives an error report when something breaks in your browser, so it can be
              fixed. A report holds the error, the page (without any code in its address), your browser type and the
              version of the site. It holds no passwords, notes or character details, and nothing is recorded about
              how you use the site.
            </li>
          )}
          <li>
            <strong>Google Fonts</strong> supplies the website&apos;s lettering, so your browser contacts Google
            when a page loads.
          </li>
          <li>
            The rules themselves come from the free D&amp;D reference services listed on the{" "}
            <Link to="/attributions">sources page</Link>. None of your information is sent to them.
          </li>
        </ul>
        <p className="privacy__text">
          Our providers may store and process information in the United States and other countries.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies" className="privacy__heading">
          Cookies and tracking
        </h2>
        <p className="privacy__text">
          We only use what the site needs to work: your sign-in and your saved choices, kept in your browser. There
          are no advertising or tracking cookies and no analytics tools at the moment. If that ever changes, this
          page will say so first.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-keep">
        <h2 id="privacy-keep" className="privacy__heading">
          How long we keep it
        </h2>
        <p className="privacy__text">
          We keep your information for as long as your account exists. When you delete your account, your
          characters, notes, messages, homebrew and pictures are deleted with it, and any tables you run are
          deleted for their players too. Our database provider may hold a protective backup for a short time
          afterwards, which then expires on its own.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-choices">
        <h2 id="privacy-choices" className="privacy__heading">
          Your choices
        </h2>
        <ul className="privacy__list">
          <li>
            <strong>See and take your data:</strong> Settings &rarr; Your data &rarr; Download my data.
          </li>
          <li>
            <strong>Delete it:</strong> Settings &rarr; Your data &rarr; Delete my account. It happens right away
            and can&apos;t be undone.
          </li>
          <li>
            <strong>Change it:</strong> your name, email and password are in <Link to="/settings">Settings</Link>.
            Characters and notes can be edited or deleted where you made them.
          </li>
        </ul>
        <p className="privacy__text">
          If you live somewhere with privacy laws that give you more rights (for example the EU, the UK or
          California), such as correcting or restricting your data, or objecting to how it&apos;s used, contact us
          and we&apos;ll help.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-kids">
        <h2 id="privacy-kids" className="privacy__heading">
          Children
        </h2>
        <p className="privacy__text">
          {SITE_NAME} isn&apos;t meant for children under 13, and we don&apos;t knowingly keep their information.
          If you think a child under 13 has an account, contact us and we&apos;ll delete it.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-safe">
        <h2 id="privacy-safe" className="privacy__heading">
          Keeping it safe
        </h2>
        <p className="privacy__text">
          Everything travels over an encrypted connection, passwords are stored scrambled, and the database is set
          up so each person can only reach what they&apos;re allowed to see. No service is perfectly secure, so use a
          password you don&apos;t use anywhere else.
        </p>
      </section>

      <section className="privacy__section" aria-labelledby="privacy-changes">
        <h2 id="privacy-changes" className="privacy__heading">
          Changes and questions
        </h2>
        <p className="privacy__text">
          When this page changes in a way that matters, we&apos;ll update the date at the top and tell signed-in
          people. Questions, or want something deleted that you can&apos;t reach?{" "}
          {CONTACT_EMAIL ? (
            <>
              Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </>
          ) : (
            <>
              Use the{" "}
              <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
                feedback link
              </a>
              .
            </>
          )}
        </p>
      </section>
    </main>
  );
}

export default PrivacyPage;
