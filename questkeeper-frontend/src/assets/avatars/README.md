# Default character avatar layers

256px transparent WebP delivery copies of the existing QuestKeeper race,
class and background PNG artwork. Originals remain in `../icons/`.

The frontend combines a race portrait, a class emblem and a background
emblem at display time: 55 races × 14 classes × 72 backgrounds = 55,440
combinations from 141 reusable files. No combined image is uploaded or saved.

`utils/avatars.js` resolves each layer. `CharacterAvatar` gives uploaded
portraits priority and falls back if an image fails. A supported canonical
name or source ID can select artwork; homebrew can specify an explicit
`artId`. Unknown ancestry uses initials rather than inventing a race.

Full character sheets provide all three choices. Older shared party data
may only include a class name, so those displays can only show the known
layers. No database function or access policy is changed by this feature.
