# QuestKeeper Project Vision

## Purpose

QuestKeeper is a fast, beginner-friendly Dungeons & Dragons Fifth Edition reference and gameplay companion. It is intended primarily for a small group of friends who want to find useful rules and character information without searching across multiple websites during play.

QuestKeeper should reduce the time between asking a rules or character question and finding a clear, useful answer. It should support newer players without getting in the way of experienced players who want to look something up quickly.

## Rules edition

QuestKeeper targets the **2014 version of Dungeons & Dragons Fifth Edition**, not the 2024 revision.

Every rules-related data source and feature should identify its edition explicitly. Data from different editions must not be silently mixed. If support for another edition is added later, users should be able to tell which edition they are viewing.

## Intended users

QuestKeeper is designed for:

- Players who use the 2014 Fifth Edition rules.
- Beginners who benefit from definitions, examples, and guided choices.
- Experienced players who need fast search and navigation during a game.
- A private group of friends who may eventually use accounts, favorites, and character sheets.

The initial goal is not to replace every rulebook or virtual tabletop. The goal is to make the information QuestKeeper can legally provide easier to find, understand, and use.

## Product principles

### Fast to use

Search and navigation should minimize the number of steps required to find an answer. Important information should be easy to scan during gameplay.

### Beginner-friendly

The interface should explain unfamiliar terms and choices in plain language. Guidance should help users learn why an option may fit their character rather than making decisions silently.

### Accurate and transparent

Rules content should identify its source and edition. QuestKeeper should distinguish source material from original guidance, user-entered notes, and links to external resources.

### Legally responsible

Public availability does not automatically grant permission to copy or redistribute content. QuestKeeper should only reproduce material when its license or other permission allows that use.

### Built in manageable stages

Each development step should deliver one understandable improvement. Features should be reviewed and tested before the project moves to a more complicated layer.

## Planned capabilities

### Reference and discovery

- Fast global search.
- Browsing by category.
- Spells.
- Races or species.
- Classes and subclasses.
- Backgrounds.
- Feats.
- Equipment and magic items.
- Rules references.
- Favorites and saved content.

### Character management

- User accounts for friends.
- Character creation.
- Digital character sheets.
- Level-up guidance.
- Hit point tracking.
- Ability scores, skills, saving throws, and other statistics.
- Inventory tracking and item descriptions.
- Spell preparation and spell-slot management.

### Learning and recommendations

- Original beginner-friendly definitions and tips.
- Explanations of choices and tradeoffs.
- Recommendations when selecting a feat, ability-score improvement, spell, or other option.
- An eventual AI-assisted character guide.

The AI-assisted guide may allow a user to describe a desired personality, story, play style, or overall character "vibe." It could then recommend suitable classes, subclasses, backgrounds, races or species, abilities, spells, feats, and statistics. Recommendations should include understandable reasons and should remain suggestions that the player can accept or reject.

The AI feature should be built only after QuestKeeper has reliable rules data and a well-defined character model. AI output must not be treated as an authoritative rules source.

## Content and data-source policy

QuestKeeper must not assume that material can be copied merely because it is visible online.

The project should follow these rules:

- Use officially reusable material only under the terms of its license.
- Review an API's data source, edition, license, coverage, and terms before depending on it.
- Do not scrape or reproduce content from D&D Wikidot, Roll20, D&D Beyond, or similar sites without verified permission.
- Link to an authorized external source when QuestKeeper cannot legally reproduce its full text.
- Write original beginner-friendly guidance without closely paraphrasing protected text.
- Allow private user-entered notes where appropriate, without distributing protected content as QuestKeeper data.
- Obtain qualified legal advice before publicly distributing or monetizing a product containing substantial D&D material.

Purchasing a book generally permits personal use of that book; it does not automatically grant permission to republish its text inside an application. Attribution alone also does not replace the need for a valid license or permission.

### Required provenance fields

As the backend data model develops, every rules or reference entry should be able to record:

- `edition`: the rules edition, such as `2014`.
- `contentType`: the category, such as spell, class, or background.
- `sourceName`: the publication, dataset, API, or authoring source.
- `sourceUrl`: an appropriate source or reference link.
- `license`: the license or permission governing reuse.
- `attribution`: any notice required by the license.
- `contentOrigin`: official reusable content, original QuestKeeper guidance, user-entered content, or external link.
- `lastReviewedAt`: when the source and its terms were last reviewed.

