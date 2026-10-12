// Scoring for the character quiz: add up the answers into one play-style
// mix, see how the player LEANS compared with someone answering at random,
// then compare that lean with each build's mix. The top three come from three
// different classes, so the results feel varied. Tuned with 20,000 simulated
// players so every class turns up about as often as the others.

import { BOOK_TAGS, BUILDS, QUESTIONS, SUBCLASS_AT, TRAITS } from "./quizData";
import { BOOK_BACKGROUNDS } from "./bookBackgrounds";
import { BOOK_RACES } from "./bookRaces";
import { BOOK_SUBCLASSES } from "./bookSubclasses";

const TRAIT_KEYS = Object.keys(TRAITS);

// Results need a few answers to mean anything.
export const MIN_ANSWERS = 5;
export const MATCH_LABELS = ["Best match", "Strong match", "Worth a look"];

// answers: one entry per question, the chosen answer's position or null.
export function totalsFor(answers) {
  const totals = Object.fromEntries(TRAIT_KEYS.map((key) => [key, 0]));
  answers.forEach((choice, question) => {
    if (choice == null) return;
    for (const [key, points] of Object.entries(
      QUESTIONS[question].answers[choice][1],
    )) {
      totals[key] += points;
    }
  });
  return totals;
}

// Some styles turn up in lots of answers (Front line) and some in only a few
// (Truly unusual). Dividing by the square root of the points each can reach
// keeps the common ones from crowding out the rest, without letting the rare
// ones take over.
const REACHABLE = Object.fromEntries(
  TRAIT_KEYS.map((key) => [
    key,
    QUESTIONS.reduce(
      (sum, question) =>
        sum +
        Math.max(
          0,
          ...question.answers.map(([, weights]) => Math.abs(weights[key] ?? 0)),
        ),
      0,
    ) || 1,
  ]),
);

// What a random answerer would score on each question. Measuring against
// this means builds that mix many styles (Paladins) don't win just by being
// average.
const AVERAGE_PER_QUESTION = QUESTIONS.map((question) =>
  Object.fromEntries(
    TRAIT_KEYS.map((key) => [
      key,
      question.answers.reduce(
        (sum, [, weights]) => sum + (weights[key] ?? 0),
        0,
      ) / question.answers.length,
    ]),
  ),
);

// How far the player leans toward each style, compared with random answers.
export function leanFor(answers) {
  const totals = totalsFor(answers);
  const answered = answers
    .map((choice, question) => (choice == null ? null : question))
    .filter((q) => q !== null);
  return Object.fromEntries(
    TRAIT_KEYS.map((key) => {
      const average = answered.reduce(
        (sum, question) => sum + AVERAGE_PER_QUESTION[question][key],
        0,
      );
      return [key, (totals[key] - average) / Math.sqrt(REACHABLE[key])];
    }),
  );
}

// How closely two style mixes point the same way (1 = exactly), missing
// styles counting as 0.
export function cosine(a, b) {
  let dot = 0;
  let x = 0;
  let y = 0;
  for (const key of TRAIT_KEYS) {
    const p = a[key] ?? 0;
    const q = b[key] ?? 0;
    dot += p * q;
    x += p * p;
    y += q * q;
  }
  return x && y ? dot / Math.sqrt(x * y) : 0;
}

// The three best builds, each from a different class.
export function topBuilds(lean, count = 3) {
  const ranked = BUILDS.map((build) => ({
    build,
    score: cosine(lean, build.traits),
  })).sort((a, b) => b.score - a.score);
  const picked = [];
  for (const entry of ranked) {
    if (
      picked.some(
        (other) => other.build.class.index === entry.build.class.index,
      )
    )
      continue;
    picked.push(entry);
    if (picked.length === count) break;
  }
  return picked;
}

// The book option that fits both the player and the build, skipping ones a
// higher result already suggested. buildWeight: how much the build's own
// style counts next to the answers.
function bookPickFor(entries, tags, lean, build, used, buildWeight) {
  return (
    entries
      .filter((entry) => tags[entry.index] && !used.has(entry.index))
      .map((entry) => ({
        entry,
        score:
          cosine(lean, tags[entry.index]) +
          buildWeight * cosine(build.traits, tags[entry.index]),
      }))
      .sort((a, b) => b.score - a.score)[0]?.entry ?? null
  );
}

// The two or three styles where the player and the build agree most.
export function reasonsFor(lean, build) {
  return (
    TRAIT_KEYS.map((key) => ({
      key,
      weight: lean[key] * (build.traits[key] ?? 0),
    }))
      // Both leaning away from a style (no magic, please) counts as a match
      // too, said the other way round; a style without a "leaning away" line
      // is left out.
      .filter(
        (reason) =>
          reason.weight > 0 &&
          (lean[reason.key] > 0 || TRAITS[reason.key].negWhy),
      )
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(({ key }) => (lean[key] < 0 ? TRAITS[key].negWhy : TRAITS[key].why))
  );
}

// The styles the player leans toward most, for the "your play style" chips.
export function styleChips(lean) {
  return TRAIT_KEYS.filter((key) => key !== "simple" && lean[key] > 0)
    .sort((a, b) => lean[b] - lean[a])
    .slice(0, 4)
    .map((key) => TRAITS[key].label)
    .concat(
      lean.simple > 0.5
        ? ["Easy to play"]
        : lean.simple < -0.5
          ? ["Lots of options"]
          : [],
    );
}

// Everything the results page shows: the three builds, why each fits, when
// its class picks a subclass, and a race, background and subclass from the
// books worth a look (none repeated across the three).
export function quizResults(answers) {
  const lean = leanFor(answers);
  const usedRaces = new Set();
  const usedBackgrounds = new Set();

  const results = topBuilds(lean).map(({ build }, position) => {
    const bookRace = bookPickFor(
      BOOK_RACES,
      BOOK_TAGS.races,
      lean,
      build,
      usedRaces,
      0.6,
    );
    const bookBackground = bookPickFor(
      BOOK_BACKGROUNDS,
      BOOK_TAGS.backgrounds,
      lean,
      build,
      usedBackgrounds,
      0.6,
    );
    if (bookRace) usedRaces.add(bookRace.index);
    if (bookBackground) usedBackgrounds.add(bookBackground.index);
    // The class is already decided, so the answers count most here.
    const bookSubclass = bookPickFor(
      BOOK_SUBCLASSES.filter(
        (entry) => entry.class.index === build.class.index,
      ),
      BOOK_TAGS.subclasses,
      lean,
      build,
      new Set(),
      0.25,
    );
    const [subclassLevel, srdSubclass] = SUBCLASS_AT[build.class.index] ?? [
      3,
      null,
    ];

    return {
      label: MATCH_LABELS[position],
      build,
      reasons: reasonsFor(lean, build),
      subclassLevel,
      srdSubclass: build.subclass?.label ?? srdSubclass,
      bookRace,
      bookBackground,
      bookSubclass,
    };
  });

  return { chips: styleChips(lean), results };
}

export function answeredCount(answers) {
  return answers.filter((choice) => choice != null).length;
}
