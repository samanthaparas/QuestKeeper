# QuestKeeper

QuestKeeper is a full-stack companion for **Dungeons & Dragons Fifth Edition**. It started as a searchable reference for the freely licensed SRD and grew into a place to play: a guided character builder for first-time players, a character sheet built for real (and messy, homebrew) characters, and live **tables** where a Dungeon Master runs combat, story, handouts and secret messages while each player follows along from their own game page.

It's designed around one idea: rules should feel like friendly guidance from an experienced player, not homework from a rulebook.

[Live Demo](https://questkeeper-it0i.onrender.com) · [Source Code](https://github.com/samanthaparas/QuestKeeper) · [Screenshot history](docs/screenshots/README.md)

## Screenshots

_Current as of October 15, 2026, so these show the look before the redesign. The tavern homepage and the four DM screen tabs (Combat, Story, Players, Prep) have their own dated rounds of sample-data screenshots in the [screenshot history](docs/screenshots/README.md). The site-wide redesign of October 24 to 25 (banners on every page, My Games, Your Characters, the quiz, character creation, sign-in and Messages) and the screens added after October 15 (campaigns, recaps, the encounter helper, dark mode and more) aren't pictured here yet._

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
- **AI search by meaning:** type what you want in your own words ("heal my friend", "sneak past guards") and pick **✨ Search by meaning**. Claude picks the spells, magic items, classes, races and backgrounds that fit, each with a one-line reason a new player can follow. It runs only when asked, through the backend (see [How the applications communicate](#how-the-applications-communicate)).
- Category pages for races, classes, spells, backgrounds and **magic items**. Magic items can be filtered by rarity, type, worn slot, attunement and more.
- Content from the 2014 and 2024 SRDs and from **Open5e** (openly licensed third-party 5e material), each marked with a source badge and filterable by book.
- Official book races, subclasses and backgrounds that aren't free to reuse are **listed by name only**, with a one-line summary I wrote myself and a link to read more elsewhere. QuestKeeper never copies their text.
- Icons for races, classes, backgrounds, spell schools and magic items.
- Tap any spell, feat, weapon, magic item, class feature or racial trait for its full SRD details in a popup, including real tables.
- Class pages list what each class gains later **grouped by level**, with repeated features (Ability Score Improvement at levels 4, 8, 12, 16 and 19) listed once, and the SRD's lists shown as real bullet points.

### Help for brand-new players

- A **Learn the Basics** guide (dice, abilities, turns, the table, choices) with an interactive dice roller and a **Back to top** button once you're well down the page.
- **Rules words** explained on hover anywhere they appear (Advantage, Bloodied, Concentration…), plus a full Rules words list in the guide.
- A **character quiz**: up to 20 questions about how you'd handle situations and how you like to play. It suggests three builds, and "Use this build" fills them into character creation. Your answers are kept on your device and in the results link, so a reload, or opening the link again, gets you back to the same three builds.

### Character creation

- A guided wizard with a step rail, a "Your hero so far" strip, Tips cards, and plain-language "Good if you want..." lines for every race and class.
- Ability scores by the standard array or by rolling 4d6, and any race can move its bonuses to abilities of the player's choice.
- A Gear step for each class's either/or starting equipment, starting **gold** (including background gold), tools as separate entries, and **languages** you actually pick.
- Racial skills (Elf Perception, Half-Orc Intimidation, Half-Elf's two skill picks…) and **background features** are added for you.
- Class feature **choices** (Fighting Style, Favored Enemy, Natural Explorer…) are made during creation, and each feature remembers where it came from (class, subclass, race or background).
- New characters get real derived stats: AC from the armor they wear, attacks from their weapons, spell components filled in from the SRD, and level-1 features.
- After creation, a **setup list** on the Features tab points out anything still worth checking.
- **Every step has its own address** (`?step=class`), so the browser's Back and Forward (or a phone's back swipe) move between steps instead of losing the character. What you've chosen is also kept on the device, and "Picking up where you left off" offers to resume it or **Start fresh**. A stale address can't skip ahead: it lands on the earliest step that still needs an answer.
- **Race, class, background, subrace and subclass pickers** keep their list-and-details layout, source filters and homebrew buttons, with a round picture tile on each card (a letter when there's no artwork, as for homebrew). Each step has one main heading, and moving to a new step scrolls to it and moves keyboard focus there.

### The character sheet

- A **three-column layout** on wide screens: the stats and skills on the left, the tabs in the middle, and the table's information on the right. On tablets and phones a Stats | Skills switch keeps it tidy.
- Tabs for Actions, Spells, Resources, Inventory, Features and Story, with tabs that don't apply (Spells for a Fighter) left out.
- **Lock stats** so a stray tap can't change your ability scores, AC or HP.
- **AC from armor**: mark armor and shields as equipped and the AC works itself out (Dexterity caps, shields, Unarmored Defense). Typing an AC switches to manual.
- Inventory with icon toggles for Equipped 🛡, Proficient (P) and Attuned (★), attuned items first, capped at 3.
- **Click any bonus to roll it**, with the roll shared with your table.
- Tap pips to spend spell slots and limited-use resources, and rests that follow the rules (Hit Dice on a Short Rest, half your Hit Dice back on a Long Rest).
- **Condition badges** (Poisoned, Prone, Exhaustion levels…) with their rules on hover. Any condition can be **timed in rounds** (⏱), and it counts down by itself as the table's rounds pass.
- **Death saves** appear at 0 HP: roll them (a 1 counts twice, a 20 brings you back) or tap the marks for real dice, and you're Stable or Dead after three. Taking damage at 0 HP adds a failure.
- **Concentration:** track which spell you're holding. Taking damage asks for the Constitution save at the right DC (10 or half the damage), dropping to 0 ends it, and a ⏱ timer ends it after its duration (10 rounds for a 1-minute spell).
- **Weapons and armor that do the math:** magic bonuses, typed extra damage (a smite, Elemental Weapon), Sharpshooter, attacks linked to inventory items, and a one-armor swap. Item bonuses to spell save DC and spell attack count everywhere.
- **Prepared spells** for Wizards, Clerics, Druids and Paladins with a limit counter, a one-tap **Concentrate** button that asks first if it would end the spell you're holding, and charges on magic items that recharge at dawn or by hand.
- **Sort and Show** on every sheet list, inventory categories, and resource maximums that follow the proficiency bonus or an ability modifier.
- A **fresh update banner** (Refresh or Later) when a new version is live, and **dark mode** that follows your device with an Appearance choice in Settings.
- **Safe on a weak signal:** if a save can't get through, the sheet keeps your changes, retries by itself, and tells you plainly. See _Playing on a weak signal_ below.
- A **companion card** for a mount, familiar or animal friend: picture, HP, AC, speed, all six ability scores and saves to roll, attacks, and bulleted notes, with its own Edit stats lock. A Long Rest heals it with its character.
- A full level-up flow: hit points, ability score improvements or feats, subclass choice at the right level, and new spells that follow each class's own spell slot rules.
- Everything is editable after creation, and race, class, subclass and background can be retyped for homebrew and non-SRD characters.
- **Your Characters** shows each character's portrait, can be put in your own order (saved to your account), and asks on the page before deleting.
- A **Settings** page for your display name, a Reduce Motion override, and email and password changes.

### Homebrew

- A **My Homebrew** page with a guided form for races, classes, subclasses, backgrounds, spells, items and more, with sharing and invite links so a group can use the same homebrew.
- Homebrew shows up in character creation, the reference pages and level-up, and **homebrew classes** (Artificer, for example) can be played.
- **Feats page** (`/feats`, under Explore): the SRD feats from both rule sets, your homebrew feats, and about 75 feats from the official books (Player's Handbook, Xanathar's, Tasha's, Fizban's, Strixhaven). Book feats have a short own-words summary and a link to their full rules, like the book races and backgrounds, with "Make it as homebrew" to use one in level-up. They are also in quick-jump search.
- **Messages button:** a labelled **Messages** pill in the header (quiet outline when there's nothing new; solid terracotta with a red count when there's something unread, and a gentle nudge when one arrives; just the round envelope on small screens). Inside the panel, a **New message** banner appears when one arrives while it's open, and messages that arrive while you're reading are marked **New**.
- **Exhaustion:** a small **?** on the Exhaustion badge opens a card showing all six levels (from the SRD) with the current one highlighted, so the conditions row stays one tidy line.
- **Real dice:** on the character sheet, the dice bar has an **I roll real dice** option. Tap any rollable number (a save, a skill, a death save, damage), then type what your dice show: one number for a d20 (two with advantage or disadvantage), or one number per damage die (for 10d6, ten numbers like `6, 2, 3, 6, 1, 1, 5, 4, 6, 2`). The app adds them up, doubles the dice on a critical hit, and adds your bonus. A short "New to dice?" explainer sits above the bar. On wide screens the sheet's explanations ("What do these boxes mean?" and "New to dice?") sit as collapsed items in the right-hand panel; on smaller screens one **? Help** button at the end of the tab row opens both, and setup choices still to make show as a count on the Features tab. Every roll is remembered on the **Rolls** tab (the last 100 per character, saved on this device), with its dice, extra damage and time; the roll card has a "See my roll history" button. In an attack, "Rolled real dice?" works the same way for damage, and **Add extra damage** adds a Divine Smite, Sneak Attack or Hunter's Mark on top of the weapon. It is on the attack panel (after a hit, type the weapon's dice first, then the extra dice) and also under any damage roll on the sheet. The extra's dice double on a critical hit too. A **Pick a common one** list (Divine Smite by slot level, Sneak Attack by level, Hunter's Mark, Hex, Rage and more) fills in the dice and name for beginners, and the card says "✓ Smite added" with the new total.
- **Book options in character creation:** race, background and subclass lists keep every option visible, split into "Ready to pick" and "From the books" with a chip on each card. A book option offers **Pick it now, add details later**: it saves a private draft homebrew (name, book, link and our own-words blurb), chooses it, and the sheet's setup list (and My Homebrew, with a "Needs details" tag) reminds you to fill in the rules. Saving the entry from the homebrew form clears the reminder. Classes still use the homebrew pop-up.
- **Homebrew feats:** a feat is a name, an optional prerequisite and a description in your own words. Homebrew feats appear in the level-up "Take a Feat" list (marked Homebrew) and on the sheet's Features tab, and they work with Summarize for my group. Feats are text only; any ability score bonus is applied by hand.
- Pre-fill a homebrew entry from rules text you paste in, or from a free option.
- **Summarize for my group:** after pasting rules from a book you own, Claude writes a short own-words summary (mechanics only, never quoting) for you to edit before saving. The pasted text isn't stored. Once saved, the summary shows as "Your group's notes" on that book entry's page, for the people who can see your homebrew. Uses the same Anthropic key as AI search (`POST /api/homebrew-summary`, limited to 10 a visitor per 10 minutes).

### Live play at a table

A DM creates a table with a join code, and players join with one of their characters.

**On the Dungeon Master's screen** (tabs for Combat, Story, Players and Prep):

- An initiative tracker and a private Monster Library. Add many identical monsters at once with nicknames and icons, and roll initiative for every monster in one click. From the table screen the DM can either **Add to the fight** or **Save for later (library only)**, which saves a monster to the library without putting it in the fight and without leaving the screen.
- **Clear monster turns:** each monster has a DM-only HP bar, the current fighter gets a banner saying what to do ("Kobold's turn: tap Attack, then Next turn"), and history from earlier turns is faded so it doesn't look new. On wide screens the attack panel opens beside the row so the Roll button never needs scrolling, and every box in it is labelled.
- A full attack flow: players roll a virtual d20 or type a real one, and the database decides hit or miss against the **secret** AC. The DM can attack with monsters, send damage as a request the player applies, or deny an attack.
- A **party strip** showing every character's portrait, HP, AC and conditions, plus concentration, death saves when someone is down, condition timers, and each companion's HP on its own line. A DM switch shares it with the players (the DM decides whether the party can see each other).
- **Handouts**: pictures and notes the DM reveals to the whole table or to chosen players only. Revealing one adds a note to the journal, and pictures open in a pop-up.
- **Secret messages** between the DM and individual players, with pictures, read receipts, and pasted or dropped screenshots that are shrunk automatically.
- **Table rules:** the DM writes session-zero lines ("no PvP", "phones away") on the Prep tab, and players read them in a collapsed card that shows a "New" tag when it changes.
- **Allowed content:** the DM blocks races, classes, backgrounds, feats or spells for the table. Players see the list, and the Players tab flags a character who doesn't match. It's a guide, not a lock.
- **Away players:** the DM marks someone away and their turns are skipped until they're back.
- **Encounter helper:** suggest a fight by difficulty for the party's level (2014 XP-budget method, SRD monsters), or build your own and add it with stat blocks in one click. **Loot ideas** (coins, a magic item, a small hoard) sit beside it.
- **Previously on... recaps:** one per session, edited by anyone at the table. "Draft from the notes" asks Claude to write a first version from notes shared with the whole table only; private notes never go in.
- **Campaigns:** a table's journal can be split into Campaign 1 and Campaign 2 (anyone at the table can do it), older campaigns stay readable, notes are labelled 1.17 or 2.3 when there's more than one, and each campaign has its own recaps.

**On each player's game page:**

- A character card (portrait, HP bar, AC, conditions) and a button straight to the full sheet.
- Combat and Story tabs, a turn banner when it's your turn, and the party strip when the DM shares it.
- A shared **table journal**: entries are signed by character and grouped by session, unfinished drafts are kept if you switch tabs, and any entry can be **private** (not even the DM can read it). Anyone can file a note under **any session number** (to catch up on an earlier session, or write session 41 of a long campaign), move one of their notes to another session, and use **Look back at** to read any session in full. The DM can set the table's current session to any number. (This needs `20261018_journal_pick_session.sql` run once in the Supabase SQL editor.)
- One **Journal** tab on every character sheet: a private, numbered-session journal that works with or without a table. At a table the tab becomes **Journal & Handouts** with a switch between the table's journal (with its handouts) and **My private notes**. Notes show the writer's portrait beside their name (this needs `20261018_journal_portraits.sql` run once in the Supabase SQL editor). The private journal is readable only by its owner (it lives in the account, not the table). At a table, **Bring notes into the table** lets the player choose, note by note, to share it with the whole table, bring it in as a "Just me" note, or keep it out (with one-tap "everything" shortcuts); notes remember where they were shared so they aren't copied twice. (This needs `20261018_character_journal.sql` run once in the Supabase SQL editor.)
- The table's handouts, also shown on the character sheet.
- A quiet **get-ready heads-up** when you're next in the turn order: a line in the banner, a short buzz on a phone, and the tab title. It's on by default and can be switched off in Settings.

### Playing on a weak signal

Game nights happen in basements and cafés. Every change to a character sheet is written to the device first and saved to the server in the background. If the server can't be reached, a status line says "Not saved yet. Your changes are kept on this device", saves retry on their own (after 4, 8, 16, 30 and then every 60 seconds, and again the moment the connection returns), and the browser warns before you close a tab with unsaved changes. A sheet you've opened before still opens with no signal, from the copy on the device. If the sheet was changed on another device meanwhile, QuestKeeper asks which version to keep instead of overwriting either. The copies are cleared when you sign out. Opening a sheet for the very first time with no signal still needs a connection.

**Hidden stays hidden:** enemy HP, AC and attacks never reach a player's browser. Players see a name, Healthy, Bloodied or Down, and damage taken.

### Design and accessibility

- A warm parchment-and-terracotta design ("Wayfarer") built on shared color, type and spacing tokens, with light and dark themes.
- **A site-wide redesign (October 24 to 25, 2026)** in the "cozy tavern" style: a shared **page banner** (a painting with the page's real heading, eyebrow and description on top, never baked into the picture) on My Games, the DM screen, Your Characters, the reference pages, the Guide, About, Settings, the quiz, character creation and sign-in. Table cards use generic sample landscapes, never real places, and no generated picture ever replaces an uploaded portrait. Banner artwork is sized and cropped so it stays sharp on phones and large screens.
- **Calm loading, empty and error states.** One small shared **status note** (a soft card with a wax-seal dot) says "Loading...", "Nothing here yet" or "Couldn't load...", with a **Try again** button when a retry can help. It's used on Messages, Your Characters, My Games, the Monster Library, the table page and the signed-in check. A failed load is never shown as "nothing here" (a failed characters list used to read "No characters yet"), the DM table page tells a failed request apart from a table that's missing or not yours (and says the same neutral thing for both, so nothing leaks about tables you can't see), and the signed-in check waits a quarter of a second before saying anything so it never flashes.
- **Keyboard and zoom:** layouts are checked at phone (375px), tablet and desktop widths and at real 200% browser zoom. After a retry or a change of view, focus moves to the new heading instead of being lost; the Messages drawer closes on Escape from anywhere and keeps Tab inside itself; and on short or zoomed windows the message box scrolls fully into view. Text colors are measured against the real pixels behind them (4.5:1, or 3:1 for large text).
- **A mobile audit (October 24):** each new page opens at the top and Back or Forward returns to where you were; popups lock the page and close on Back; unfinished homebrew entries and recaps are kept as drafts; text boxes are 16px on touch screens so iPhones don't zoom in; the sheet's tab and every page title are in the address and the tab; screens use the dynamic viewport height.
- Gentle motion that respects Reduce Motion, and nothing loops.

## Tech stack

| Area       | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | React 19, React Router (HashRouter), Vite, CSS |
| Backend    | Node.js, Express, REST routes                 |
| Auth/Data  | Supabase (Auth, Postgres with row-level security, SQL functions, Realtime, Storage) |
| Testing    | Vitest, React Testing Library                 |
| Data       | D&D 5e SRD API (2014 and 2024), Open5e        |
| AI         | Claude API (Anthropic SDK) for search by meaning, called from the backend |
| Hosting    | Render (static site + web service), GitHub Actions |
| Repository | npm workspaces monorepo                       |

For the full product direction and content policy, see [QuestKeeper Project Vision](docs/QUESTKEEPER_VISION.md).

## How the applications communicate

```text
React frontend
    -> QuestKeeper Express backend
    -> D&D 5e SRD API (2014 and 2024) and Open5e
    -> Claude API (search by meaning only)

React frontend
    -> Supabase (accounts, characters, homebrew, portraits,
       tables, combat, messages, journal, handouts)
```

Reference data goes through the Express backend, which fetches it from `dnd5eapi.co` or Open5e and returns it in one consistent `{ data: ... }` shape. Keeping the outside APIs behind the backend gives one place to map, cache and validate their data.

**AI search** (`POST /api/ai-search`) also lives in the backend, so the Anthropic API key never reaches a browser:

- Claude gets a catalog of SRD spells, magic items, classes, races and backgrounds as part of its instructions. That part never changes between searches, so it's cached and later searches cost a fraction of the first.
- It must answer in a fixed JSON shape, at a low effort setting so it's quick. The backend keeps only ids that really exist in the catalog, and fills in names itself.
- Each visitor gets 20 searches per 10 minutes, the search text is capped, and Claude's instructions tell it to treat the player's words only as a search, never as instructions.
- Without a key, or when the service is busy, the endpoint answers with a clear message and the rest of the site is unaffected.

Everything that belongs to a person goes straight from the browser to Supabase, and **row-level security** decides who may read or write each row. Anything secret is protected in the database, not just hidden in the interface:

- Enemy HP, AC and stat blocks live in a DM-only table. Game rules that need them (does this attack hit, how much damage was done, whose turn is next) run inside database functions, so a player only ever receives the result.
- The party strip comes from a function that checks whether the DM has shared it.
- Handouts sent to chosen players can only be read by those players and the DM.
- Private journal entries can only be read by their author.
- Players' shared party strip gets only the companion's name, picture, HP and AC, never its notes or attacks.

## Project structure

```text
QuestKeeper/
|-- .github/workflows/
|   `-- ci.yml                    Lint, tests, build, and a "install like Render" backend check
|-- docs/
|   |-- QA_NEW_PLAYER_WALKTHROUGH.md  New-player QA findings and fix tracker
|   |-- QUESTKEEPER_VISION.md     Product vision and development direction
|   |-- REDESIGN_REFERENCE.md     Where the redesign mockups and art live, and how the art gets into the app
|   |-- TWO_ACCOUNT_TEST.md       End-to-end DM + player test for live play
|   `-- screenshots/              Dated screenshot history (old ones are never replaced)
|-- questkeeper-backend/
|   |-- src/controllers/          Fetches and reshapes SRD and Open5e data
|   |-- src/routes/               Express API routes
|   |-- src/utils/                Mappers, catalogs and the AI search helpers (with tests)
|   `-- src/server.js             Backend entry point
|-- questkeeper-frontend/
|   `-- src/
|       |-- components/           Reusable pieces (sheet tabs, PartyStrip, TableJournal,
|       |                         TableHandouts, TableMessages, RollDock, QuickJump,
|       |                         PageBanner, StatusNote, ScrollManager...)
|       |-- pages/                Pages (Home, reference pages, Guide, Quiz, Homebrew,
|       |                         CharacterCreation, CharacterSheet, Tables, Table...)
|       |-- assets/               Banners, sample campaign landscapes and icons (optimized)
|       |-- utils/                Game rules as plain functions (armor class, skill
|       |                         grants, feature sources and choices, spell components,
|       |                         journal, handouts, party strip...) with tests
|       `-- test/                 Shared test helpers
|-- scripts/                      Python helpers that turn the artwork sheets into the app's optimized banner and picture files
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

For AI search, give the backend an Anthropic API key in `questkeeper-backend/.env` (never committed):

```text
ANTHROPIC_API_KEY=<your Anthropic API key>
```

Everything else works without it; search by meaning just says it isn't set up.

The Supabase values are needed for accounts, characters and tables. Run the SQL files in `supabase/migrations/` (in date order) in the Supabase SQL editor to create the tables, security rules and functions. Restart Vite after changing an environment variable.

## Deployment

QuestKeeper is deployed on Render from the [`render.yaml`](render.yaml) Blueprint:

- [Frontend](https://questkeeper-it0i.onrender.com): `questkeeper`, a Vite static site with a single-page-app rewrite.
- [Backend API](https://questkeeper-api.onrender.com): `questkeeper-api`, a Node/Express web service on the Starter plan. AI search needs `ANTHROPIC_API_KEY` set in the service's environment on Render.

The paid plan keeps the API awake all the time, so there's no slow first request after a quiet spell.

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

- **About 1,900 frontend tests** (Vitest and React Testing Library) cover the game rules as plain functions (ability scores, HP, level-up, rests, armor class, skill grants, feature sources and choices, spell components, death saves, concentration, condition timers, journal and handout rules, party strip) and the sheet, creation, table, journal, Messages, sign-in and search components, including the focus, retry and load-failure behaviour. Whole-character "audit" tests build sample characters of every SRD class and race and check the result.
- **Backend tests** cover the Open5e mappers, the magic item catalog, the spells controller, and AI search (the catalog, checking Claude's answer, the rate limit, and the main failure paths, with the Anthropic SDK replaced by a stand-in so tests never call the API).
- **CI** runs on every push and pull request to `main`: lint, frontend tests, build, backend tests, and a second job that installs the backend exactly the way Render does (`npm ci --workspaces=false`), so a broken lockfile fails CI instead of the deploy.
- **Database security rules** are checked by running each migration in a throwaway local Postgres and calling the functions as a DM, a player and an outsider.
- **Hands-on QA:** a [new-player walkthrough](docs/QA_NEW_PLAYER_WALKTHROUGH.md) tracks more than 60 usability findings from a first-time player's point of view, and a [two-account test](docs/TWO_ACCOUNT_TEST.md) (DM and player) walks through live play end to end, with a stage added for each new live-play feature (the latest are recaps and campaigns, allowed content, the weak-signal sheet and the redesigned DM screen).
- **Browser checks for the redesign:** pages were checked in real Chrome at phone, tablet and desktop sizes, in both themes and at real 200% zoom, with real key presses and text-contrast measured from pixels. Those checks used sample data and stand-in stores; a pass with real signed-in accounts on a real phone is still to do.

## Challenges, setbacks and how I solved them

### Every backend deploy silently failed for weeks

**Problem:** After the Open5e work (#109), the backend's lockfile no longer matched its `package.json`. Render installs the backend on its own, so every deploy failed, and Render kept quietly serving the old code. Locally everything worked, because the monorepo installs differently.

**How I found it:** New API features were missing on the live site even though they had been merged. Render's deploy log showed the failed install.

**Solution:** I regenerated the lockfile, and CI now has a `backend-deploy-install` job that installs the backend exactly as Render does. The same mistake now fails a pull request instead of a deploy.

### The paid Render plan returned 502 errors

**Problem:** To stop the API from sleeping, I moved it to Render's Starter plan. The service reported healthy and its logs were clean, but every request came back as a 502 with Render's own `dynamic-paid-error` routing header.

**What I tried:** I restarted the service, ruled out scheduled maintenance, checked the logs, and opened a support ticket (escalated past Render's AI assistant to their team).

**What I did meanwhile:** I moved back to the free plan (#137) so the site works, and added a Monday keep-awake workflow (#138) so game night wasn't slowed by cold starts.

**Solution:** On 2026-10-28 I tried Starter again and every request worked, so the API stays on the paid plan and the keep-awake workflow is gone.

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

### Delete buttons that silently did nothing

**Problem:** Deleting a character sometimes did nothing at all: no error, no change.

**Cause:** Two quiet failures look identical. A browser can be set to block pop-ups, which makes a "Are you sure?" dialog answer "no" instantly. And the database doesn't report an error when row-level security stops a delete; it simply deletes nothing.

**Solution:** Deletes now ask on the page itself (Delete / Keep) instead of a browser pop-up, and the app asks the database for the deleted row back. If nothing came back, it says the delete failed instead of pretending it worked.

### A companion lost to a stray tap

**Problem:** While I was testing, a single tap on Remove took away a companion (with its stats and attacks) with no warning.

**Solution:** Remove now asks first, and removing only hides the card: the companion's details are kept, so adding a companion again brings everything back.

### Retyping HP counted as falling to 0

**Problem:** Clearing the HP box to type a new number passes through an empty box, which reads as 0 HP. With concentration and death saves, that would have dropped a spell and added a death save failure mid-keystroke.

**Solution:** Only damage applied from the DM counts as one clear hit (ending concentration at 0, failing a death save at 0). Typing in the HP box only shows the concentration reminder, and an empty box is ignored.

### Timers that had to survive reloads and new fights

**Problem:** Condition and concentration timers count the table's rounds. A reload mustn't count the same round twice, and a new fight starts back at round 1, which mustn't count as time going backwards.

**Solution:** Each sheet remembers the last table and round it counted. It counts only rounds after that one at the same table, and simply resyncs when the table changes or the round drops. (Two open tabs of the same sheet would each count a round; that's noted as a limitation.)

### Using AI without opening a hole or a bill

**Problem:** AI search needs an API key, and a public endpoint that calls a paid API can be abused or run up costs. A model's answer also can't be trusted to name only real entries.

**Solution:** The key lives only in the backend's environment, results are limited to real catalog ids, the catalog is cached, each visitor is rate limited (with Render's proxy trusted so the limit sees real visitors, not one shared address), and the search runs only when a player picks it, never on each keystroke.

### Her fiancé's old campaign notes were mixed into the new campaign

**Problem:** A table's journal held two campaigns in one list. The older campaign's notes (1.1 to 1.43) had been typed in a single evening, after the current campaign's notes, so I couldn't assume "the oldest notes are the old campaign". My first "start a new campaign" tool split by session number and gave the wrong answer for her data.

**Solution:** The split is now by a window of dates: the notes written inside it stay as the older campaign and everything else becomes the current one. The tool looks for a burst of notes written close together and asks one question ("Are these your older campaign's notes?" Yes or No). The first design had so many buttons that it was overwhelming, so the extras moved behind "More options" and Move went inside Edit. Since the journal only showed a weekday and time, every note now shows its full date. Anyone at the table can sort notes, because the DM of the new campaign isn't the player who wrote the old ones. The database function was run against a copy of her real data before she used it.

### A weak signal could lose a sheet change without saying so

**Problem:** A failed save on a sheet was easy to miss, and the next successful save could overwrite or drop it.

**Solution:** A save queue now keeps every change, retries with a growing delay, and shows a status line. A copy is kept on the device, and if the server's version changed in the meantime, the player chooses which to keep. The queue's timers and "latest attempt" handling use refs to stay within the project's strict React lint rules.

### The recap must never leak a private note

**Problem:** An AI recap built from "the journal" could pull in a private note or a DM-only one.

**Solution:** The draft button sends Claude only the notes shared with the whole table. Private notes never leave the database for this feature.

### Phone testing found pages opening halfway down

**Problem:** A friend testing on his phone found the Guide opened mid-page, and a quiz result was lost when the page reloaded.

**Solution:** A small scroll manager puts every new page at the top and restores your place on Back and Forward. Quiz answers are kept on the device and in the results link, character creation got an address for each step plus a saved draft, and popups close on Back. A full pass over ten more phone problems followed (see Design and accessibility).

### Banners that looked soft, and measuring instead of guessing

**Problem:** The first redesign banners were small pictures stretched across wide pages, and some of the cropped art lost its subject.

**Solution:** I measured the real pixels each banner shows on each screen, replaced them with larger paintings, bounded how wide the art is drawn, gave each banner its own focal point, and checked them at 2x and at real 200% zoom. Text over the pictures sits on a dark wash, and its contrast is measured against the actual pixels behind it, not eyeballed. That also showed the tool's first "failures" were measuring mistakes (it was averaging over picture edges), so I now check the method before trusting a number.

### Keyboard checks found what the tests didn't

**Problem:** Automated tests passed, but real key presses in a real browser at 200% zoom showed that Tab could leave the Messages drawer into controls hidden behind it, Escape only worked from inside it, retrying a failed load dropped focus to the top of the page, and the message box sat half off-screen.

**Solution:** The drawer now keeps Tab inside itself and closes on Escape from anywhere, focus moves to the new heading after a retry or a change of screen, and a focused box scrolls fully into view. Each of those has a regression test, so the browser check only has to find them once.

### Smaller setbacks along the way

- **A pull request merged before its second commit was pushed.** The missing commit was cherry-picked into the next pull request (#151). I now check `git status` and `git log` against `origin/main` before every new branch.
- **A lint rule** (`react-hooks/immutability`) flagged an effect that called a function declared further down. The effect was moved below the functions it uses.
- **The phone header overlapped at 375px**, and on tablets the Stats | Skills switch crowded the character's name. The header was tightened and the switch moved onto the controls line.
- **The search used to depend on every category** loading, and **only one background** (Acolyte) exists in the 2014 SRD. That's a licensing limit, not a bug. The 2024 SRD and Open5e now add more.
- **A commit landed on local `main` by mistake**, so the next pull request carried an extra commit. It was untangled with git and moved to a branch.
- **I once said a pull request was merged before checking.** Now `git fetch` and a look at `origin/main` come first.
- **The local test database** needed fixes of its own (socket paths that were too long, a locale setting), which cost time but not users.
- **Headless screenshots of the guide came out blank** because the page hadn't finished loading. Giving the browser more time fixed it.

## Where things stand

### Working on now

- **The site-wide redesign is done** (October 24 to 26): the tavern homepage, all four DM screen tabs, banners on every page, the quiz and character creation, sign-in and Messages, Homebrew (the list, editor, invite page and sharing), a Not Found page and a crash fallback, letter tiles on every picker card, and calm loading and error states throughout. The character sheet's three-column layout stays as it is; a small alignment polish is still optional.
- A **real-device check** of the redesign and the mobile audit (a signed-in pass on a real phone), since the browser checks so far used sample data and stand-in stores.
- Running the **two-account test** for the newest features (recaps and campaigns, allowed content, the weak-signal sheet and the redesigned DM screen) before the next game night.
- **Choosing a new name.** Other sites already use "QuestKeeper" for a similar idea, so the name is changing. The rename is on hold until a name is chosen.

### Blockers and the plan around them

- **The name isn't unique.** Plan: pick a name, check the web and domain availability, then rename the text across the app and docs in one pass (the repo, the Supabase project and the Render service names can stay as they are at first). The same domain can then be used for Google sign-in.
- **Google sign-in** is waiting on a Google Cloud OAuth client and the Google provider in Supabase. Publishing the consent screen may reject an `onrender.com` address, so the choice is test mode with a small list of users, or a domain of its own after the rename. The secret never goes in chat or the repo. The button gets built after the name is settled.
- **Opening a never-seen sheet with no signal.** The weak-signal tools cover sheets already opened. A progressive web app (a service worker) would make the whole app open offline. That's a bigger step and is deliberately not built yet.
- **Migrations run by hand.** Each new feature ships a SQL file that has to be run in the Supabase SQL editor, in date order. Plan: keep listing the exact files in each pull request, and look at the Supabase CLI later.
- **Newest features not yet played with two accounts.** Plan: the checklist now has steps for each, and they get run before game night.
- **Book content licensing:** subraces like Wood Elf and Drow, and Tasha's optional class features, aren't in the SRD. They can only be listed as names, summaries and links, or entered as homebrew.
- **Free Supabase plan:** has no automatic backups, so data is exported by hand now and then (most recently a full database dump on October 16, 2026).
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
- AI search covers the SRD's spells, magic items, classes, races and backgrounds, not Open5e, book listings or homebrew yet, and needs an Anthropic API key.
- The encounter helper uses the 2014 XP-budget method and SRD monsters only, and its loot scale is my own rough guide.
- The allowed-content list is a guide: it flags mismatches but doesn't stop a player from picking something, and it doesn't filter the builder's pickers yet.
- Recap drafts need the Anthropic key on Render, like AI search.
- **Activity icons:** the DM screen shows a small icon on a log line that carries an explicit kind (attack, damage, healing, spell, turn, handout). The database change that adds kinds (`20261024_activity_kinds.sql`) is in the repository and has been run in Supabase, but only the handout notice sends a kind so far, so most log lines still show no icon. The plan is in [docs/ACTIVITY_EVENT_KINDS_PLAN.md](docs/ACTIVITY_EVENT_KINDS_PLAN.md).
- An unexpected crash shows a calm "Something went wrong" card, but it only catches errors made while a page is drawn, not failed requests (those keep their own messages).
- Subrace and subclass cards use a letter tile instead of artwork, on purpose (a picture could suggest what a lineage or subclass looks like). Generated character, creature and item artwork was prepared but never used, so it was removed (see `docs/REDESIGN_REFERENCE.md`).
- Round timers are counted by each open copy of a sheet, so the same sheet open in two tabs would count a round twice.

## Ideas and roadmap

What would make QuestKeeper even better than it was yesterday (encounter prep, recaps, campaigns, allowed content and weak-signal saving from earlier lists are built):

1. **Book subraces as link-outs:** Wood Elf, Drow, Mountain Dwarf, Stout Halfling and Forest Gnome as names, summaries and links, with a one-tap "Make as homebrew".
2. **Sorting and filtering** on the sheet (items by category, spells by level, favorites), and **splitting item stacks**.
3. **Better paste-fill** that reads more formats of pasted rules text.
4. **Automated database and end-to-end tests** for the table rules, so the two-account test can run itself.
5. **Backend caching and timeouts,** and global search that keeps working if one category fails.
6. **A beginner mode toggle** to hide hints once a player doesn't need them.
7. **More table tools:** a shared list of NPCs and places, open quests and threads, a quiet pause button for comfort, the DM tracking a monster's concentration, and table hints.
8. **More AI help** on top of search by meaning: backstory ideas, "describe the vibe" character suggestions, and AI search over Open5e and homebrew too.
9. **Works with no signal at all** as an installable app, and **Google sign-in** after the rename.

The roadmap stays incremental: each feature should be small enough to understand, build, test and review before the next one.

## Project timeline

- **June 10, 2026:** first commit. A React search over the SRD with a separate Express backend.
- **Summer 2026:** combined into one monorepo; reference pages, global search and the "Wayfarer" design.
- **September 2026:** accounts, the guided character builder, the tabbed character sheet, level-up and rests.
- **Early October 2026:** live tables with secret enemy stats, the attack flow and a monster library; a new-player QA walkthrough.
- **Mid October 2026:** Open5e and book listings, homebrew, magic items, the quiz, rules words, shared rolls, secret messages, the Adventurer and Dungeon Master split, party strip, journal, handouts, the player game page and a full character audit.
- **October 15 to 17, 2026:** a full companion card, an orderable characters list, a clearer DM combat screen, party portraits, a Settings page, death saves, concentration, round timers, tidier class pages and **AI search by meaning** with Claude.

- **October 18 to 19, 2026:** a journal for every character, dark mode, level-up that asks for class feature choices, a calmer sheet, weapons and armor that do the math, multiple companions, and Messages with receipts and screenshots.
- **October 20 to 21, 2026:** prepared spells, table rules, away players, the encounter and loot helpers, the get-ready heads-up, recaps, campaigns, the allowed-content list and the weak-signal sheet.
- **October 22 to 26, 2026:** the tavern homepage and a redesign of all four DM screen tabs, a mobile audit from a friend's phone testing, and the site-wide redesign (banners, My Games, Your Characters, the quiz, character creation, sign-in, Messages, Homebrew, a Not Found page and crash fallback, and calm loading and error states).

As of October 26, 2026 there are 240+ merged pull requests and 320+ commits.

## Content and licensing principles

QuestKeeper targets the 2014 rules and shouldn't silently mix editions or reproduce protected material without permission. Before adding a source, I document its edition, who provides it, what it covers, its license and attribution requirements, and whether QuestKeeper may reproduce its text, link to it, or store only private user notes.

The full policy is in [docs/QUESTKEEPER_VISION.md](docs/QUESTKEEPER_VISION.md), and every source in use is credited on the in-app Attributions page.
