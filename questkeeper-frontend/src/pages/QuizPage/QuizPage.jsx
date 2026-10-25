import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { QUESTIONS } from "../../utils/quizData";
import {
  MIN_ANSWERS,
  answeredCount,
  quizResults,
} from "../../utils/quizScoring";
import { getClassIcon, getRaceIcon } from "../../utils/icons";
import PageBanner from "../../components/PageBanner/PageBanner";
import Button from "../../components/Button/Button";
import "./QuizPage.css";

const STORAGE_KEY = "qk-quiz-answers";
const EMPTY = QUESTIONS.map(() => null);

// Answers are kept for this browser tab, so leaving to read about a class
// and coming back doesn't lose them.
function loadAnswers() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length === QUESTIONS.length
      ? saved
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function saveAnswers(answers) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // Not saved; the quiz still works.
  }
}

const ABILITY_WORDS = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

// Not sure what to play? Up to 20 quick questions (any can be skipped), then
// three builds that fit, each ready to fill in character creation.
// Arriving from character creation brings the hero's name along.
function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const heroName = location.state?.name ?? "";
  const [answers, setAnswers] = useState(loadAnswers);
  const firstUnanswered = answers.findIndex((choice) => choice == null);
  // The results have their own address (/quiz?view=results), so the
  // browser's Back button returns to them from a book page.
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(() =>
    answeredCount(answers) > 0 ? "question" : "intro",
  );
  const view =
    searchParams.get("view") === "results" &&
    answeredCount(answers) >= MIN_ANSWERS
      ? "results"
      : step;

  // Showing the results is a new page in the browser's history; leaving them
  // goes back to the questions. The hero's name (from character creation)
  // comes along either way.
  function setView(next) {
    if (next === "results") {
      setSearchParams({ view: "results" }, { state: location.state });
    } else {
      setStep(next);
      if (searchParams.get("view"))
        setSearchParams({}, { state: location.state });
    }
  }
  const [index, setIndex] = useState(() =>
    firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered,
  );
  const answered = answeredCount(answers);

  useEffect(() => saveAnswers(answers), [answers]);

  function choose(choice) {
    const next = answers.map((value, position) =>
      position === index ? choice : value,
    );
    setAnswers(next);
    if (index < QUESTIONS.length - 1) setIndex(index + 1);
    else setView("results");
  }

  function skip() {
    if (index < QUESTIONS.length - 1) setIndex(index + 1);
    else setView(answered >= MIN_ANSWERS ? "results" : "question");
  }

  function startOver() {
    setAnswers(EMPTY);
    setIndex(0);
    setView("intro");
  }

  // 1-4 on the keyboard picks an answer.
  useEffect(() => {
    if (view !== "question") return undefined;
    function handleKey(event) {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      )
        return;
      const number = Number(event.key);
      if (number >= 1 && number <= QUESTIONS[index].answers.length)
        choose(number - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  function applyBuild(build) {
    navigate("/characters/new", {
      state: { quizBuild: build.id, name: heroName },
    });
  }

  if (view === "intro") {
    return (
      <main className="quiz">
        <PageBanner art="wilderness" eyebrow="Not sure what to play?" title="Find your character" className="quiz__banner">
          <p className="page-banner__description">
            Answer up to {QUESTIONS.length} quick questions about how you&apos;d
            handle a few situations and how you like to play. Skip any
            you&apos;re not sure about. You&apos;ll get three builds that fit
            you, and one tap fills them into character creation.
          </p>
        </PageBanner>
        <section className="quiz__card quiz__intro">
          <p className="quiz__note">
            There are no wrong answers. Pick what sounds the most fun.
          </p>
          <Button onClick={() => setView("question")}>Start the quiz</Button>
        </section>
      </main>
    );
  }

  if (view === "results") {
    const { chips, results } = quizResults(answers);
    return (
      <main className="quiz">
        <PageBanner art="wilderness" eyebrow="Your results" title="Three heroes that fit you">
          {chips.length > 0 && (
            <p className="quiz__chips">
              <span>Your play style:</span>
              {chips.map((chip) => (
                <span key={chip} className="quiz__chip">
                  {chip}
                </span>
              ))}
            </p>
          )}
        </PageBanner>

        <ol className="quiz__results">
          {results.map((result) => (
            <ResultCard
              key={result.build.id}
              result={result}
              onUse={() => applyBuild(result.build)}
            />
          ))}
        </ol>

        <div className="quiz__footer">
          <Button variant="secondary" onClick={() => setView("question")}>
            Change my answers
          </Button>
          <Button variant="secondary" onClick={startOver}>
            Start over
          </Button>
        </div>
      </main>
    );
  }

  const question = QUESTIONS[index];
  return (
    <main className="quiz">
      <section className="quiz__card" aria-labelledby="quiz-question">
        <div className="quiz__progress" aria-hidden="true">
          <span style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="quiz__meta">
          <span>{question.group}</span>
          <span>
            Question {index + 1} of {QUESTIONS.length}
          </span>
        </p>
        <h1 id="quiz-question" className="quiz__question">
          {question.text}
        </h1>

        <div className="quiz__answers">
          {question.answers.map(([text], choice) => (
            <button
              key={text}
              type="button"
              className={`quiz__answer${answers[index] === choice ? " quiz__answer--chosen" : ""}`}
              aria-pressed={answers[index] === choice}
              onClick={() => choose(choice)}
            >
              <span className="quiz__answer-key" aria-hidden="true">
                {choice + 1}
              </span>
              {text}
            </button>
          ))}
        </div>

        <div className="quiz__nav">
          <Button
            variant="secondary"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Back
          </Button>
          <Button variant="secondary" onClick={skip}>
            Skip
          </Button>
          <Button
            disabled={answered < MIN_ANSWERS}
            onClick={() => setView("results")}
          >
            See my results
          </Button>
        </div>
        {answered < MIN_ANSWERS && (
          <p className="quiz__note">
            Answer at least {MIN_ANSWERS} to see results ({answered} so far).
          </p>
        )}
      </section>
    </main>
  );
}

// One suggested build: what it is, why it fits, and what to read about next.
function ResultCard({ result, onUse }) {
  const { build } = result;
  const raceIcon =
    getRaceIcon(build.race.subrace ?? build.race.index) ??
    getRaceIcon(build.race.index);
  const classIcon = getClassIcon(build.class.index);

  return (
    <li className="quiz__result">
      <div className="quiz__result-head">
        <span className="quiz__match">{result.label}</span>
        <span className="quiz__difficulty">{build.difficulty} to play</span>
      </div>
      <div className="quiz__result-title">
        <span className="quiz__icons" aria-hidden="true">
          {raceIcon && <img src={raceIcon} alt="" />}
          {classIcon && <img src={classIcon} alt="" />}
        </span>
        <div>
          <h2 className="quiz__build-name">{build.name}</h2>
          <p className="quiz__build-line">
            {build.race.label} {build.class.label}
          </p>
        </div>
      </div>
      <p className="quiz__feel">{build.feel}</p>

      <dl className="quiz__facts">
        <div>
          <dt>Race</dt>
          <dd>
            {build.race.label} <small>{build.race.source}</small>
          </dd>
        </div>
        <div>
          <dt>Class</dt>
          <dd>{build.class.label}</dd>
        </div>
        <div>
          <dt>Subclass</dt>
          <dd>
            {build.subclass
              ? `${build.subclass.label}, chosen at level 1`
              : `Picked at level ${result.subclassLevel}, like ${result.srdSubclass}`}
          </dd>
        </div>
        <div>
          <dt>Background</dt>
          <dd>
            {build.background.label} <small>{build.background.source}</small>
          </dd>
        </div>
        <div>
          <dt>Best scores</dt>
          <dd>
            {build.abilities.map((short) => ABILITY_WORDS[short]).join(" and ")}
          </dd>
        </div>
      </dl>

      {result.reasons.length > 0 && (
        <div className="quiz__why">
          <h3>Why it fits</h3>
          <ul>
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Named for its build, so the three buttons are told apart by
          screen readers. It starts with the words on the button, so voice
          control ("click Use this build") still finds it. */}
      <Button className="quiz__use" onClick={onUse} aria-label={`Use this build: ${build.name}`}>
        Use this build
      </Button>

      {(result.bookRace || result.bookBackground || result.bookSubclass) && (
        <div className="quiz__books">
          <h3>Also worth a look, from the books</h3>
          <p className="quiz__note">
            Official options QuestKeeper can tell you about and link to. To play
            one, make it as homebrew from its page.
          </p>
          <ul>
            {result.bookRace && (
              <BookPick
                kind="Race"
                entry={result.bookRace}
                to={`/races?open=${result.bookRace.index}`}
              />
            )}
            {result.bookBackground && (
              <BookPick
                kind="Background"
                entry={result.bookBackground}
                to={`/backgrounds?open=${result.bookBackground.index}&edition=2014`}
              />
            )}
            {result.bookSubclass && (
              <BookPick
                kind={`${build.class.label} subclass`}
                entry={result.bookSubclass}
                to={`/classes?open=${build.class.index}&subclass=${result.bookSubclass.index}`}
              />
            )}
          </ul>
        </div>
      )}
    </li>
  );
}

// A book option worth reading about. Its page shows "Back to your quiz
// results", and the browser's Back button returns here too.
function BookPick({ kind, entry, to }) {
  return (
    <li className="quiz__book">
      <span className="quiz__book-kind">{kind}</span>
      <Link
        className="quiz__book-name"
        to={to}
        state={{
          backTo: "/quiz?view=results",
          backLabel: "Back to your quiz results",
        }}
      >
        {entry.name}
      </Link>
      <span className="quiz__book-summary">{entry.summary}</span>
    </li>
  );
}

export default QuizPage;
