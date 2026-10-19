# QuestKeeper QA: New Player Walkthrough

A living record of what a first-time player experiences on QuestKeeper, what is good, what is confusing, and what has been fixed since. Each walkthrough gets its own dated section at the bottom, and the **Fix tracker** is updated as items are completed.

- **Walkthrough 1:** 2026-10-03, live site (questkeeper-it0i.onrender.com), plus a read of the source.
- **Walkthrough 2:** 2026-10-17, live site while signed in, by an AI auditor using the prompt in [QA_AUDITOR_PROMPT.md](QA_AUDITOR_PROMPT.md). Findings are rows #42 to #55.
- **Method:** Logged-out pages clicked through live at desktop and 375 px width. Character creation, the sheet and Tables were read in the code first, then walked live with a test character and table (named "QA ..." so they are easy to delete). The browser pane was too small for screenshots, so live findings come from page text and measurements.
- **Not covered:** the player side of a live fight (join, roll initiative, attack, apply damage, End my turn). It needs a second account.

## Summary

QuestKeeper looks warm and works well on a phone, but a first-time player hits dead-end screens, unexplained choices and thin reference pages before they ever see a character sheet.

**What works.** The look is warm and consistent. Phone layout has no horizontal scroll on Home, Races, Spells, Guide or Login. The Guide page is friendly. Ability score assignment (with hints) and the creation progress rail are good. Hidden-HP combat is a strong feature.

**What hurts a first-timer most.** Reference pages show a fraction of what the data has. Creation showed screens that do nothing for most characters. Choices (skills, spells, classes) were offered with no explanation. The sheet's abbreviations had no help.

## Fix tracker

Status as of 2026-10-03. "Merged" means the fix is on `main` (PR for `fix/new-player-quick-wins`, squash-merged 2026-10-03).

