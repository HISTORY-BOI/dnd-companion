# D&D Party Companion

A combat helper for our D&D 2024 party: pick an attack or spell, toggle your combos
(Sneak Attack, Steady Aim, Divine Smite, upcasting …), and get plain instructions on
**what to roll**, the min/average/max damage, and one tap to **spend the costs** —
spell slots, bonus actions, "Speed 0", once-per-turn markers — on an interactive
character sheet.

## Using it

**It's one file: [`dnd-companion.html`](dnd-companion.html).** No install, no server, no internet.

1. Send the file to everyone in the party (chat, mail, USB — whatever).
2. Open it in any browser, on phone or laptop.
3. Each browser stores its own characters (saved automatically, survives reloads).

Ships with four editable sample characters (Rogue Assassin, Life Cleric, Evoker
Wizard, Paladin) built from the 2024 Player's Handbook.

### The three tabs

- **Sheet** — HP, AC, abilities, passive perception, skills (with proficiency ● and
  expertise ★), spell-slot pips, resources, equipment & coin, action/bonus/reaction
  markers and active effects. Buttons for *New turn*, *New encounter*, *Short rest*,
  *Long rest* reset the right things.
- **Actions** — searchable list of your weapons, spells and features with damage
  ranges. Tap one → toggle situational options, pick a slot level, read the numbered
  "what to roll" steps, optionally roll in-app, then hit **Use** to spend the costs.
- **Edit** — everything is data: characters, actions, and option-toggles are fully
  editable. Add weapons from the built-in 2024 weapon list (with masteries) or
  combat feats from the 2024 feat list (Sharpshooter, Great Weapon Master, …),
  invent your own combo options, upload a character portrait.

### Sharing characters

☰ menu → **Export character** saves a `.json` file; **Import file** loads it on
another device. Portraits travel inside the file.

### Dice language (used in the editors)

| You write | Means |
|---|---|
| `1d8+MOD` | one d8 plus your attack/spellcasting modifier |
| `ceil(L/2)d6` | Sneak Attack scaling (L = character level) |
| `L` | flat damage equal to your level |
| `-1d6` | forgo dice (Cunning Strike) |
| `PB`, `STR`…`CHA` | proficiency bonus, ability modifiers |

Damage type `healing` restores HP instead. Notes support `{DC}`, `{DC-DEX}`, `{PB}`,
`{MOD}`, `{L}` placeholders.

## Development

Plain HTML/CSS/JS in a single file, no dependencies. Tests live in `tests/`
(`./tests/run.sh` — needs Node; the UI test additionally needs `npm i jsdom` inside
`tests/`). See `CLAUDE.md` for architecture notes.

Rules source: the 2024 Player's Handbook (PDF in this folder, not redistributed).
For personal use at our table.
