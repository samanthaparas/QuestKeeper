import { Link } from "react-router-dom";
import PageBanner from "../../components/PageBanner/PageBanner";
import { CONTACT_EMAIL, FEEDBACK_URL, SITE_NAME, TERMS_UPDATED } from "../../utils/siteInfo";
import "./TermsPage.css";

// The terms of use, in plain English. It describes how the app works today;
// when that changes (paid plans, new kinds of content), change this page and
// TERMS_UPDATED in utils/siteInfo.js in the same commit.
function TermsPage() {
  return (
    <main className="terms">
      <PageBanner art="hearth" title="Terms of use">
        <p className="page-banner__description">
          The ground rules for using {SITE_NAME}, written to be read. Last updated {TERMS_UPDATED}.
        </p>
      </PageBanner>

      <section className="terms__section" aria-labelledby="terms-short">
        <h2 id="terms-short" className="terms__heading">
          The short version
        </h2>
        <ul className="terms__list">
          <li>Be kind and play fair. Don&apos;t use {SITE_NAME} to harass people or to break the law.</li>
          <li>What you write and upload is yours. You let us store it and show it to the people you choose.</li>
          <li>ItIt&apos;s a hobby project that I try hard to keep workingapos;s a small independent project that we try hard to keep working, but it comes as is, with no promises it will always be there.</li>
          <li>You can stop any time: delete your account in Settings.</li>
        </ul>
      </section>

      <section className="terms__section" aria-labelledby="terms-agree">
        <h2 id="terms-agree" className="terms__heading">
          Using {SITE_NAME}
        </h2>
        <p className="terms__text">
          By making an account or using the site, you agree to these terms and to the{" "}
          <Link to="/privacy">privacy page</Link>. If you don&apos;t agree, please don&apos;t use it. Browsing the
          rules, the quiz and the sample pages needs no account.
        </p>
        <p className="terms__text">
          You must be at least 13. If you&apos;re under the age of adulthood where you live, ask a parent or
          guardian before you sign up. Keep your password to yourself, and tell us if you think someone else has
          your account. You&apos;re responsible for what happens through it.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-content">
        <h2 id="terms-content" className="terms__heading">
          What you put in
        </h2>
        <p className="terms__text">
          Your characters, homebrew, notes, messages, handouts and pictures stay yours. To run the app, you give{" "}
          {SITE_NAME} permission to store them, copy them between your devices, and show them to the people you
          choose (your table, the people in a conversation). That permission ends when you delete the content or
          your account, apart from short-lived backups.
        </p>
        <p className="terms__text">
          Only put in what you have the right to use. Pictures and handouts you upload must be yours or
          something you&apos;re allowed to share. Please don&apos;t paste or upload the text of books you don&apos;t
          have the rights to share; write your own summaries instead.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-rules">
        <h2 id="terms-rules" className="terms__heading">
          What isn&apos;t okay
        </h2>
        <ul className="terms__list">
          <li>Harassing, threatening or bullying anyone, or sharing hateful, sexual or violent content involving real people, or anything involving children that isn&apos;t appropriate.</li>
          <li>Uploading anything illegal, or that you don&apos;t have the right to share.</li>
          <li>Trying to get into other people&apos;s accounts, tables or hidden information, or to break, overload or probe the site, or to get around its limits.</li>
          <li>Using automated tools to copy the site or to use the AI features beyond their limits.</li>
          <li>Pretending to be someone else, or using the site to send spam.</li>
        </ul>
        <p className="terms__text">
          Dungeon Masters: you run your own table. You&apos;re responsible for what happens there and for treating your
          players with respect. You can remove a player from your table at any time.
        </p>
        <p className="terms__text">
          If something breaks these rules, we may remove it, limit a feature, or close the account. Serious cases
          can be reported to the authorities. If you see something that doesn&apos;t belong, tell us (see the end of
          this page).
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-ai">
        <h2 id="terms-ai" className="terms__heading">
          The AI features
        </h2>
        <p className="terms__text">
          Search by meaning, &ldquo;Summarize for my group&rdquo; and session recaps use an AI service. Its answers
          can be wrong or miss the point, so check anything that matters against your own books and table rules.
          The summaries are meant to be in your own words, so don&apos;t use them to copy a published book. Use is
          limited each day so the service stays available for everyone.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-rules-content">
        <h2 id="terms-rules-content" className="terms__heading">
          The game rules and other people&apos;s work
        </h2>
        <p className="terms__text">
          {SITE_NAME} is an independent fan project. It is not made by, affiliated with, or endorsed by Wizards of
          the Coast or any publisher. The rules content comes from freely licensed sources, credited on the{" "}
          <Link to="/attributions">sources page</Link>, and each source&apos;s own license applies to it. Where
          the site links to a published book or a fan wiki, that is a link only: the content belongs to its
          owners.
        </p>
        <p className="terms__text">
          The look of the site, its code and its original text belong to its owner. You may use the site for your
          own games, but please don&apos;t copy it or present it as your own.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-money">
        <h2 id="terms-money" className="terms__heading">
          Cost
        </h2>
        <p className="terms__text">
          {SITE_NAME} is free to use today. If paid plans are added later, they&apos;ll be clearly marked, never
          charged without your say-so, and these terms will be updated first.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-asis">
        <h2 id="terms-asis" className="terms__heading">
          No promises, and limits on what we owe you
        </h2>
        <p className="terms__text">
          The site comes &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. It may have bugs, go down, or change,
          and features may be added, changed or removed. Keep a copy of anything you can&apos;t afford to lose: you
          can download your data in Settings. To the fullest extent the law allows, {SITE_NAME} isn&apos;t
          responsible for lost data, lost game sessions, or indirect or accidental losses from using it, and our
          total responsibility to you is limited to what you&apos;ve paid us, which today is nothing. Some places
          don&apos;t allow these limits, and then they apply only as far as the law permits.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-end">
        <h2 id="terms-end" className="terms__heading">
          Ending things
        </h2>
        <p className="terms__text">
          You can stop at any time by deleting your account in Settings. We may suspend or close accounts that
          break these terms, or close the site, and we&apos;ll try to give notice where we can and a chance to
          download your data.
        </p>
      </section>

      <section className="terms__section" aria-labelledby="terms-changes">
        <h2 id="terms-changes" className="terms__heading">
          Changes and questions
        </h2>
        <p className="terms__text">
          When these terms change in a way that matters, we&apos;ll update the date at the top and tell signed-in
          people. Continuing to use the site after a change means you accept it. These terms are governed by the
          laws of the place where the site&apos;s owner lives, and disputes go to the courts there, unless the law
          where you live says otherwise.
        </p>
        <p className="terms__text">
          Questions, or something to report?{" "}
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

export default TermsPage;
