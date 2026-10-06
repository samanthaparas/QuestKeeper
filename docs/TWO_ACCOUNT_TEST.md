# QuestKeeper Two-Account Test

A full run of a fight with a DM and a player on separate accounts. It is the end-to-end check for live play (Tables), run near the end of a batch of work so every new feature is tested together. It covers the table help for new groups (QA row #17), DM nudges, and the clearer monster rows (#36).

**Interactive version:** [QuestKeeper Two-Account Test](https://claude.ai/artifact/4hiFkcPtrP1BSa2d1iihig) (private to the owner). It has the same steps, with Works/Problem marks, notes per stage and a copyable report. This file is the version-controlled copy; keep the two in step when adding tests.

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

## Results log

| Date | Who ran it | Result | Follow-ups |
| --- | --- | --- | --- |
| | | | |
