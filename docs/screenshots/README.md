# QuestKeeper screenshot history

A record of how QuestKeeper has looked over time, for before-and-after comparisons.

**Rule:** screenshots are never replaced, renamed or deleted. Each new round goes in its own folder named by date (`YYYY-MM-DD/`).

## 2026-08-23: the first screenshots

Files in this folder (no date folder yet):

- `home.png`: home page with global search and suggested searches
- `search-fireball.png`: global search results for "Fireball"

## 2026-09-21: reference pages and the character sheet

Files in this folder:

- `reference-races.png`, `reference-classes.png`, `reference-spells.png`: list + detail panel layout
- `characters-list.png`: Your Characters
- `character-sheet-resources.png`, `character-sheet-inventory.png`: the tabbed sheet with combat header and Skills sidebar

## 2026-10-15: two sides, live tables, new header

Folder: [`2026-10-15/`](2026-10-15/)

- `home.png`: new header (Explore, Adventurer, Dungeon Master, Help) and the three-step home page
- `races.png`, `classes.png`, `spells.png`: source filters, icons, book badges, hover summaries
- `magic-items.png`: the Magic Items page and its filters
- `guide.png`: Learn the Basics
- `quiz.png`: the character quiz

Signed-in pages (taken by hand in Chrome, `.webp`):

- `characters-list.webp`: Your Characters with portraits
- `character-sheet.webp`: Billie's sheet in the three-column layout, with her companion Victory
- `character-sheet-edit-stats.webp`: the same sheet with stats unlocked ("Done editing")
- `character-inventory.webp`: attuned items first, Equipped / Proficient / Attuned toggles
- `my-games.webp`: My Games (Adventurer side)
- `game-page.webp`: a player's game page, rolling initiative
- `dm-screen.webp`: the DM Screen's list of tables
- `dm-combat.webp`: DM Combat tab with the party strip and initiative
- `dm-story.webp`: DM Story tab with passive scores and handouts
- `handouts.webp`: handouts, hidden and revealed
- `handout-popup.webp`: a picture handout open in the pop-up (map: "Tranquil Farm" from the [Dice Grimorium free map library](https://dicegrimorium.com/free-rpg-map-library/), credited in the README)
- `journal.webp`: the table journal with a private note
- `messages.webp`: secret DM-to-player messages

## 2026-10-21 to 2026-10-23: the tavern redesign (homepage and DM screen)

These folders show the redesign in progress. All of them were made from the running app with **made-up sample data** (a pretend table, a pretend returning player), not from a real signed-in session or a real table, so they show layout, not live behaviour. The earlier drafts of the redesign are kept on the maker's computer only and aren't in the repository.

- [`2026-10-21-pass4/`](2026-10-21-pass4/): the homepage at 820x1180 (tablet portrait) in light and dark, with the hero artwork and text as one composition, plus the returning-player cards (`...returning-SAMPLE-DATA...`) and two "zoom 200%" stand-ins (a half-size viewport at double pixel density, not a real browser zoom).
- [`2026-10-22-dm-pass7/`](2026-10-22-dm-pass7/): the DM screen's Combat tab at 1440x900, 1280x720 and 820x1180, both themes. Activity icons show here only because the sample events were given kinds by hand. **Known mistake:** the `...party-collapsed...` files in this folder wrongly show every Party card (a CSS bug that was fixed afterwards); use the next folder for the real fold.
- [`2026-10-23-dm-party-fold/`](2026-10-23-dm-party-fold/): 820x1180 with the Party panel really collapsed and expanded, in both themes.
- [`2026-10-23-dm-tabs/`](2026-10-23-dm-tabs/): the DM screen's Story, Players and Prep tabs at 1440x900 and 820x1180, both themes, full page (empty handouts and journal, no saved table rules).

## 2026-10-24 to 2026-10-25: the DM screen's Story tab (in review, not yet merged)

Both folders are made from the running app with **made-up sample data**, not a real table.

- `2026-10-24-dm-story/`: the first Story pass (party clues, journal, handouts). Superseded by the next folder.
- `2026-10-25-dm-story-pass2/`: the second Story pass: the journal as a feed (slim header, recap strip, one filter row, scrolling notes, note box at the bottom, Session options folded), party clues with the character details folded, and simpler handout cards. Includes 1440x900 and 1280x720 in both themes, 820x1180 with the clues collapsed and expanded, Session options open, handout options and character details open, and the empty states.

- `2026-10-26-dm-story-correction/`: the Story tab after the tablet journal-overlap fix and the handout keyboard-focus fix: 820x1180 with the clues collapsed and expanded (journal scrolled to the last note), a 390x844 phone view, 1440x900 and 1280x720 in both themes, and a long handout with keyboard focus on a lower action. Sample data.
- `2026-10-27-dm-story-title-zoom/`: the Story tab with the "Show full title" button on a long handout title: 1280x720 in both themes (Options open, title expanded), a 390x844 touch-sized phone view, a 820x1180 tablet view with the note box clear of every note, and real 200% browser zoom (profile zoom, not emulation) in both themes. Sample data.

## Taking a new round

1. Make a folder named with today's date, for example `docs/screenshots/2026-11-20/`.
2. Use the same file names as the last round where the page is the same, so before-and-after pairs are easy to match.
3. Desktop shots at 1440 wide; phone shots at 375 wide.
4. Add a section to this file listing what's in the new folder.
