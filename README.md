# QuestKeeper

QuestKeeper is a full-stack companion for **Dungeons & Dragons Fifth Edition**. It started as a searchable reference for the freely licensed SRD and grew into a place to play: a guided character builder for first-time players, a character sheet built for real (and messy, homebrew) characters, and live **tables** where a Dungeon Master runs combat, story, handouts and secret messages while each player follows along from their own game page.

It's designed around one idea: rules should feel like friendly guidance from an experienced player, not homework from a rulebook.

[Live Demo](https://questkeeper-it0i.onrender.com) · [Source Code](https://github.com/samanthaparas/QuestKeeper) · [Screenshot history](docs/screenshots/README.md)

## Screenshots

_Current as of October 15, 2026._

### Home

![QuestKeeper home page with a big search bar, three "Learn, Build, Bring them to the table" steps, and Browse Categories cards](docs/screenshots/2026-10-15/home.png)

### Reference pages

![Races page with source filter chips, race icons and book badges, and hover summaries](docs/screenshots/2026-10-15/races.png)

![Classes page with class icons, book badges and the source filter](docs/screenshots/2026-10-15/classes.png)

![Spells page with spell school icons and filters](docs/screenshots/2026-10-15/spells.png)

![Magic Items page with filters for rarity, type, worn slot and attunement](docs/screenshots/2026-10-15/magic-items.png)

### Help for new players

![Learn the Basics guide: dice, abilities, your turn, at the table, your choices, and rules words](docs/screenshots/2026-10-15/guide.png)

![Character quiz start screen: "Find your character", up to 20 questions, three builds that fit you](docs/screenshots/2026-10-15/quiz.png)

### Your characters and the character sheet

![Your Characters list with portraits](docs/screenshots/2026-10-15/characters-list.webp)

![Billie's character sheet in three columns: skills on the left, stats, attacks and her companion Victory in the middle, portrait, gold and rests on the right](docs/screenshots/2026-10-15/character-sheet.webp)

![Inventory tab: attuned items first, with Equipped, Proficient and Attuned toggles; Attuned Items 3 / 3](docs/screenshots/2026-10-15/character-inventory.webp)

Stats are locked by default. **Edit stats** unlocks them, and **Done editing** locks them again:

![Character sheet with the stats unlocked for editing](docs/screenshots/2026-10-15/character-sheet-edit-stats.webp)

### Playing at a table

![My Games: join a table with a code and one of your characters](docs/screenshots/2026-10-15/my-games.webp)

![A player's game page: the character card with HP bar and AC, Combat and Story tabs, and rolling initiative with an app roll or real dice](docs/screenshots/2026-10-15/game-page.webp)

![The DM Screen listing the tables you run and their join codes](docs/screenshots/2026-10-15/dm-screen.webp)

![The DM's Combat tab: the party strip with a share switch, initiative order, a Bloodied kobold with DM-only HP and AC, and the attack panel](docs/screenshots/2026-10-15/dm-combat.webp)

![The DM's Story tab: passive scores for each character, and handouts](docs/screenshots/2026-10-15/dm-story.webp)

![Handouts: hidden until revealed to everyone or to chosen players](docs/screenshots/2026-10-15/handouts.webp)

![A picture handout opened in the pop-up](docs/screenshots/2026-10-15/handout-popup.webp)

_Map in the handout: "Tranquil Farm" from the [Dice Grimorium free map library](https://dicegrimorium.com/free-rpg-map-library/)._

![The table journal: grouped by session, signed and timed, with a private "Just me" note](docs/screenshots/2026-10-15/journal.webp)

![Secret messages between the DM and one player](docs/screenshots/2026-10-15/messages.webp)

### Before and after

QuestKeeper has changed a lot since its first screenshots. Old screenshots are never replaced: each round is kept in its own dated folder (see the [screenshot history](docs/screenshots/README.md)).

| Page | Before | After (Oct 15, 2026) |
| --- | --- | --- |
| Home | ![Home, August 23, 2026](docs/screenshots/home.png) Aug 23, 2026 | ![Home, October 15, 2026](docs/screenshots/2026-10-15/home.png) |
| Races | ![Races, September 21, 2026](docs/screenshots/reference-races.png) Sep 21, 2026 | ![Races, October 15, 2026](docs/screenshots/2026-10-15/races.png) |
| Classes | ![Classes, September 21, 2026](docs/screenshots/reference-classes.png) Sep 21, 2026 | ![Classes, October 15, 2026](docs/screenshots/2026-10-15/classes.png) |
| Spells | ![Spells, September 21, 2026](docs/screenshots/reference-spells.png) Sep 21, 2026 | ![Spells, October 15, 2026](docs/screenshots/2026-10-15/spells.png) |
| Your Characters | ![Characters list, September 21, 2026](docs/screenshots/characters-list.png) Sep 21, 2026 | ![Characters list, October 15, 2026](docs/screenshots/2026-10-15/characters-list.webp) |
| Character sheet | ![Character sheet, September 21, 2026](docs/screenshots/character-sheet-resources.png) Sep 21, 2026 | ![Character sheet, October 15, 2026](docs/screenshots/2026-10-15/character-sheet.webp) |
| Inventory | ![Inventory, September 21, 2026](docs/screenshots/character-sheet-inventory.png) Sep 21, 2026 | ![Inventory, October 15, 2026](docs/screenshots/2026-10-15/character-inventory.webp) |

## Features

### Two sides: Adventurer and Dungeon Master

The header splits the app by who you are tonight: **Explore** (reference pages), **Adventurer** (your characters, your tables, your homebrew), **Dungeon Master** (the tables you run) and **Help** (the guide, the quiz, rules words). You can be both. On narrow screens the menu becomes a spinning wheel, and `/` or `Cmd+K` opens quick-jump search from anywhere.

### Reference and search

- Global search across classes, races, spells, backgrounds and more, with result cards and an in-page detail panel.
- Category pages for races, classes, spells, backgrounds and **magic items**. Magic items can be filtered by rarity, type, worn slot, attunement and more.
- Content from the 2014 and 2024 SRDs and from **Open5e** (openly licensed third-party 5e material), each marked with a source badge and filterable by book.
- Official book races, subclasses and backgrounds that aren't free to reuse are **listed by name only**, with a one-line summary I wrote myself and a link to read more elsewhere. QuestKeeper never copies their text.
- Icons for races, classes, backgrounds, spell schools and magic items.
- Tap any spell, feat, weapon, magic item, class feature or racial trait for its full SRD details in a popup, including real tables.

### Help for brand-new players

- A **Learn the Basics** guide (dice, abilities, turns, the table, choices) with an interactive dice roller.
- **Rules words** explained on hover anywhere they appear (Advantage, Bloodied, Concentration…), plus a full Rules words list in the guide.
- A **character quiz**: up to 20 questions about how you'd handle situations and how you like to play. It suggests three builds, and "Use this build" fills them into character creation. Your results stay easy to get back to.

### Character creation

- A guided wizard with a step rail, a "Your hero so far" strip, Tips cards, and plain-language "Good if you want..." lines for every race and class.
- Ability scores by the standard array or by rolling 4d6, and any race can move its bonuses to abilities of the player's choice.
- A Gear step for each class's either/or starting equipment, starting **gold** (including background gold), tools as separate entries, and **languages** you actually pick.
- Racial skills (Elf Perception, Half-Orc Intimidation, Half-Elf's two skill picks…) and **background features** are added for you.
- Class feature **choices** (Fighting Style, Favored Enemy, Natural Explorer…) are made during creation, and each feature remembers where it came from (class, subclass, race or background).
- New characters get real derived stats: AC from the armor they wear, attacks from their weapons, spell components filled in from the SRD, and level-1 features.
- After creation, a **setup list** on the Features tab points out anything still worth checking.

### The character sheet

- A **three-column layout** on wide screens: the stats and skills on the left, the tabs in the middle, and the table's information on the right. On tablets and phones a Stats | Skills switch keeps it tidy.
- Tabs for Actions, Spells, Resources, Inventory, Features and Story, with tabs that don't apply (Spells for a Fighter) left out.
- **Lock stats** so a stray tap can't change your ability scores, AC or HP.
- **AC from armor**: mark armor and shields as equipped and the AC works itself out (Dexterity caps, shields, Unarmored Defense). Typing an AC switches to manual.
- Inventory with icon toggles for Equipped 🛡, Proficient (P) and Attuned (★), attuned items first, capped at 3.
- **Click any bonus to roll it**, with the roll shared with your table.
- Tap pips to spend spell slots and limited-use resources, and rests that follow the rules (Hit Dice on a Short Rest, half your Hit Dice back on a Long Rest).
- **Condition badges** (Poisoned, Prone, Exhaustion levels…) with their rules on hover.
- A **companion** combat card (AC, HP, speed, notes) alongside freeform text.
- A full level-up flow: hit points, ability score improvements or feats, subclass choice at the right level, and new spells that follow each class's own spell slot rules.
- Everything is editable after creation, and race, class, subclass and background can be retyped for homebrew and non-SRD characters.

### Homebrew

- A **My Homebrew** page with a guided form for races, classes, subclasses, backgrounds, spells, items and more, with sharing and invite links so a group can use the same homebrew.
- Homebrew shows up in character creation, the reference pages and level-up, and **homebrew classes** (Artificer, for example) can be played.
- Pre-fill a homebrew entry from rules text you paste in, or from a free option.

### Live play at a table

A DM creates a table with a join code, and players join with one of their characters.

**On the Dungeon Master's screen** (tabs for Combat, Story, Players and Prep):

- An initiative tracker and a private Monster Library. Add many identical monsters at once with nicknames and icons, and roll initiative for every monster in one click.
- A full attack flow: players roll a virtual d20 or type a real one, and the database decides hit or miss against the **secret** AC. The DM can attack with monsters, send damage as a request the player applies, or deny an attack.
- A **party strip** showing every character's HP, AC and conditions, with a DM switch to share it with the players (the DM decides whether the party can see each other).
- **Handouts**: pictures and notes the DM reveals to the whole table or to chosen players only. Revealing one adds a note to the journal, and pictures open in a pop-up.
- **Secret messages** between the DM and individual players, with pictures.

**On each player's game page:**

- A character card (portrait, HP bar, AC, conditions) and a button straight to the full sheet.
- Combat and Story tabs, a turn banner when it's your turn, and the party strip when the DM shares it.
- A shared **table journal**: entries are signed by character and grouped by session, unfinished drafts are kept if you switch tabs, and any entry can be **private** (not even the DM can read it).
- The table's handouts, also shown on the character sheet.

**Hidden stays hidden:** enemy HP, AC and attacks never reach a player's browser. Players see a name, Healthy, Bloodied or Down, and damage taken.

### Design and accessibility

- A warm parchment-and-terracotta design ("Wayfarer") built on shared color, type and spacing tokens.
- Gentle motion that respects Reduce Motion, and nothing loops.
- Loading, empty and error states for everything that waits on the network, and layouts checked at phone (375px), tablet and desktop widths.

## Tech stack

| Area       | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | React 19, React Router (HashRouter), Vite, CSS |
| Backend    | Node.js, Express, REST routes                 |
| Auth/Data  | Supabase (Auth, Postgres with row-level security, SQL functions, Realtime, Storage) |
| Testing    | Vitest, React Testing Library                 |
| Data       | D&D 5e SRD API (2014 and 2024), Open5e        |
| Hosting    | Render (static site + web service), GitHub Actions |
| Repository | npm workspaces monorepo                       |

For the full product direction and content policy, see [QuestKeeper Project Vision](docs/QUESTKEEPER_VISION.md).

## How the applications communicate

```text
React frontend
    -> QuestKeeper Express backend
    -> D&D 5e SRD API (2014 and 2024) and Open5e

React frontend
    -> Supabase (accounts, characters, homebrew, portraits,
       tables, combat, messages, journal, handouts)
```

Reference data goes through the Express backend, which fetches it from `dnd5eapi.co` or Open5e and returns it in one consistent `{ data: ... }` shape. Keeping the outside APIs behind the backend gives one place to map, cache and validate their data.

Everything that belongs to a person goes straight from the browser to Supabase, and **row-level security** decides who may read or write each row. Anything secret is protected in the database, not just hidden in the interface:

- Enemy HP, AC and stat blocks live in a DM-only table. Game rules that need them (does this attack hit, how much damage was done, whose turn is next) run inside database functions, so a player only ever receives the result.
- The party strip comes from a function that checks whether the DM has shared it.
- Handouts sent to chosen players can only be read by those players and the DM.
- Private journal entries can only be read by their author.

## Project structure

```text
QuestKeeper/
|-- .github/workflows/
|   |-- ci.yml                    Lint, tests, build, and a "install like Render" backend check
|   `-- keep-api-awake.yml        Pings the free API during Monday game night
|-- docs/
|   |-- QA_NEW_PLAYER_WALKTHROUGH.md  New-player QA findings and fix tracker
|   |-- QUESTKEEPER_VISION.md     Product vision and development direction
|   |-- TWO_ACCOUNT_TEST.md       End-to-end DM + player test for live play
|   `-- screenshots/              Dated screenshot history (old ones are never replaced)
|-- questkeeper-backend/
|   |-- src/controllers/          Fetches and reshapes SRD and Open5e data
|   |-- src/routes/               Express API routes
|   |-- src/utils/                Mappers and catalogs (with tests)
|   `-- src/server.js             Backend entry point
|-- questkeeper-frontend/
|   `-- src/
|       |-- components/           Reusable pieces (sheet tabs, PartyStrip, TableJournal,
|       |                         TableHandouts, TableMessages, RollDock, QuickJump...)
|       |-- pages/                Pages (Home, reference pages, Guide, Quiz, Homebrew,
|       |                         CharacterCreation, CharacterSheet, Tables, Table...)
|       |-- utils/                Game rules as plain functions (armor class, skill
|       |                         grants, feature sources and choices, spell components,
|       |                         journal, handouts, party strip...) with tests
|       `-- test/                 Shared test helpers
|-- supabase/
|   `-- migrations/               SQL for tables, row-level security and game-rule functions
|-- render.yaml                   Render Blueprint for both services
|-- package.json                  Shared workspace commands
`-- README.md
```

The frontend and backend began as separate repositories and were combined into this monorepo once features needed changes on both sides at once.

## Local setup

### Prerequisites

- A current Node.js version (with built-in `fetch`), npm and Git.

### Install and run

From the repository root:

```bash
npm install
```

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

The backend listens on `http://localhost:3001`; Vite prints the frontend's URL.

### Environment variables

Copy `questkeeper-frontend/.env.example` and fill in:

```text
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase publishable key>
```

The Supabase values are needed for accounts, characters and tables. Run the SQL files in `supabase/migrations/` (in date order) in the Supabase SQL editor to create the tables, security rules and functions. Restart Vite after changing an environment variable.

## Deployment

QuestKeeper is deployed on Render from the [`render.yaml`](render.yaml) Blueprint:

- [Frontend](https://questkeeper-it0i.onrender.com): `questkeeper`, a Vite static site with a single-page-app rewrite.
- [Backend API](https://questkeeper-api.onrender.com): `questkeeper-api`, a Node/Express web service on the free plan.

The free API sleeps after about 15 minutes without requests, and the first request after that takes around 20 seconds. A scheduled GitHub Action pings it every 10 minutes during Monday game night so it stays awake while the group plays.

## Available commands

Run from the repository root:

| Command                                                | Purpose                                           |
| ------------------------------------------------------ | ------------------------------------------------- |
| `npm run dev:frontend`                                 | Start the Vite frontend development server        |
| `npm run dev:backend`                                  | Start the Express backend with automatic restarts |
| `npm run start:backend`                                | Start the Express backend without Nodemon         |
| `npm run build`                                        | Create a production frontend build                |
| `npm run lint`                                         | Check the frontend source with ESLint             |
| `npm run test --workspace questkeeper-frontend -- run` | Run the frontend test suite once                  |
| `npm run test --workspace questkeeper-backend -- run`  | Run the backend test suite once                   |

## Testing and quality

- **About 970 frontend tests** (Vitest and React Testing Library) cover the game rules as plain functions (ability scores, HP, level-up, rests, armor class, skill grants, feature sources and choices, spell components, journal and handout rules, party strip) and the sheet, creation, table and journal components. Whole-character "audit" tests build sample characters of every SRD class and race and check the result.
- **Backend tests** cover the Open5e mappers, the magic item catalog and the spells controller.
- **CI** runs on every push and pull request to `main`: lint, frontend tests, build, backend tests, and a second job that installs the backend exactly the way Render does (`npm ci --workspaces=false`), so a broken lockfile fails CI instead of the deploy.
- **Database security rules** are checked by running each migration in a throwaway local Postgres and calling the functions as a DM, a player and an outsider.
- **Hands-on QA:** a [new-player walkthrough](docs/QA_NEW_PLAYER_WALKTHROUGH.md) tracks 40 usability findings from a first-time player's point of view, and a [two-account test](docs/TWO_ACCOUNT_TEST.md) (DM and player, 19 stages) walks through live play end to end.

## Challenges, setbacks and how I solved them

### Every backend deploy silently failed for weeks

**Problem:** After the Open5e work (#109), the backend's lockfile no longer matched its `package.json`. Render installs the backend on its own, so every deploy failed, and Render kept quietly serving the old code. Locally everything worked, because the monorepo installs differently.

**How I found it:** New API features were missing on the live site even though they had been merged. Render's deploy log showed the failed install.

**Solution:** I regenerated the lockfile, and CI now has a `backend-deploy-install` job that installs the backend exactly as Render does. The same mistake now fails a pull request instead of a deploy.

### The paid Render plan returned 502 errors

**Problem:** To stop the API from sleeping, I moved it to Render's Starter plan. The service reported healthy and its logs were clean, but every request came back as a 502 with Render's own `dynamic-paid-error` routing header.

**What I tried:** I restarted the service, ruled out scheduled maintenance, checked the logs, and opened a support ticket (escalated past Render's AI assistant to their team).

**Where it stands:** I moved back to the free plan (#137) so the site works, and added the Monday keep-awake workflow (#138) so game night isn't slowed by cold starts. The ticket is still open, and moving to the paid plan is blocked until Render fixes its routing.

### SRD class features came with every subclass attached

**Problem:** The SRD's class feature list includes the features of *every* subclass. A Shadow Sorcerer was given Draconic features, some features were duplicated, and every Fighting Style option was ticked at once.

**Solution:** Features are now tagged with the subclass they belong to and filtered, options start unticked so the player chooses, and every feature records its source (class, subclass, race or background, and level). A review step flags stray features already on older sheets. Retyped subclasses keep their original SRD ID so the right features still load.

### Racial skills, background features, gold, tools and languages were missing

**Problem:** A character audit (#146, #148) found that racial skills were dropped for every race, background features were never added, starting gold was always 0, all tools were saved as one entry, and languages were only a reminder.

**How I tested:** I built sample characters of every SRD race, class and background in automated tests and compared each sheet to the rules. One of them was the developer's own character, who was missing things.

**Solution:** Skill grants are read from racial traits (and homebrew skill fields), background features and gold are added, tools are separate entries, and languages are picked in creation. A setup list on the Features tab points out anything a player should still check.

### Spell components were blank

**Problem:** Spells added during creation, level-up or from a race had no V/S/M components.

**Solution:** Missing components are filled in from the SRD when the sheet loads. Components a player typed are never overwritten, and homebrew or book spells are left alone.

### A stray tap changed a stat during play

**Problem:** During a real session, an accidental edit changed a character's AC in the middle of a fight.

**Solution:** A **Lock stats** switch makes the ability scores, AC and HP fields read-only. AC can also be worked out from equipped armor, so it's rarely typed at all.

### Players' journal drafts disappeared

**Problem:** In testing, half-written journal entries vanished when a player switched tabs, and the activity log was too noisy to be useful.

**Solution:** Drafts are saved in the browser until they're posted, entries are grouped by session and show only a few at a time, and the log is trimmed to what matters.

### Live play needed real secrets, not hidden buttons

**Problem:** Anything the browser receives can be read in the network tab, so hiding enemy stats, private handouts or private notes in the interface isn't enough.

**Solution:** Each secret is enforced by Postgres row-level security or a security-definer function (see [How the applications communicate](#how-the-applications-communicate)), and each rule was tested in a local Postgres as a DM, a player and an outsider before the migration was run for real.

### Book content isn't ours to copy

**Problem:** Players want Xanathar's and Tasha's options, and the text is easy to find online. But publicly readable doesn't mean reusable, and attribution doesn't grant permission.

**Solution:** QuestKeeper uses the SRDs and Open5e (both openly licensed). Book options appear only as names, a one-line summary in our own words, and a link to read more. A group can always enter its own content through homebrew.

### Smaller setbacks along the way

- **A pull request merged before its second commit was pushed.** The missing commit was cherry-picked into the next pull request (#151). I now check `git status` and `git log` against `origin/main` before every new branch.
- **A lint rule** (`react-hooks/immutability`) flagged an effect that called a function declared further down. The effect was moved below the functions it uses.
- **The phone header overlapped at 375px**, and on tablets the Stats | Skills switch crowded the character's name. The header was tightened and the switch moved onto the controls line.
- **The search used to depend on every category** loading, and **only one background** (Acolyte) exists in the 2014 SRD. That's a licensing limit, not a bug. The 2024 SRD and Open5e now add more.
- **Headless screenshots of the guide came out blank** because the page hadn't finished loading. Giving the browser more time fixed it.

## Where things stand

### Working on now

- Running the **two-account test** (DM and player on separate accounts, 19 stages) and fixing what it finds.
- **Party portraits** in the party strip, so everyone at the table can see each other's faces.

### Blockers

- **Render's paid plan:** returns 502s until Render fixes its routing (support ticket open). Until then the API is on the free plan and sleeps when idle, with game night covered by the keep-awake workflow.
- **Book content licensing:** subraces like Wood Elf and Drow, and Tasha's optional class features, aren't in the SRD. They can only be listed as names, summaries and links, or entered as homebrew.
- **Free Supabase plan:** has no automatic backups, so data should be exported now and then.
- **Paste-fill parsing** for more formats needs real sample text to build against.

## Known limitations

- Content is limited to the 2014 and 2024 SRDs, Open5e, and your own homebrew. Other books appear by name and link only.
- Source and license information is shown as badges and on the Attributions page, not yet as full per-entry provenance.
- Upstream requests don't yet use application-level caching or explicit timeouts (the spell list is cached in the browser).
- Every player needs an account to join a table. A DM can track a friend without an account as a hand-run party member.
- A homebrew class's features and spells are entered by hand.
- Item stacks can't be split, and sheet lists can't yet be sorted or filtered by category.
- The table and combat rules are checked by hand in a local Postgres and by component tests, not yet by automated database or end-to-end tests.
- The free API's first request after a quiet period takes about 20 seconds.

## Ideas and roadmap

What would make QuestKeeper even better than it was yesterday:

1. **Party portraits** in the party strip and on the DM's screen.
2. **A Settings page:** display name, a Reduce Motion override, and email and password changes.
3. **Book subraces as link-outs:** Wood Elf, Drow, Mountain Dwarf, Stout Halfling and Forest Gnome as names, summaries and links, with a one-tap "Make as homebrew".
4. **Sorting and filtering** on the sheet (items by category, spells by level, favorites), and **splitting item stacks**.
5. **Better paste-fill** that reads more formats of pasted rules text.
6. **Automated database and end-to-end tests** for the table rules, so the two-account test can run itself.
7. **Backend caching and timeouts,** and global search that keeps working if one category fails.
8. **A beginner mode toggle** to hide hints once a player doesn't need them.
9. **Session tools for the DM:** encounter prep, a recap generated from the journal, and table hints.
10. **AI-assisted extras** once the rules data is solid: backstory ideas and "describe the vibe" character suggestions.

The roadmap stays incremental: each feature should be small enough to understand, build, test and review before the next one.

## Project timeline

- **June 10, 2026:** first commit. A React search over the SRD with a separate Express backend.
- **Summer 2026:** combined into one monorepo; reference pages, global search and the "Wayfarer" design.
- **September 2026:** accounts, the guided character builder, the tabbed character sheet, level-up and rests.
- **Early October 2026:** live tables with secret enemy stats, the attack flow and a monster library; a new-player QA walkthrough.
- **Mid October 2026:** Open5e and book listings, homebrew, magic items, the quiz, rules words, shared rolls, secret messages, the Adventurer and Dungeon Master split, party strip, journal, handouts, the player game page and a full character audit.

As of October 15, 2026 there are 150+ merged pull requests and 230+ commits.

## Content and licensing principles

QuestKeeper targets the 2014 rules and shouldn't silently mix editions or reproduce protected material without permission. Before adding a source, I document its edition, who provides it, what it covers, its license and attribution requirements, and whether QuestKeeper may reproduce its text, link to it, or store only private user notes.

The full policy is in [docs/QUESTKEEPER_VISION.md](docs/QUESTKEEPER_VISION.md), and every source in use is credited on the in-app Attributions page.
