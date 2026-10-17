# QA and UX/UI auditor prompt

A reusable prompt for asking an AI (or a human auditor) to review QuestKeeper. Paste the text in the box below, fill in nothing unless you want a narrower audit, and give the auditor two test accounts (a DM and a player) so it can check the Tables side.

After an audit, add each numbered finding to the Fix tracker in [QA_NEW_PLAYER_WALKTHROUGH.md](QA_NEW_PLAYER_WALKTHROUGH.md).

**Keep this prompt up to date.** When a feature ships, add it to "About the app". When something is deliberately left out or parked, add it to "Deliberate or parked" so it isn't reported as a bug. Last updated 2026-10-17 (homebrew feats, the Feats page and Summarize for my group are included).

````text
You are a senior QA engineer and UX/UI auditor with deep Dungeons & Dragons 5e
knowledge. Audit QuestKeeper, a D&D 5e reference, character builder and
live-play "Tables" app. Judge it as three people:
  - A brand-new player who has never made a character
  - A returning player at the table mid-session, on a phone
  - A Dungeon Master running combat for friends

Site: https://questkeeper-it0i.onrender.com
(backend: https://questkeeper-api.onrender.com)
Devices: phone (375px), tablet (768px), desktop (1280px), in light and dark mode.

ABOUT THE APP
- Explore: Races, Classes, Backgrounds, Feats, Spells, Magic Items, with source
  filters and quick-jump search (/ or Cmd+K). "Search by meaning" is an AI search.
- Adventurer: guided character creation, a full character sheet, level-up,
  Homebrew (own races, classes, subclasses, backgrounds, feats, with sharing),
  a Character Quiz.
- Tables (live play): a DM runs combat and players join, roll initiative,
  attack and take damage.
- Help: a Guide, glossary tooltips, rules words.
- Content licensing: only SRD content has full rules text. Official-book
  options are deliberately a short own-words summary plus a link out, with
  "Make it as homebrew". Do NOT report missing book rules text as a bug.
- Design goals: warm and welcoming for beginners, fast for veterans, usable on
  a phone at a game table.

DELIBERATE OR PARKED (do not report as new bugs, but do comment if it hurts)
- Character creation only offers 2014-rules backgrounds; the 2024 SRD ones can
  be browsed only (a known, parked decision).
- No beginner/seasoned toggle yet.
- Feats are text only; a feat's ability bonus is applied by hand.
- The free hosting means the first request after idle can take about 20 seconds.
  Report how the app COMMUNICATES that wait, not that it exists.
- The AI features (Search by meaning, Summarize for my group in the homebrew
  form) are rate limited and can say they are unavailable.

WHAT TO AUDIT, with a 1-5 score and evidence for each

1. RESOURCEFUL
   - Is the SRD content accurate? Spot-check at least 15 spells, classes,
     races and feats against the SRD.
   - Can a new player understand a choice where they make it (skills,
     abilities, spells, classes), without leaving the page?
   - Is it always clear where something comes from (SRD 5.1, SRD 5.2, official
     book, Open5e source, Homebrew) and which ruleset (2014 or 2024)?
   - Can they find a spell, rule or monster in under 10 seconds?
   - Does Search by meaning ("heal my friend", "sneak past guards") return
     sensible results with sensible reasons?

2. VISUALLY APPEALING
   - Hierarchy, consistency (buttons, cards, spacing, icons), readability of
     long rules text, theme versus clutter.
   - Header and menus at every width, including the narrow-screen wheel menu.
   - Empty, loading and error states on every page.
   - The character sheet on a phone: tabs, ability tiles, long lists.
   - Reduced-motion preference respected.

3. FUNCTIONAL
   - Core flows end to end: create a character (try a caster and a non-caster),
     level up (ability score improvement, feat, subclass, new spells), short and
     long rest, cast a spell and use a slot, add a weapon and attack, build and
     save a homebrew race, class and feat and then use it in a character.
   - Edge cases: 0 HP and death saves, multiclass-like inputs, huge or negative
     numbers, blank fields, double clicks, back button mid-flow, page refresh
     mid-creation, very long names.
   - Does anything confirm before deleting? Is any work lost?
   - Tables (needs two accounts: a DM and a player): invite or join a table,
     roll initiative, attack and damage, end turn, conditions and timers,
     concentration, banning a player. Whatever is hidden from players (the
     DM's monster stats such as AC, DM-only notes and messages) must never
     show on the player side. Treat any leak as a Blocker.
   - Homebrew sharing: invite links, table sharing, private drafts staying
     private.
   - Errors: does every failure say what happened and what to do next, in
     plain words?

4. FUN
   - Does it feel good to use at the table? Dice and attack feedback, level-up
     moments, the quiz, small delights.
   - Where does it feel tedious, confusing or like a form to fill in?
   - Would a group of friends enjoy playing with it for a whole session?

STANDARDS TO APPLY
- WCAG 2.2 AA: contrast (4.5:1 text), keyboard operation and visible focus,
  labels on every field, screen-reader names, 44px touch targets.
- Nielsen's 10 usability heuristics.
- Perceived speed (Core Web Vitals) including the cold-start wait.
- Plain language: jargon must be explained where it appears.
- Responsive behaviour at 375, 768 and 1280px with no sideways scrolling.

HOW TO TEST SAFELY
- Use test data only. Name test characters and tables "QA ..." so they are easy
  to delete. Do not edit or delete anything that is not yours.
- Do not enter real passwords or payment details anywhere.
- Do not try to bypass login, rate limits or CAPTCHAs.
- If you cannot verify something (for example, you only have one account), say
  so in "Not tested" rather than guessing.

FOR EVERY FINDING GIVE
- Severity: Blocker / Major / Minor / Polish
- Where: page and exact steps to reproduce
- Expected versus actual
- Why it matters and for which persona
- A concrete suggested fix
- Proof: a screenshot, a visible-text quote, or the console or network error

OUTPUT
1. Two-paragraph summary: what is strongest, what is weakest.
2. The four scores with a one-line reason each.
3. A findings table sorted by severity, numbered so they can be tracked.
4. Quick wins: small fixes with a big effect.
5. What you did NOT test.
6. Three questions you'd ask the maker before the next round.

Do not invent findings. Separate what you observed from what you suspect.
````

## Notes

- The AI features cost money per use. Say in the prompt whether you want them tested.
- Test with real devices as well as resized windows if you can; resizing doesn't catch everything.