| # | Change | Area | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Skip creation steps that don't apply (subrace, cantrip, subclass, spells); fix doubled subclass message | Creation | Small | Merged |
| 2 | Fix the Tiefling message and add Thaumaturgy to Tiefling sheets | Creation | Small | Merged |
| 3 | Show racial traits on race details; class features and spellcasting on class details; split the glued "skill choices" sentence | Reference | Small | Merged (2026-10-05): race pages show traits, languages, age and size; class pages show level 1 features, later features, spellcasting and one line per skill choice; saving throws no longer listed twice |
| 4 | Show full spell details (components, school, classes, higher levels) by reusing the pop-up formatter | Reference | Small | Merged (2026-10-05): spell pages show school, components, concentration, ritual, classes, every paragraph, higher levels and tables |
| 5 | Guide in the menu, 404 page, fix the 800-1100 px menu overflow | Navigation | Small | Merged |
| 6 | Tooltips and a glossary for AC, Init, Temp, Prof, Hit Dice, P, Save | Sheet | Small | Merged (tooltips on Temp, AC, Init, Prof, Level; glossary panel covers the rest) |
| 7 | Make Level read-only | Sheet | Small | Changed: kept editable (it is how people enter an existing character), added a tooltip pointing to Level Up |
| 8 | Rename "Standard Array" to "Balanced set" and "Roll for Stats" to "Roll dice" | Creation | Small | Merged |
| 9 | Edit links on the Review page that return to Review | Creation | Medium | Merged (2026-10-05): Review page redesigned into cards with a Change button on each, a "Fix this" list for anything missing, and a Back to review banner while editing |
| 10 | Skill descriptions and a pick-these-if-unsure tip | Creation | Medium | Merged (skills step now shows ability and a one-line description) |
| 11 | Tap-to-expand spell summaries on the starting spells step | Creation | Medium | Merged (2026-10-05): every starting cantrip and 1st-level spell shows a tag and a one-line summary with a Read more button for the full text, in the class spell step and the High Elf cantrip step |
| 12 | Plain "good if you want..." blurbs on every race and class card | Creation, Reference | Medium | Merged (2026-10-05): every race and class has a short tagline on its card and a "Good if you want..." callout (plus role and difficulty for classes) on the detail panel and in creation |
| 13 | Spells page filters (level, class, school) and a scrolling or paged list | Reference | Medium | Merged (2026-10-05): Level, Class and School dropdowns that combine with the name search, a Clear filters button and match count, level and school on each card, and 40 spells at a time with a Show more button (the page starts about 5,800 px tall instead of 35,000) |
| 14 | Set armor class from starting armor; add starting weapons to Actions; fill languages | Sheet | Medium | Merged (2026-10-05): AC from starting armor and shield, starting weapons on Actions with to-hit and damage, languages, class proficiencies |
| 15 | First-run prompts on each empty tab, with one-tap "add from inventory" | Sheet | Medium | Merged (2026-10-05): every empty sheet list shows a prompt saying what goes there and which button to press; the backstory box asks "Who were you before the adventure?"; Actions offers a "From your inventory" button per SRD weapon not yet an attack; Add Weapon fills in to hit and damage (including "+1" magic weapons) and explains it in plain words, with a "How is this worked out?" toggle |
| 16 | Feedback link on detail pages | Reference | Small | Merged (2026-10-05): every detail panel (races, classes, spells, backgrounds, search, creation) ends with "Something wrong or confusing about <name>? Tell us", opening a GitHub issue titled "Feedback: <name> (<type>)" |
| 17 | Table first-time hints, a DM prep checklist, a "How combat works" Guide page | Tables | Medium | Merged (2026-10-05): DM "Before the fight" checklist that ticks itself off; "Roll initiative" card for players at the top of Combat (physical rolls take just the die, like attacks); "Waiting for initiative" listed first and highlighted; DM nudges (card glows and shakes, 4 s cooldown); one-line player tips; Tables page explainer; "At the table" Guide section; turn banner shows the next two in order |
| 18 | Search by meaning ("sneak", "heal", "damage") | Search | Large | Merged (2026-10-16, #160): "✨ Search by meaning" asks Claude to pick spells, magic items, classes, races and backgrounds that fit what the player typed, each with a one-line reason. Runs only when asked, through the backend, so the API key never reaches a browser |
| 19 | "Not sure?" class helper quiz | Creation | Large | Merged (2026-10-12, #131 and #133): the character quiz at /quiz suggests builds, and "Use this build" fills in character creation |
| 20 | Decide how to use the 2024 backgrounds in creation | Creation | Large (product decision) | Open |
| 21 | Grey out skills the background already grants | Creation | Small | Merged (background now comes before skills) |
| 22 | Fix the 16 px sideways scroll on the phone sheet; show vitals before the skills list | Sheet | Small | Merged |
| 23 | Duplicate library entries: disable the button after the first click | Library | Small | Merged (2026-10-05): saving a monster to the library skips an exact copy |
| 24 | Confirm step before deleting a table, character or library entry | Tables, Library | Small | Already in place: character, table and library deletes all ask first (verified in code) |
| 25 | Show join errors next to the Join form | Tables | Small | Merged (2026-10-05) |
| 26 | Default monster attack targets to the opposite side | Tables | Small | Merged (2026-10-05): targets are grouped into Opponents and Same side |
| 27 | Let players retype name, race, class, subclass, background and spellcasting ability, and toggle saving throw proficiency, so homebrew and non-SRD characters match a paper sheet (Story tab and Save badges) | Sheet | Small | Merged (2026-10-04) |
| 28 | Flat bonus fields and expertise: a "Bonus to all saves" box (Aura of Protection, Cloak of Protection), per-skill bonus boxes behind a Bonuses button (Jack of All Trades), and skill expertise (click the badge: P, then E). Found by comparing a real Google Sheet to a QuestKeeper sheet | Sheet | Small | Merged (2026-10-04) |
| 29 | Temporary AC bonus box (Haste and similar) that shows "+2 = 23" next to AC without overwriting the base AC; the DM's view of a player sheet uses the total | Sheet | Small | Merged (2026-10-04) |
| 30 | DM: nicknames and animal icons for identical monsters ("Tell them apart": e.g. "Goblin (red duck)"), an icon picker in Edit, and a visible tip that the How many box adds several of the same monster at once | Tables | Small | Merged (2026-10-05) |
| 31 | DM: roll initiative for monsters. A per-monster Roll d20 button, a "Roll initiative for N monsters" button that skips any monster that already has an initiative (so a boss can be rolled with real dice), and an Initiative bonus field on the stat block | Tables | Small | Merged (2026-10-05) |
| 32 | DM add-monster form: visible labels above Name, How many, HP, AC and Initiative, and above each attack's name, to-hit and damage, so values filled in from a library entry can still be read (found while using the library autofill) | Tables | Small | Merged (2026-10-05) |
| 33 | Class features and racial traits on the sheet: new characters arrive with their race's traits and level 1 class features written in, and the Features tab has "Add from my class and race" (ticks everything up to your level, skips what you already have) for existing characters and level-ups. Found by comparing a real sheet whose Features tab was empty | Sheet, Creation | Medium | Merged (2026-10-05) |
| 34 | Character creation layout: steps run as a row across the top with arrows, "Your hero so far" is a slim strip under them, the detail panel gets the full width, spell choices stack in one column so Read more never stretches a neighbour, narrow steps get a Tips card (with a slot for pictures) beside them, and options you can't pick are clearly marked as locked | Creation | Medium | Merged (2026-10-05) |
| 35 | Beginner/Seasoned toggle: one account-level switch (e.g. "Show beginner tips") that hides or shortens beginner help everywhere, so experienced players get a cleaner page. Steps: list every beginner element (save-badge tip, "What do these boxes mean?", empty-tab prompts, the To Hit tip strip, creation Tips cards, "Good if you want..." callouts), decide hide vs shorten for each, then route them through one shared wrapper so future tips follow the switch. The unused per-character `experienceMode` field could be retired or reused. Raised while reviewing the To Hit helper text | Sheet, Creation | Medium | Open |
| 36 | DM monster rows: put Attack first and group Damage/Heal under an "HP" label so it is clear they change that monster's HP; in the monster attack panel, a helper when the monster has no saved attacks (what to type, typical + hit); monster attacks on players should count the player's temporary AC bonus. Found while running a test fight as DM | Tables | Small | Merged (2026-10-05): Attack first, Damage/Heal in a labelled HP box, Edit/Remove set apart; no-attacks and + hit help in the attack panel; migration 20261005_player_ac_bonus.sql adds the temporary AC bonus to monster attacks on players (applied to production) |
| 37 | Starting equipment choices in creation: a Gear step after Abilities with one box per either/or choice ("(a) chain mail or (b) leather armor, longbow and 20 arrows"), the classic option preselected, dropdowns for "any martial weapon" style picks from the SRD item lists, "if proficient" notes, and the Acolyte's holy symbol. Chosen gear sets AC and becomes attacks; Review lists it with a Change button. Tool and instrument proficiency choices are still manual | Creation | Medium | Merged (2026-10-05, #104) |
| 38 | The header menu wrapped at 1280px: "My Characters", "Monster Library" and "Log In" each broke onto two lines once Tables and Monster Library had been added (the menu needed about 1313px but only collapsed below 1200px). Links now never wrap, spacing is a little tighter (the menu needs about 1180px), and it collapses behind the Menu button below 1240px. The Log In link also looked cramped (it never set its own box, and on narrow screens sat in a fixed 64px column at 12px text): Log In is now a filled call-to-action button and Log Out a quieter outlined one, both properly sized, and the narrow header's side columns fit their content so the logo stays centred. Found in a portfolio review, 2026-10-07 | Navigation | Small | Merged (2026-10-07, #105) |
| 39 | Search, Races, Classes, Spells and Backgrounds showed an empty "Select an Item" details panel beside the results until one was clicked. The results now fill the page as a grid of cards, and the list + details layout opens when a result is picked. Found in a portfolio review, 2026-10-07 | Reference, Search | Small | Merged (2026-10-07, #105) |
| 40 | Narrow-screen menu as a spinning wheel: with the menu open below 1240px, the links sit on a drum (about five at a time, the centred one large in a highlighted band, the rest tilting away), snap into place when swiped, scrolled or moved with the arrow keys, and open with the current page centred. Tapping an off-centre link spins it in, then follows it, and picking any link now closes the menu. Plain list for people who prefer reduced motion; wide screens unchanged | Navigation | Medium | Merged (2026-10-07, #106) |
| 41 | Character sheet on phones: the six ability tiles (STR, score, modifier and Save badge on one line, three across) overlapped each other, and the tabs and Level Up / rest buttons wrapped into a jumble. On phones the stat boxes now sit on an even 4-column grid (Hit Points, Hit Dice and Gold double-width), each ability stacks (name, score + modifier, Save badge) in two rows of three, the tabs are equal buttons three per row with the current one filled, and Inspiration, Level Up, Long Rest and Short Rest form an even 2 x 2 grid. Attack rows no longer run off the right edge (their column widths were inline styles the phone rule couldn't override); on phones each attack shows its name, then labelled To Hit / Damage / Type, then its buttons. Below 1024px a Stats | Skills switch beside the name flips the top of the sheet to the skills list, instead of skills sitting at the very bottom. Desktop unchanged | Sheet | Medium | In review (2026-10-07) |
| 42 | AI search and "Summarize for my group" say "isn't set up yet" on the live site (the backend answers 503, so `ANTHROPIC_API_KEY` isn't set on Render). Quick-jump still offers "Search by meaning" as its first row, and "No names match... Try Search by meaning above" leads to that dead end. Fixed 2026-10-17 with no code change: a key made in the Claude Console (QuestKeeper workspace, no expiry) was added to Render as `ANTHROPIC_API_KEY`, and both features were checked live | Search / Homebrew | Small | Fixed (found 2026-10-17) |
| 43 | Creation pickers mostly list options a player can't choose: Backgrounds shows 75 entries and only Acolyte plus homebrew can be picked (the 47 official-book ones lead to "make it as homebrew"); Races is similar. Fixed 2026-10-17 without hiding anything: the lists are split into "Ready to pick" and "From the books" with a chip on each card, and a book option has "Pick it now, add details later" (a private draft, with a reminder on the sheet and a "Needs details" tag in My Homebrew) | Creation | Medium | Fixed (found 2026-10-17) |
| 44 | Phone sheet touch targets: 51 controls under 40px tall at 375px, some only 14 to 19px ("↺ auto", "Edit details", the setup-choice link, "Join a table"); anything under 24px fails WCAG 2.5.8. Pad every control to about 44px | Sheet | Medium Fixed 2026-10-18: on phones "Edit details" and "Join a table" are 44px tall, and "↺ auto" has a bigger invisible tap area (the other small controls are not all covered yet). | Fixed (found 2026-10-17) |
| 45 | No way to quit creation midway: Cancel only appears on the first step (it took 7 Back presses to reach it). Add Cancel or "Start over" to every step. Fixed 2026-10-17: every creation step after the first now has "Cancel and discard this character" (it asks first) | Creation | Small | Fixed (found 2026-10-17) |
| 46 | The sticky "Next d20" bar covers the bottom of the sheet on phones (the edge of cards and the tab row). Add bottom padding equal to the bar's height | Sheet | Small Fixed 2026-10-18: on phones the sheet leaves 140px under the last card. | Fixed (found 2026-10-17) |
| 47 | Card summaries are hover-only, so a phone never sees them; the hovered card also grows and overlaps the next one. Races show a one-line tagline on every card but Feats don't. Show a short visible line on cards | Reference | Small Fixed 2026-10-18: Feat cards show the summary's first sentence (two lines at most) on every device. | Fixed (found 2026-10-17) |
| 48 | Every page's title is "QuestKeeper" (WCAG 2.4.2) and there is no skip link (2.4.1). Set a title per page ("Feats · QuestKeeper") and add a skip link. Fixed 2026-10-17: each page sets its own tab title ("Feats · QuestKeeper") and there is a skip-to-content link for keyboard users | All pages | Small | Fixed (found 2026-10-17) |
| 49 | The book feat hint says "(or paste the rules for QuestKeeper to fill in the numbers)", but for feats nothing is filled in (only Summarize applies). Tailor the sentence to feats. Fixed 2026-10-17: the book feat hint now talks about Summarize for my group | Reference | Small | Fixed (found 2026-10-17) |
| 50 | 2024 SRD feat details don't show the feat type (Origin, General, Fighting Style, Epic Boon) although the data has it. Show it under the name. Fixed 2026-10-17: the feat type shows under an SRD feat's name | Reference | Small | Fixed (found 2026-10-17) |
| 51 | Home "Browse Categories" lists four categories; Feats and Magic Items are missing. Fixed 2026-10-17: Home now lists Feats and Magic Items (six cards in two rows) | Home | Small | Fixed (found 2026-10-17) |
| 52 | The "SRD 5.1" badge text is 11px at 3.93:1 contrast (needs 4.5:1). Darken it | Reference | Small Fixed 2026-10-18: the SRD badge uses the full text color. | Fixed (found 2026-10-17) |
| 53 | QA Rowan (a level-1 Bard) shows "6 spells are missing components. Fill in from the SRD". Check whether a freshly created caster gets this too, and fix it if so | Sheet | Small Checked 2026-10-18: a freshly created caster already gets its components filled in at creation (only a failed look-up leaves them blank, and the button covers that), so the banner on QA Rowan came from an older character. | Fixed (found 2026-10-17, needs a check) |
| 54 | A disabled Next on the Skills step gives no reason beside the button (the "Chosen 0 of 2" hint is further up). Add a hint next to it | Creation | Small Fixed 2026-10-18: beside Next it says "Pick 2 more skills to continue." | Fixed (found 2026-10-17) |
| 55 | No dark mode: the app ignores the system's dark setting. Optional | All pages | Large Fixed 2026-10-18: the app follows the device's light or dark setting, and Settings has an Appearance choice (Match my device, Light, Dark). | Fixed (optional, found 2026-10-17) |
| 56 | Magic armor (Armor of Invulnerability, Elven Chain, +1 Armor, Dragon Scale Mail and the rest) had no Wear button and didn't count toward AC. Fixed 2026-10-17: it counts as the armor it's made from plus its bonus; armor that can be any type (+1, Mithral, Adamantine, Armor of Resistance) reads the type from the name, like "+1 Chain Mail". Book-only armor still needs a typed AC | Sheet | Medium | Fixed (found 2026-10-17 at the table) |
| 57 | Level-up gives every caster exactly one new spell at every level, whatever the class table says. A Ranger should learn 2 at level 2 and none at 4, 6, 8 and 10, so a Ranger taken to 11 ends with 10 spells instead of 7. Wizards should add 2 to the spellbook; Clerics, Druids and Paladins prepare from the whole list and shouldn't "learn" one at all; new cantrips should follow the cantrips-known column. Use the class's per-level spells-known and cantrips-known numbers to decide how many picks (or none) each level gets. Fixed 2026-10-18: the spell step now follows the SRD class tables. Bards, Rangers, Sorcerers and Warlocks learn the difference between their spells known and what the sheet already counts (a Ranger taken 1 to 11 ends with 7); Wizards add 2 spellbook spells a level; Clerics, Druids and Paladins only get new cantrips; cantrips are a separate pick. Racial cantrips and ticked bonus spells don't count. Homebrew "known" casters are offered one spell a level, which they can skip | Level up | Medium | Fixed (found 2026-10-18 levelling Pippa) |
| 58 | No way to swap a spell on level-up. Bards, Rangers, Sorcerers and Warlocks may replace one spell they know with another of a level they can cast each time they level up; without it a player who took a placeholder (because the spell they wanted is too high a level) is stuck with it. Add an optional "Swap a spell" choice to the spell step. Fixed 2026-10-18: known casters get "Swap one spell you know (optional)" on every level-up, even a level with no new spells. The new spell must be a class spell of a level they have slots for; bonus spells can't be swapped out | Level up | Medium | Fixed (found 2026-10-18 levelling Pippa) |
| 59 | Spells that don't come from the class list can't go on the sheet. Subclass and optional-feature spells (Fey Wanderer's Charm Person, Misty Step, Dispel Magic, Summon Fey; Primal Awareness's Speak with Animals, Beast Sense, Speak with Plants) aren't added and don't count toward spells known, and book spells (Absorb Elements, Ensnaring Strike, Elemental Weapon) aren't in the picker at all. Add "Add a spell" on the Spells tab that takes an SRD spell or a typed name with a book link (no book text), with a "Doesn't count toward spells known" tick. Fixed 2026-10-18: Add Spell on the Spells tab now has a "Book link (optional)" box and a "Doesn't count toward spells known" tick. SRD names still fill in level and components; other names are typed by hand. Ticked spells show a "Bonus" tag and level-up leaves them out of the count | Sheet, Level up | Medium | Fixed (found 2026-10-18 levelling Pippa) |
| 60 | Level-up never asks for class feature choices: Fighting Style (Ranger and Paladin at 2, Fighter at 1), Expertise (Rogue, Bard), Metamagic, Eldritch Invocations and Pact Boon, and the Ranger's extra Favored Enemy and terrain. The features show up as text but the choice is never made or recorded. Add a step for each choice the new level brings. Fixed 2026-10-18: a "Class Choices" step comes before spells at every SRD level that brings a pick (Paladin 2, Ranger 2/6/10/14, Rogue 6, Bard 3/10, Sorcerer 3/10/17, Warlock 2, 3 and each new invocation, Champion 10). It offers the SRD options with their text, skips ones already on the sheet, hides invocations for a higher level and notes other prerequisites, and turns Expertise picks into doubled skills. Fighting Styles, Metamagic, Pacts and Invocations also take "Book option instead": a typed name and optional link, never the book's text. Invocation counts follow the Player's Handbook (the SRD API's are off). Later the same day: a Ranger's Favored Enemy and Natural Explorer picks can be skipped ("my table uses a book replacement", for Tasha's Favored Foe or Deft Explorer), and the skipped feature isn't added to the sheet. Not covered: swapping an invocation, Battle Master and other book subclasses, homebrew classes | Level up | Large | Fixed (found 2026-10-18 levelling Pippa) |

## Reference pages (logged out)

Tested on the live site at desktop width and at 375 px phone width.

### Navigation

All ten top-bar links loaded: Home, Races, Classes, Backgrounds, Spells, My Characters, Tables, Monster Library, About, Log In. The three personal pages send a logged-out visitor to a bare Log In form with no explanation.

- **The Guide was not in the menu.** "Learn the basics" was only reachable from a Home card.
- **Menu overflowed sideways between roughly 800 and 1100 px.** At 1024 px the page was 1106 px wide and About and Log In fell off the edge.
- **Unknown addresses showed an empty page,** not a 404.
- **No footer links.** The footer had only a tagline and a copyright line.

### Search

The Home search works for names: Fireball, Elf, Wizard and Acolyte all return sensible results, and each category page filters its own list by name as you type. It does not search meaning. "sneak" and "damage" return nothing, even though Home promises "Search magic by purpose and situation".

### Detail pages: what is missing

| Page | Shows today | Missing for a new player |
| --- | --- | --- |
| Race (Dragonborn) | Speed, size, ability bonuses, alignment paragraph | Racial traits (Breath Weapon, Damage Resistance), age, languages, subraces, a one-line "plays like" summary. The data exists in the API but the page drops it. |
| Class (Bard) | Hit die, saves, proficiencies, skill choices, starting gear, subclass name | What the class does, class features by level, spellcasting rules, a level table. "Skill Choices" reads "Choose any three Three musical instruments of your choice" because two sentences are glued together. Saving throws are listed twice. |
| Background (Acolyte) | Proficiencies, languages, gear, feature, personality headings | The actual personality trait, ideal, bond and flaw options. It says "Personality Traits: Choose 2" without showing any. |
| Spell (Fireball) | Description, level, casting time, range, duration | Components, school, concentration, ritual, which classes can learn it, higher-level scaling. The richer formatter already exists in the code (the pop-up dialog) but this page does not use it. |

Every result card also says the same generic line, so the list gives no hint of which entry suits which player.

### Scrolling and layout

- **Spells is one very long page.** All 319 spells render in one list, about 35,000 px tall, with no filter for level, class or school. Fixed 2026-10-05 (filters and paging).
- Race, class and background lists are short and fine. The two-column list and detail layout is clear on desktop, and Back to results is a good touch on phones.
- Long detail text (Acolyte feature, spells) would read better with the facts in a small table at the top and the description below.

### Reporting missing information

There was no way to do it. About and the footer had no feedback link. (A GitHub issues link was added to both on 2026-10-03; a per-page "Spot something missing?" link is still open.)

### Look and feel

Cream and terracotta palette, rounded cards, serif headings and friendly Home copy all feel warm. Spacing is generous. The weak spot is the plain unstyled fact lines on detail pages (bold label, value, repeat), which feel more like a database than the rest of the site.

## Character creation

The flow has fixed steps: name, race, subrace, free cantrip, class, subclass, skills, spells, background, abilities, review. A left-hand rail shows groups and a right-hand panel summarises choices so far. Those are good bones.

### Steps that appeared whether or not they applied

The step list was fixed, so every player saw every step. (Fixed 2026-10-03: the list is now built from the choices made, see `getVisibleSteps` in `src/utils/creationSteps.js`.)

| Step | Who it applies to | What everyone else saw |
| --- | --- | --- |
| Subrace | Dwarf, Elf, Gnome, Halfling. Each has exactly one SRD subrace, so there is no real choice. | "Dragonborn has no subraces to choose from" plus a Next button (Dragonborn, Half-Elf, Half-Orc, Human, Tiefling). Tiefling's screen also said "has specific variants" directly above "has no subraces". |
| Free cantrip | High Elf only | "This race doesn't grant a free cantrip" for every other race |
| Subclass | Cleric, Sorcerer, Warlock (level 1) | "Chooses a subclass later as you level up, not at creation" for the other nine classes, shown twice on screen |
| Spells | Bard, Cleric, Druid, Sorcerer, Warlock, Wizard | "Has no starting spells to choose" for Barbarian, Fighter, Monk, Rogue. Paladin and Ranger showed "no starting spells at level 1". |

### Free cantrips: every combination

Checked against the SRD data the app reads.

**From race.** Only High Elf grants a choosable cantrip. Tiefling's Infernal Legacy grants Thaumaturgy at level 1 (and two more spells at levels 3 and 5), but the app told Tiefling players their race grants no free cantrip, and Thaumaturgy never reached the sheet (fixed 2026-10-03; levels 3 and 5 spells are not handled). Dwarf, Gnome, Halfling, Dragonborn, Half-Elf, Half-Orc and Human grant none, and the other Elf subraces (Wood, Dark) are not in the SRD.

**From class at level 1.**

| Class | Cantrips | Level 1 spells | How spells work |
| --- | --- | --- | --- |
| Barbarian, Fighter, Monk, Rogue | 0 | 0 | No spellcasting |
| Paladin | 0 | 0 | Spells start at level 2 |
| Ranger | 0 | 0 | Spells start at level 2 |
| Bard | 2 | 4 known | Known spells |
| Cleric | 3 | 0 chosen now | Prepares daily from the full list |
| Druid | 2 | 0 chosen now | Prepares daily from the full list |
| Sorcerer | 4 | 2 known | Known spells |
| Warlock | 2 | 2 known | Known spells |
| Wizard | 3 | 6 in spellbook | Prepares from the spellbook |

Nothing explains "known" vs "prepared" to a new player, and a Cleric choosing 3 cantrips and zero spells will wonder if something is broken. A one-line note ("Clerics pick which spells to ready each morning, so there is nothing to choose now") would fix it. A High Elf Wizard correctly sees the elf cantrip marked "Already known from High Elf" in the class list.

### Race and class choice

Both pickers show the same thin detail panel as the Races and Classes pages. A new player cannot tell a Dragonborn from a Half-Elf, or a Bard from a Monk, without leaving the site.

- Add a two-line plain "Good if you want..." blurb to each race and class. Example: "Dragonborn: you want to look like a dragon and breathe fire. Half-Elf: you want to be charming and flexible."
- Show the traits and class features that make each one distinct.
- Add a "Not sure?" helper: three to five questions ("Do you want to fight up close, from far away, or support others?") ending in two or three suggested classes with a Pick button.
- Show difficulty tags such as "Easy to play" or "Lots of spells to manage".
- Let people go back and swap freely. The rail already lets them revisit finished groups.

### Skills

Skill proficiency was a plain checkbox list with only the skill name. (Fixed 2026-10-03: each skill now shows its ability and a one-line description, with a hint to pick Perception and Stealth if unsure.) **New live finding:** the step let a player tick a skill the background already grants (Acolyte gives Insight; Insight could be ticked again), so Review showed "Insight, Religion, Athletics, Insight, Perception" and one pick was wasted. (Fixed 2026-10-03: background now comes before skills and granted skills are greyed out with "Already from Acolyte".)

### Starting spells

Cantrip and spell choices are bare checkboxes. Nothing can be hovered, tapped or expanded, so players choose blind (28 cantrips for a Bard, no tooltips). Add a short summary under each name ("Fire Bolt: ranged fire attack, 1d10"), a tap-to-expand full text, and tags like Damage, Healing and Utility. The code already formats full spell text for a pop-up elsewhere in the app, so it can be reused. **Still open.**

### Background

Only Acolyte is offered. This is deliberate: the SRD 5.1 (2014) rules contain just one background, and the 2024 backgrounds (Criminal, Sage, Soldier, Acolyte) use different rules, so the picker is limited to 2014 ones. The Backgrounds page lists 2024 ones too, so a player can see choices they cannot pick. Say this on the Background step, or decide whether to let 2024 backgrounds be picked as story and skill choices. Personality traits, ideals, bonds and flaws are not offered during creation.

### Ability scores

Good. The hints for each ability are the best teaching in the flow, the six dropdowns worked, and automatic Tiefling bonuses were right. "Standard Array" was renamed "Balanced set" and "Roll for Stats" "Roll dice" on 2026-10-03. Half-Elf's two free +1 picks are handled. The step never suggests that a Bard's best ability is Charisma.

### Review

The summary is clear but read-only. To change anything a player must go Back through every step in between, then forward again. The rail only jumps backwards, never forward to Review. Fix: an Edit link on each line that returns directly to Review after saving. **Still open.**

### Silent gaps after Create

What creation does not carry onto the sheet, so players must add it by hand (all **still open**):

- **Armor class** is always 10 + Dex, ignoring the Leather Armor or shield in starting gear. A Bard started with AC 12 instead of 13.
- **Languages** are blank, even though race and background grant them.
- **Attacks** are empty, even though weapons are in the inventory.
- **Proficiencies and Features** tabs start empty even though the class grants armor and weapon proficiencies.
- **Half-Elf Skill Versatility** (two extra skills) is not offered.
- **Equipment choices** ("a rapier or a longsword") are missing because the SRD data lists only fixed gear. (The SRD does list them, under a separate field; row #37 added a Gear step for them, merged in #104.)

## Character sheet

### Layout

Left: a skills list. Top: name line ("Level 1 Human Bard (Lore) · Acolyte"), then a row of boxes, then six ability cards. Below: a tab bar (Actions, Spells for casters only, Resources, Inventory, Features, Story) with Inspiration, Level Up, Long Rest and Short Rest beside it. Sensible grouping; hiding Spells for non-casters is a good touch.

### What a new player will not understand

The top row has about ten boxes with bare labels. (Addressed 2026-10-03 with tooltips and a "What do these boxes mean?" panel.)

| Label | What a beginner thinks | Suggested help text |
| --- | --- | --- |
| Hit Points (12/12) | Probably fine | "Your health. At 0 you fall unconscious." |
| Temp | "Temperature? Temporary what?" | "Temporary Hit Points: a buffer that absorbs damage first and doesn't heal." |
| AC | Unknown | "Armor Class: an attack must roll this or higher to hit you." |
| Init | "Initial?" | "Initiative bonus: added to your d20 roll to decide who acts first." |
| Speed | Clear, but what unit? | Already shows "ft"; add "how far you move each turn". |
| Prof | Unknown | "Proficiency bonus: added to everything you are trained in. Grows with level." |
| Hit Dice (1 d 8) | A confusing "1 d 8" | "Dice you can spend on a short rest to heal." |
| Skill column "DEX" / "P" | Unknown | "P = proficient. DEX = the ability this skill uses." |
| "Save +2" on ability cards | Unknown | "Saving throw bonus, used to resist effects." |
| Inspiration (a number box) | Unknown | "Granted by the DM for great roleplay; spend for advantage." |

The Guide explains abilities and proficiency well, but never mentions AC in the sheet sense, temp HP, hit dice or rests. Inventory shows "Proficient?" and "Attune" with no explanation (still open).

### Blank state

Each tab has an empty-state line ("No attacks recorded yet", with an Add Weapon button). That is a good start, but they are statements, not instructions. **All fixed 2026-10-05** (row #15; Features prefill in row #33):

- Actions: "Add your first weapon. Your starting gear is in Inventory; tap Add Weapon to turn it into an attack." Better, offer one-tap "Add from inventory".
- Features: prefill racial traits and class features from the SRD.
- Story: a prompt like "Who were you before the adventure? One sentence is enough."
- Add Weapon has good example placeholders ("Night Terror Longsword", "2d8+10"), but "To Hit" is a raw number the player must work out. It could offer the ability and proficiency math.

### Other things that would hesitate a new player

- **Level is an editable number box.** Typing 5 changes the level without the Level Up wizard. Kept editable on purpose (it is how existing characters are entered); a tooltip now points to Level Up.
- **Short Rest button** is still shown. A tooltip stating what each rest does would help more than removing it. (The glossary now explains both rests.) Fixed 2026-10-05 (#101): Short Rest opens a panel to spend Hit Dice and refill short-rest abilities, Long Rest gives back half your Hit Dice, and both say what they changed.
- **Number boxes everywhere.** HP, AC and ability scores are editable with no "edit" cue. Consider locking core numbers behind an Edit toggle.
- **Damage and healing** require typing a new HP total. Add -/+ buttons or a Damage / Heal amount field.
- **Auto-saving** is silent. Add a small "Saved" indicator.

## Tables, DM dashboard and live combat

### What works well for a first-timer

- A 6-character join code is the right amount of friction.
- The turn banner (round, now, next, latest event) is on the player's own sheet.
- Players can roll in the app or type a physical d20.
- Hidden enemy HP and AC with a Bloodied or Down status keeps secrets safe and still gives feedback.
- Damage arrives as a red bar the player applies, so the player stays in control of their own sheet.

### Where a newcomer may hesitate

| Moment | Likely confusion | Suggested fix |
| --- | --- | --- |
| First visit to Tables | "Do I need an account to join?" (the page already explains what a table is) | Add one line: "You need a QuestKeeper account and a saved character to join" |
| Entering the code | Typing is auto-uppercased already. The wording of the wrong-code error comes from the database and was not tested | Make sure it reads "No table with that code. Ask your DM to re-send it." |
| Joining | Which character? What if none exists yet? | Offer "Create a character first" in the same dialog |
| Rolling initiative | Is it my Dex bonus plus d20? Why is it locked later? | One line under the box: "We add your Init bonus for you" and a note about locking |
| Attack hit or miss | "I missed, but what was the AC?" | Intentional secret, but explain once: "The DM keeps enemy AC secret" |
| Waiting on the DM | "Awaiting DM" with no sense of how long | Show who is being waited on and offer a nudge |
| Applying damage | A red bar asking for action may be ignored | Keep it sticky and say what happens if dismissed |
| Ending a turn | Players forget, so the DM must nudge | Highlight End my turn after the last attack |
| Losing the session | Being logged out mid-fight (happened once, from a wrong device clock) | Friendly "Session expired, tap to sign back in" screen that returns you to the table |

### DM dashboard

The DM has many controls on one page: add monsters and allies, edit, attack, damage and heal, deny last attack, log, and the Monster Library. A first-time DM needs a checklist, not a toolbox: create table and share the code, add monsters (or load from the Library), wait for initiative, start combat. Show it as a banner until combat starts, then collapse it. Group rarely used tools behind a "More" menu. Make the Monster Library discoverable from the DM dashboard.

### Three ways people will use QuestKeeper

- **Solo character sheet.** Needs first-run help, the abbreviation tooltips and sensible defaults.
- **DM running a table with no player accounts.** Today every player needs an account. The friendly NPC or party member option already lets a DM track players by hand; promote it with a line like "Players without accounts? Add them here and track HP yourself."
- **Live play with friends.** Needs the join, turn and damage flows above, plus a single-page "How combat works" in the Guide (added 2026-10-05, row #17).

## Live test results (2026-10-03)

One character, **QA Rowan** (Tiefling Bard), and one table, **QA Test Table**, with three **QA Goblins** and **QA Ally Cleric**, were created on the live site. Delete them when no longer needed. Nothing was saved to the Monster Library.

### Confirmed live

- **Tiefling hit two dead ends in a row** (contradictory subrace text, then a false "no free cantrip"), and Thaumaturgy never appeared among the sheet's spells. Fixed 2026-10-03.
- **Doubled subclass message** on Bard. Fixed 2026-10-03.
- **Choices are bare names.** The 28 cantrips have no tooltips or descriptions (skills fixed 2026-10-03; spells still open).
- **Wasted skill pick** (see Skills above). Fixed 2026-10-03.
- **Ability score step** worked well.
- **Sheet arrived with** HP 9/9, **AC 12** (should be 13 with Leather Armor), Init +2, Speed 30, correct spells and slots, and Leather Armor and Dagger in Inventory. Attacks, Features, Proficiencies and Languages were empty.
- **Sheet labels** had no help; the only tooltips were on skill proficiency badges. Addressed 2026-10-03.

### Tables and combat (DM side, worked)

- Creating a table, adding 3 goblins in one go with an attack, adding a friendly party member, setting initiative, starting combat, a DM-rolled goblin attack ("Rolled 10 + 4 = 14. That misses!") and Damage buttons all worked. Status moved Healthy to Bloodied to Down correctly, and the activity log read well.
- **Error placement:** joining your own table showed "You run this table, so you cannot join it as a player" at the top of the page, far above the Join form. Put errors next to the form.
- **Goblin attack targets include the other goblins.** Useful for charm effects, confusing to a beginner. Default to the opposite side and offer "Show everyone".
- **Duplicate library entries.** "Maccath the Crimson (friendly)" appeared twice in the Monster Library and the "From my library" menu. May be a double-click that saved twice; disable the button after the first click.
- **Delete buttons** sit next to each row with no confirmation seen (not clicked). Add a confirm step.
- **Initiative boxes** read just "Init" with a bare Set button. A short label like "Roll order" would help a new DM.

### Phone width (375 px)

- Home, Tables, Table, Library, New Character and My Characters have no sideways scroll.
- **The character sheet was 16 px too wide.** The Save badge on the right-hand ability card stuck out (392 px). Fixed 2026-10-03.
- **The skills list came first on phones** (520 px tall), pushing name, HP and AC below a full screen of skills. Fixed 2026-10-03 (vitals first).

## Beginner-friendliness principles

- **Never show a screen that says "nothing to do here."** Skip it, or say it in one line on the next screen.
- **Explain a choice where it is made.** Skills, spells, classes and abilities each need a sentence at the moment of choosing.
- **Prefill what you already know.** If creation knows the race, class and background, the sheet should arrive with languages, traits, armor and weapons set.
- **Show, don't hide, rules that matter.** Hidden enemy AC is a feature, so say it once so players trust it.

## Audit 2 (2026-10-17)

An AI audit of the live site while signed in (about a day of features after Walkthrough 1: homebrew, feats, the quiz, AI search). Read-only apart from one draft hero (cancelled without saving) and a Feat form that was never saved.

**Scores (1 to 5):** Resourceful 4, Visually appealing 4, Functional 3, Fun 4.

**What worked:** Fireball, Cure Wounds, Elf and 2024 Alert matched the SRD. Creation explains each choice, including locking a cantrip you already have from your race. A creation draft survives a refresh. Magic Items has strong filters (2,277 entries). The quiz is fun and its results link straight into creation. The 404 page is helpful. The player's combat view showed enemies only as "Healthy" or "Bloodied", with no AC or HP numbers. No missing alt text, unlabeled fields or sideways scrolling on the pages checked.

**What needs work:** rows #42 to #55 above. The two that matter most are #42 (AI features switched off in production but still advertised) and #43 (creation pickers full of options a player can't choose).

**Questions left for the maker:**
- Should the live site have the Anthropic key, or should the AI features stay hidden for now?
- "Blood Hunter" appears as a class with source "Blood Hunter (Matthew Mercer, D&D Beyond)". Where does it come from, and is it licensed for the app?
- The player view of a table shows exact damage totals on enemies ("9 damage taken"). Is that intended?

**Not tested in this audit:** the second-account Tables flows; level-up, rests, casting and attacks; saving, sharing and invite links for homebrew; tablet and real phones (the phone emulation didn't apply to the creation page, so only the sheet was measured at 375px); keyboard-only and screen reader use; and only 4 of the 15 requested SRD spot-checks.

## What still needs testing

- The player side of a live fight (join, initiative, attack, apply damage, End my turn) with a second account.
- The new creation flow after the 2026-10-03 fixes are deployed: one Tiefling Bard, one Cleric, one Wizard High Elf, one Fighter.
- Real devices (phone width was tested by resizing only).
- Wording of the database's join-error text.
- Screenshots of every screen at desktop and phone width, once the browser pane is large enough.

## How to add the next walkthrough

Add a new dated section above "What still needs testing", note what was and was not tested, update the Fix tracker statuses, and add any new findings as new numbered rows.
