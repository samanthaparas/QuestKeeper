# QuestKeeper Two-Account Test

A full run of a fight with a DM and a player on separate accounts. It is the end-to-end check for live play (Tables), run near the end of a batch of work so every new feature is tested together. It covers the table help for new groups (QA row #17), DM nudges, and the clearer monster rows (#36).

**Interactive version:** [QuestKeeper Two-Account Test](https://claude.ai/artifact/4hiFkcPtrP1BSa2d1iihig) (private to the owner). It has the same steps, with Works/Problem marks, notes per stage and a copyable report. This file is the version-controlled copy of the first parts only; the interactive page is the maintained, full version and is where results are marked. On 2026-10-27 the steps already marked Works were removed, leaving 23 parts and 212 steps, split into "Before Monday" (43) and "Later" (169). Part 10 below is the redesigned DM screen.

## How to run it

- **DM:** your usual account, in window A.
- **Player:** a second account, in window B. Use two windows that don't share a login (two different browsers, or one normal and one private window).
- **Both:** check on both screens.
- Use the live site, `questkeeper-it0i.onrender.com`. The first load after a quiet spell can take about 15 seconds while the server wakes up.
- Use made-up test monsters, never the DM's real ones for an upcoming session.
- Work top to bottom: the stages follow the order of a real game night. Write down anything that looks off, with the step number and which screen.

## Adding tests

When a change affects tables, combat, the character sheet's turn banner, or anything a DM or player sees live, add steps here and in the interactive page. Each step names who does it, what to do, and what they should see.

## 1. Set up two players

One browser shares one login, so the two accounts need windows that don't share sign-ins.

- [ ] **1.1 · Both:** Open two windows that don't share a login, e.g. Chrome and Safari, or Chrome plus an Incognito window.  
  *Expect:* Each window can be signed in to a different account.
- [ ] **1.2 · DM:** In window A, sign in to your usual account.  
  *Expect:* **My Characters** shows your characters.
- [ ] **1.3 · Player:** In window B, sign in to the second account. Create it yourself if you don't have one yet.  
  *Expect:* Signed in, with no tables yet.
- [ ] **1.4 · Player:** Make a quick level 1 character that starts with a weapon (a Rogue with a dagger works). Note its **AC** and **Dexterity**.  
  *Expect:* The sheet has the weapon on the **Actions** tab.

## 2. Finding a table

The player account has no tables yet, so it sees the first-time help.

- [ ] **2.1 · Player:** Open **Tables**.  
  *Expect:* A dashed box: **"Here is how a game night works"** with three steps.
- [ ] **2.2 · Player:** Click **How playing at a table works**.  
  *Expect:* The Guide opens straight at **Playing at a QuestKeeper table**, not the top of the page.
- [ ] **2.3 · Player:** Back on Tables, try joining with a made-up code like `ZZZ999`.  
  *Expect:* An error shows **inside the Join form**, not at the top of the page.

## 3. The DM sets the table

- [ ] **3.1 · DM:** Create a table called **Test night**.  
  *Expect:* The table page opens with the join code at the top right and a **Before the fight** checklist. Step 1 is highlighted.
- [ ] **3.2 · Player:** Join with that code and pick the test character.  
  *Expect:* The table page opens: **"You are a player · How tables work"**.
- [ ] **3.3 · DM:** Wait a few seconds without refreshing.  
  *Expect:* Checklist step 1 ticks: **"1 player has joined."**
- [ ] **3.4 · DM:** Add monsters: name **Goblin**, How many **2**, HP **7**, AC **15**, attack **Scimitar +4, 1d6+2**. Give each a nickname or icon.  
  *Expect:* Two goblins appear with their icons. Step 2 ticks.
- [ ] **3.5 · DM:** Add one more monster with HP and AC but **no attacks** (e.g. **Wolf**).  
  *Expect:* It appears. You'll use it later to see the no-attacks help.
- [ ] **3.6 · Player:** Look over the monsters.  
  *Expect:* Names, icons and **Healthy** only. No HP, AC, attacks, or "DM only" text anywhere.

## 4. Initiative and the nudge

Keep the player on the table page for this stage: the nudge shows there.

- [ ] **4.1 · Player:** Look at the top of the Combat box.  
  *Expect:* A **Roll initiative for <character>** card sits above the lists, with **Roll d20 for me** and a **Use my roll** box. It names your Dexterity bonus.
- [ ] **4.2 · Both:** Look at the lists under it.  
  *Expect:* **Waiting for initiative (n)** comes before **Initiative order**. Waiting rows have a dashed gold border.
- [ ] **4.3 · DM:** Look at checklist step 3.  
  *Expect:* Highlighted, **"Still waiting on …"** with names, and a **🔔 Nudge <name> to roll** button.
- [ ] **4.4 · DM:** Tap **🔔 Nudge** on the player's row.  
  *Expect:* All Nudge buttons read **Nudged ✓** and grey out for about 4 seconds, then read **🔔 Nudge again**.
- [ ] **4.5 · Player:** Watch the card.  
  *Expect:* It **shakes once**, glows gold and says **"🔔 Your DM is waiting for your roll!"** The activity log shows the nudge line.
- [ ] **4.6 · DM:** After the cooldown, nudge again.  
  *Expect:* The player's card shakes again.
- [ ] **4.7 · Player:** Type **25** in the d20 box and tap **Use my roll**.  
  *Expect:* Nothing happens. 25 isn't a d20 number.
- [ ] **4.8 · Player:** Type **14** and tap **Use my roll**.  
  *Expect:* The card goes away. **"Your initiative: Rolled 14 + x = y"**, where y is 14 plus your Dexterity modifier, and a **"You're ready"** tip.
- [ ] **4.9 · DM:** Tap **Roll initiative for 3 monsters**.  
  *Expect:* Every monster gets a number, the waiting list empties, step 3 ticks and step 4 is highlighted.

## 5. Start the fight

- [ ] **5.1 · DM:** Tap **Start combat**.  
  *Expect:* The checklist disappears. The combat line reads **Round 1 · Now: … · Next: …, then …**
- [ ] **5.2 · Player:** Tap **Open my character sheet**.  
  *Expect:* A banner at the top: Round 1, who's up, and the **next two** ("You're up next, then …" if it's you). The nudge line does **not** appear in it.
- [ ] **5.3 · Player:** Go back to the table page.  
  *Expect:* A one-line tip says to wait and that the sheet's banner will say when you're up.

## 6. The player's turn

The player attacks from the character sheet.

- [ ] **6.1 · DM:** Tap **Next turn** until it's the player's turn.  
  *Expect:* On the player's sheet the banner says **"It's your turn!"** with **End my turn**.
- [ ] **6.2 · Player:** Open **Actions** and tap **Attack** next to the weapon.  
  *Expect:* An attack panel opens with a list of targets to pick from.
- [ ] **6.3 · Player:** Tap **Roll d20**, or enter a real die roll.  
  *Expect:* It says hit or miss **without showing the goblin's AC**.
- [ ] **6.4 · Player:** If it hit: **Roll damage**, then **Deal … damage**.  
  *Expect:* The goblin shows damage taken. At half HP or less it says **Bloodied**; at 0, **Down**.
- [ ] **6.5 · Player:** Attack a second time.  
  *Expect:* The banner says **"You have attacked 2 times this turn"**.
- [ ] **6.6 · DM:** Tap **Deny last attack** on the player's row and confirm.  
  *Expect:* The last attack is undone, including its damage.
- [ ] **6.7 · Player:** Tap **End my turn**.  
  *Expect:* The turn moves on, on both screens.

## 7. The monsters' turn

This checks the clearer monster rows and that a temporary AC bonus counts.

- [ ] **7.1 · Player:** On the sheet, set **Temporary AC bonus** to **2**.  
  *Expect:* AC shows **"+2 = …"** next to it.
- [ ] **7.2 · DM:** On a goblin's turn, look at its row.  
  *Expect:* **Attack** (filled) comes first, then a box labelled **HP** with Amount, Damage and Heal, then **Edit** and **Remove** set apart.
- [ ] **7.3 · DM:** Tap **Attack**. Scimitar should be picked already. Target the player and roll.  
  *Expect:* The activity log reads **"… (rolled n vs AC m)"**, where m is the player's AC **plus 2**.
- [ ] **7.4 · DM:** If it hits, roll damage and send it.  
  *Expect:* On the player's sheet: **"Goblin hits you for n!"** with **Apply n damage** and **Dismiss**.
- [ ] **7.5 · Player:** Tap **Apply**.  
  *Expect:* Temporary HP goes down first, then HP.
- [ ] **7.6 · DM:** Open **Attack** on the Wolf (no saved attacks).  
  *Expect:* **"No attacks saved for Wolf…"** and a **"Not sure of the + hit?"** tip.
- [ ] **7.7 · DM:** On a goblin's HP box, enter 3 and tap **Damage**, then 3 and **Heal**.  
  *Expect:* Its damage and status change and change back. The player only ever sees the status.

## 8. On a phone

Sign the player in on a phone for this stage, or use a narrow browser window.

- [ ] **8.1 · Player:** Open the table page and the sheet on a phone.  
  *Expect:* No sideways scrolling. The initiative card's buttons stack neatly and the banner is readable.
- [ ] **8.2 · Player:** Reload the page in the middle of the fight.  
  *Expect:* Still at the table, with the right turn showing.

## 9. Wrap up

- [ ] **9.1 · DM:** Tap **End combat**, then **New encounter** and confirm.  
  *Expect:* Monsters cleared, initiatives reset, and the log says **"🧹 The DM started a new encounter."**
- [ ] **9.2 · Player:** Look at the table page.  
  *Expect:* The Roll initiative card is back, **without** the gold glow. Old nudges don't count.
- [ ] **9.3 · DM:** Decide whether to keep or delete the test table and test character.  
  *Expect:* Your call. Nothing is deleted automatically.

## 10. The redesigned DM screen: Story, Players and Prep

The Story, Players and Prep tabs were redesigned in October 2026 and have so far only been checked on made-up sample data, never at a real table. Use the Test night table with at least two player characters (one with a spell or two, and one blocked by Allowed content if you can), several made-up monsters, and one monster with a very long name. The icon step needs `20261024_activity_kinds.sql` run. Use a wide laptop window (1280 or wider) unless a step says otherwise.

- [ ] **10.1 · DM:** Open the **Story** tab.\
  *Expect:* Party clues on the left (a list of characters), the Journal in the middle with its note box at the bottom, and Handouts on the right. There is no big Party panel above the tabs.
- [ ] **10.2 · DM:** In **Party clues**, pick a different character, then open **Character details**.\
  *Expect:* Each character shows their level, class, Perception, Insight and Investigation, and any conditions. Details show languages, senses and speed, with Backstory and Appearance folds. Nothing can be edited.
- [ ] **10.3 · DM:** Write a journal note for the whole table, then one marked **🔒 Just me**.\
  *Expect:* Both appear with the newest at the top of the session. The note box stays at the bottom of the Journal and never covers a note or its Edit and Delete.
- [ ] **10.4 · DM:** Open **Session options** and **How notes work**.\
  *Expect:* Starting a session, setting the current session and the campaign tools are inside Session options. How notes work gives a short explanation. Both close again.
- [ ] **10.5 · DM:** Make a new handout with a title and text (add no picture).\
  *Expect:* It is listed as **Hidden · Only you**. Creating it did not show it to anyone.
- [ ] **10.6 · DM:** Tap **Choose players** and pick one player.\
  *Expect:* The badge reads **Shown to <name>**. Only that player sees it on their page. A handout shown to more than three players says **Shown to N players**, with the names one tap away.
- [ ] **10.7 · DM:** Tap **Reveal to everyone**, then **Hide again**.\
  *Expect:* The badge changes to **Shown to everyone** and back to Hidden, and the player's page follows within a few seconds.
- [ ] **10.8 · DM:** Tap **Options** on a handout.\
  *Expect:* Edit and Delete appear. Delete asks you to confirm first. Closing Options hides them again.
- [ ] **10.9 · DM:** Make a handout with a very long title (about 80 characters).\
  *Expect:* The card shows the title cut off after two lines with a small **Show full title** button. It does not show on short titles.
- [ ] **10.10 · DM:** Tap **Show full title** (or focus it and press Enter or Space), then **Show less**.\
  *Expect:* The whole title opens inside the card and closes again, and the keyboard stays on the button. Nothing is revealed, hidden or edited by it.
- [ ] **10.11 · Player:** Look at your game page's Story tab.\
  *Expect:* Only the handouts shown to you appear. No Hidden handouts, and no DM-only journal notes.
- [ ] **10.12 · DM:** Open the **Players** tab.\
  *Expect:* On the left, **Your players · N** with a small **Show all** button. Each player has a portrait, name, level and class, an HP bar, **n/n HP** and their AC in a shield. The picked player has a solid gold outline; their overview is on the right.
- [ ] **10.13 · DM:** Pick each player in turn and compare with their own sheet.\
  *Expect:* Name, level, race, class (and background), HP with bar, AC, speed and initiative match. A condition or concentration (for example Poisoned, Concentrating: Bless) sits under the name.
- [ ] **10.14 · DM:** Look at **Skills and saves** and **Passive scores**.\
  *Expect:* All 18 skills in three columns of six, the six saves on a line below, then Passive scores and Languages and senses. A skill the player is proficient in is bold.
- [ ] **10.15 · DM:** Hover an attack, then tap it, then press Escape. Do the same with a spell.\
  *Expect:* Hovering opens a small reading box; a tap keeps it open; Escape closes it. A spell's box shows **Rules (SRD)** and **Player's note** separately. The attack box shows its weapon details and the player's notes.
- [ ] **10.16 · DM:** Open a spell's box, press Tab until you reach **Full spell text** and press Enter.\
  *Expect:* The full rules open in a pop-up. They only load when you ask.
- [ ] **10.17 · DM:** Scroll the overview with the mouse wheel, and with Page Down after clicking in it. Open Companions, Inventory, Features and Story and notes.\
  *Expect:* One scroll area moves the whole overview (no small scrolling box inside it). Those four folds start closed, and open to show the player's own notes. Nothing is editable.
- [ ] **10.18 · DM:** Tap **Show all**.\
  *Expect:* The panel header reads **All players** with **Read-only · Players manage their own sheets** on its own row, and a divider before the first overview. Each player's overview follows, one under another.
- [ ] **10.19 · DM:** Put one player at 0 HP on their sheet, and look at the list and their overview.\
  *Expect:* Their list card shows 0/max HP with an empty bar, and the overview shows Death saves.
- [ ] **10.20 · DM:** With a character that uses blocked content (see Allowed content), look at the list and overview.\
  *Expect:* A **⚠ Uses options not allowed here** line on their list card, and **Table content: review flagged choices** in the overview opens the details.
- [ ] **10.21 · DM:** Open the party-sharing switch under the player list (**Players can see party stats** or **Party stats hidden**) and flip it.\
  *Expect:* The player's Party section appears or disappears within a few seconds, the same as the switch on the Combat tab.
- [ ] **10.22 · DM:** Open the **Prep** tab before a fight.\
  *Expect:* A slim **Before the fight** bar: four steps with short status lines (like **2 players joined** and **Waiting for 3 initiatives**), **Step details** and **Start combat** at the top right. The Party panel is not above the tabs.
- [ ] **10.23 · DM:** Tap **Step details**.\
  *Expect:* A longer line for each step opens, including who is still waiting. Tap **Hide step details** to close it.
- [ ] **10.24 · DM:** With nobody's initiative set, look at **Start combat**.\
  *Expect:* It is greyed out, with **Set at least one initiative first.** beside it. Once anyone has an initiative it works.
- [ ] **10.25 · DM:** In **Encounter helper**, search **ob**.\
  *Expect:* Cards with a picture or a letter badge, CR and XP, type and size tags and an **Add** button. Goblin, Kobold, Skeleton, Wolf and Ogre have pictures; others get a letter.
- [ ] **10.26 · DM:** Add two or three different monsters, change their quantities with − and +, then tap **Add this encounter**.\
  *Expect:* The difficulty line (Easy to Deadly) follows live. The monsters join the table with their HP, AC and attacks, and Initiative setup lists them.
- [ ] **10.27 · DM:** Open **How encounter suggestions work**, **What players can see** and **Adding several creatures**.\
  *Expect:* Each opens a short explanation and closes again. The Add to the fight and Save for later buttons keep their own one-line notes.
- [ ] **10.28 · DM:** Look at **Initiative setup** (top of the right column).\
  *Expect:* Roll initiative for N monsters is the main button, with New encounter quieter and **How rolling works** beside them. Each creature has one row with its Init box, Set and Roll d20. The long-named monster wraps cleanly without covering its buttons.
- [ ] **10.29 · DM:** Roll for all monsters, set one by hand, and nudge a waiting player.\
  *Expect:* Numbers appear on the rows, the readiness bar's status updates, and the player's roll card shakes. No creature is selected until you tap its name; then its own panel opens below the list.
- [ ] **10.30 · DM:** Look under Initiative setup.\
  *Expect:* Table rules (with Starter lines tucked away), Allowed content and Loot ideas, in that order.
- [ ] **10.31 · DM:** Start combat, then open **Prep** again.\
  *Expect:* A strip says **The fight is on** with **Go to Combat →**. Initiative setup is gone, and adding more monsters still works.
- [ ] **10.32 · Player:** Check your game page during all of this.\
  *Expect:* Only names, Healthy or Bloodied, and damage taken. Never HP, AC, stat blocks, the encounter helper or the DM's notes.
- [ ] **10.33 · DM:** Reveal a handout, then attack and heal during a fight, and look at the activity log.\
  *Expect:* Lines you create after the database change show small icons (handout, attack, damage, healing, spell, turn). Older lines have no icon, which is normal.
- [ ] **10.34 · DM:** Make the browser window tablet-narrow (about 800 wide) and look at Story, Players and Prep.\
  *Expect:* Panels stack in normal page flow. Players folds its list into a **Choose a player** button. Prep goes Before the fight, Encounter helper, Add monsters, Initiative setup, then the table settings. No sideways scrolling.
- [ ] **10.35 · DM:** Zoom the browser to 200% (Cmd and plus) and tab through each of the three tabs.\
  *Expect:* Nothing is cut off or overlapping, and the control you are on always stays on screen with a visible outline.

## Results log

| Date | Who ran it | Result | Follow-ups |
| --- | --- | --- | --- |
| | | | |
