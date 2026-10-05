# QuestKeeper QA: New Player Walkthrough

A living record of what a first-time player experiences on QuestKeeper, what is good, what is confusing, and what has been fixed since. Each walkthrough gets its own dated section at the bottom, and the **Fix tracker** is updated as items are completed.

- **Walkthrough 1:** 2026-10-03, live site (questkeeper-it0i.onrender.com), plus a read of the source.
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
| 3 | Show racial traits on race details; class features and spellcasting on class details; split the glued "skill choices" sentence | Reference | Small | Open |
| 4 | Show full spell details (components, school, classes, higher levels) by reusing the pop-up formatter | Reference | Small | Open |
| 5 | Guide in the menu, 404 page, fix the 800-1100 px menu overflow | Navigation | Small | Merged |
| 6 | Tooltips and a glossary for AC, Init, Temp, Prof, Hit Dice, P, Save | Sheet | Small | Merged (tooltips on Temp, AC, Init, Prof, Level; glossary panel covers the rest) |
| 7 | Make Level read-only | Sheet | Small | Changed: kept editable (it is how people enter an existing character), added a tooltip pointing to Level Up |
| 8 | Rename "Standard Array" to "Balanced set" and "Roll for Stats" to "Roll dice" | Creation | Small | Merged |
| 9 | Edit links on the Review page that return to Review | Creation | Medium | Open |
| 10 | Skill descriptions and a pick-these-if-unsure tip | Creation | Medium | Merged (skills step now shows ability and a one-line description) |
| 11 | Tap-to-expand spell summaries on the starting spells step | Creation | Medium | Open |
| 12 | Plain "good if you want..." blurbs on every race and class card | Creation, Reference | Medium | Open |
| 13 | Spells page filters (level, class, school) and a scrolling or paged list | Reference | Medium | Open |
| 14 | Set armor class from starting armor; add starting weapons to Actions; fill languages | Sheet | Medium | Open |
| 15 | First-run prompts on each empty tab, with one-tap "add from inventory" | Sheet | Medium | Open |
| 16 | Feedback link on detail pages | Reference | Small | Partly merged (footer and About link to GitHub issues; not on each detail page) |
| 17 | Table first-time hints, a DM prep checklist, a "How combat works" Guide page | Tables | Medium | Open |
| 18 | Search by meaning ("sneak", "heal", "damage") | Search | Large | Open |
| 19 | "Not sure?" class helper quiz | Creation | Large | Open |
| 20 | Decide how to use the 2024 backgrounds in creation | Creation | Large (product decision) | Open |
| 21 | Grey out skills the background already grants | Creation | Small | Merged (background now comes before skills) |
| 22 | Fix the 16 px sideways scroll on the phone sheet; show vitals before the skills list | Sheet | Small | Merged |
| 23 | Duplicate library entries: disable the button after the first click | Library | Small | Open |
| 24 | Confirm step before deleting a table, character or library entry | Tables, Library | Small | Open |
| 25 | Show join errors next to the Join form | Tables | Small | Open |
| 26 | Default monster attack targets to the opposite side | Tables | Small | Open |
| 27 | Let players retype name, race, class, subclass, background and spellcasting ability, and toggle saving throw proficiency, so homebrew and non-SRD characters match a paper sheet (Story tab and Save badges) | Sheet | Small | Merged (2026-10-04) |
| 28 | Flat bonus fields and expertise: a "Bonus to all saves" box (Aura of Protection, Cloak of Protection), per-skill bonus boxes behind a Bonuses button (Jack of All Trades), and skill expertise (click the badge: P, then E). Found by comparing a real Google Sheet to a QuestKeeper sheet | Sheet | Small | Merged (2026-10-04) |
| 29 | Temporary AC bonus box (Haste and similar) that shows "+2 = 23" next to AC without overwriting the base AC; the DM's view of a player sheet uses the total | Sheet | Small | Merged (2026-10-04) |
| 30 | DM: nicknames and animal icons for identical monsters ("Tell them apart": e.g. "Goblin (red duck)"), an icon picker in Edit, and a visible tip that the How many box adds several of the same monster at once | Tables | Small | Done (2026-10-05, pending merge) |
| 31 | DM: roll initiative for monsters. A per-monster Roll d20 button, a "Roll initiative for N monsters" button that skips any monster that already has an initiative (so a boss can be rolled with real dice), and an Initiative bonus field on the stat block | Tables | Small | Done (2026-10-05, pending merge) |
| 32 | DM add-monster form: visible labels above Name, How many, HP, AC and Initiative, and above each attack's name, to-hit and damage, so values filled in from a library entry can still be read (found while using the library autofill) | Tables | Small | Done (2026-10-05, pending merge) |
| 33 | Class features and racial traits on the sheet: new characters arrive with their race's traits and level 1 class features written in, and the Features tab has "Add from my class and race" (ticks everything up to your level, skips what you already have) for existing characters and level-ups. Found by comparing a real sheet whose Features tab was empty | Sheet, Creation | Medium | Done (2026-10-05, pending merge) |

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

- **Spells is one very long page.** All 319 spells render in one list, about 35,000 px tall, with no filter for level, class or school.
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
- **Equipment choices** ("a rapier or a longsword") are missing because the SRD data lists only fixed gear.

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

Each tab has an empty-state line ("No attacks recorded yet", with an Add Weapon button). That is a good start, but they are statements, not instructions. **Still open:**

- Actions: "Add your first weapon. Your starting gear is in Inventory; tap Add Weapon to turn it into an attack." Better, offer one-tap "Add from inventory".
- Features: prefill racial traits and class features from the SRD.
- Story: a prompt like "Who were you before the adventure? One sentence is enough."
- Add Weapon has good example placeholders ("Night Terror Longsword", "2d8+10"), but "To Hit" is a raw number the player must work out. It could offer the ability and proficiency math.

### Other things that would hesitate a new player

- **Level is an editable number box.** Typing 5 changes the level without the Level Up wizard. Kept editable on purpose (it is how existing characters are entered); a tooltip now points to Level Up.
- **Short Rest button** is still shown. A tooltip stating what each rest does would help more than removing it. (The glossary now explains both rests.)
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
- **Live play with friends.** Needs the join, turn and damage flows above, plus a single-page "How combat works" in the Guide.

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

## What still needs testing

- The player side of a live fight (join, initiative, attack, apply damage, End my turn) with a second account.
- The new creation flow after the 2026-10-03 fixes are deployed: one Tiefling Bard, one Cleric, one Wizard High Elf, one Fighter.
- Real devices (phone width was tested by resizing only).
- Wording of the database's join-error text.
- Screenshots of every screen at desktop and phone width, once the browser pane is large enough.

## How to add the next walkthrough

Add a new dated section above "What still needs testing", note what was and was not tested, update the Fix tracker statuses, and add any new findings as new numbered rows.