These names are planning examples, not a finalized database schema.

## Current content sources

| Category | Current provider | Edition | Known coverage | Decision status |
| --- | --- | --- | --- | --- |
| Classes | D&D 5e SRD API (`dnd5eapi.co`) | 2014 | SRD content only | In use; license and attribution details should be documented before public release |
| Races | D&D 5e SRD API (`dnd5eapi.co`) | 2014 | SRD content only | In use; terminology and coverage should be reviewed |
| Spells | D&D 5e SRD API (`dnd5eapi.co`) | 2014 | SRD content only | In use; license and attribution details should be documented before public release |
| Backgrounds | D&D 5e SRD API (`dnd5eapi.co`) | 2014 | Acolyte only | In use; the limited result is expected because Acolyte is the only background in this source's 2014 SRD data |

The current API is a useful starting point, but an API endpoint is not itself proof that every item from every 2014 rulebook is available or reusable. New sources should go through the same review before integration.

## Technical direction

QuestKeeper currently uses a monorepo containing:

- A React and Vite frontend in `questkeeper-frontend`.
- An Express backend in `questkeeper-backend`.
- Root npm workspace commands for operating both applications.

The frontend requests data from the QuestKeeper backend. The backend currently acts as a proxy to the D&D 5e SRD API. Over time, the backend should become the stable boundary between the user interface and external data sources. It can normalize inconsistent upstream responses, attach provenance, combine approved sources, cache data, and later support accounts and character data.

The frontend should consume a consistent QuestKeeper data shape rather than becoming tightly coupled to the response format of any one external API.

## Development milestones

### 1. Understand and document the foundation

- Keep the product vision and content policy current.
- Document local setup and deployment configuration.
- Confirm the frontend and backend run reliably.
- Record architectural decisions as they are made.

### 2. Improve the current reference experience

- Improve browsing and global search for currently reusable data.
- Add clear loading, empty, and error states.
- Show edition and source information in the interface.
- Remove duplicated data-formatting logic where practical.

### 3. Establish normalized backend data

- Define internal models for reference entries and source provenance.
- Validate external API responses.
- Add caching and appropriate request timeouts.
- Add automated tests for important backend and frontend behavior.

### 4. Add personal features

- Introduce accounts.
- Add favorites and saved content.
- Protect private user data.

### 5. Build the basic character sheet

- Store core character identity and class information.
- Track ability scores, skills, saving throws, and hit points.
- Add inventory and spell management in small increments.

### 6. Add guided character progression

- Support character creation and leveling.
- Explain available choices and prerequisites.
- Provide beginner-friendly recommendations without taking control away from the player.

### 7. Explore AI-assisted guidance

- Ground recommendations in QuestKeeper's reviewed data.
- Explain the reasons behind suggestions.
- Clearly distinguish guidance from official rules.
- Evaluate privacy, cost, reliability, and safety before release.

## Development workflow

For each feature:

1. Explain the current behavior.
2. Identify the smallest useful improvement.
3. Explain the relevant frontend or backend concepts.
4. Identify the files that will change.
5. Make the focused change.
6. Run appropriate checks or tests.
7. Review the result in the application.
8. Explain how to stage, commit, and push the work.

Changes should not be committed or pushed until the project owner requests it.

Before staging with `git add .`, run `git status` and review every changed file. A narrower command such as `git add docs/QUESTKEEPER_VISION.md` is preferable when saving one focused change.

## Open decisions

- Which reusable sources, beyond the current SRD API, are suitable for 2014 content?
- What attribution and license notices must appear in the application and repository?
- Should non-reproducible content be represented by external links, private user notes, or both?
- What normalized data shape should QuestKeeper use across sources?
- Where and how should the backend be deployed?
- Which account and authentication approach is appropriate for a small group of users?
- What is the smallest useful first version of a character sheet?

## Definition of success

QuestKeeper succeeds when a player can quickly find trustworthy 2014 Fifth Edition information, understand what it means, and use it during character creation or gameplay—with the source and limitations of that information made clear.
