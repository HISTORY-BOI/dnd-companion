# CLAUDE.md — D&D Party Companion

## What this is

A single-file web app (`dnd-companion.html`) that helps Nicolas' D&D 2024 party
resolve attacks/spells: select action → toggle options (combos) → get "what to roll"
instructions + min/max damage → commit costs to an interactive character sheet.
Everything (characters, actions, combo options) is user-editable in-app and persisted
in `localStorage`; characters are shared between devices via JSON export/import.

Decisions already made with the user (don't relitigate):
- One self-contained HTML file. **No build step, no dependencies, no CDN.** Vanilla JS.
- English UI. 2024 rules (not 2014!). Each player uses their own device/browser.
- Fully data-driven: class combos are seed data of a generic Option/effect system,
  not hardcoded logic.
- Party plays **without class resources** except spell slots (there is a global
  "use resources" setting; default relevant to the party is off-ish — check
  `DB.settings.useResources`).

## File layout

- `dnd-companion.html` — the entire app. Internal sections, in order:
  CSS → HTML skeleton → `<script>`: §1 rules constants (slot tables, weapon library),
  §2 utils, §3 dice expression parser/roller, §4 storage & character model,
  §5 seed data, §6 rules engine (`resolveSelection`, `commitSelection`, rests),
  §7 UI (render functions, inline `onclick` handlers as global functions),
  §8 init.
- `tests/` — Node test harness. `run.sh` extracts the `<script>` from the HTML and
  runs `engine.test.js` (pure logic) and `ui.test.js` (jsdom smoke test; needs
  `npm i jsdom` in `tests/`).
- `*.pdf` — the 2024 Player's Handbook + official character sheet. **Rules source of
  truth.** PDF page ≈ print page + 1 (e.g. print 215 weapons table = PDF page ~214).
  The PDF has a messy OCR text layer: use `pdftotext` to *locate* content, but verify
  numbers by reading the page image via the Read tool.

## Key model facts (schema is implicit, keep it consistent)

- `DB = { version, characters[], currentId, settings:{useResources} }`
- Character: `classes[{cls,subclass,level}]`, `casterType:"auto"|none|full|half|third|pact`,
  `abilities`, `skills{name:0|1|2}` (1 = proficient, 2 = expertise; list in `SKILLS`),
  `equipment[{id,name,qty}]`, `coins{pp,gp,ep,sp,cp}`,
  `resources[{id,name,max,reset,style}]`, `actions[]`, `options[]`,
  `portrait` (data-URI or null), `state` (hp, slotsUsed[9], pactUsed, res{}, econ{},
  flags[], perTurnUsed{}, log[]). Migration v3 backfills skills/equipment/coins.
  Actions/options order is user-sorted (drag & drop or ▲▼ in the Edit lists) — don't re-sort.
- `tests/wizard-walkthrough.js` (manual, not in run.sh) prints every wizard spell's
  resolution text — useful when changing instruction wording.
- Action: unified weapon/spell/feature. Damage rows use the dice language
  (`1d8+MOD`, `ceil(L/2)d6`; symbols L/PB/MOD/STR…CHA). `spellLevel` + `upcast`
  (`{mode:"dice",expr,type}` or `{mode:"count"}`), `count`/`countLabel` for
  multi-projectile spells, `damageScale:"cantrip"` for 5/11/17 scaling.
- Option: `applies` (all | tags | actionIds) + `effects` (dice[], advantage,
  autoCrit, slotCost+upcast, resourceCosts, time, speedZero, oncePerTurn, setFlags,
  note with `{DC}`-style tokens). Options ARE the combo system (Sneak Attack,
  Steady Aim, Divine Smite are seed options). **Feats are also Options**:
  `FEAT_LIBRARY` (§1) holds 2024 combat feats added via a quick-pick in
  Edit → Options (`featOption()` instantiates them). Note-only feats (2024
  Sharpshooter has no −5/+10 anymore!) are `defaultOn` rules reminders; GWM adds
  `PB` damage on `heavy`-tagged attacks. Schema migrations live in `migrateDB()`
  gated by `DB.version` (v2 = feats).
- 2024 rules gotchas already encoded: Assassinate is **not** auto-crit (advantage +
  initiative advantage + rogue-level bonus damage); Paladins get slots at level 1;
  Cure Wounds/Healing Word are 2d8/2d4 and upcast by the same amount.

## Conventions

- UI = global render functions + inline `onclick` strings; top-level `const/let` are
  in global lexical scope (NOT on `window`) — from tests, reach them via `window.eval`.
- All mutations call `saveDB()` and re-render the affected view.
- `resolveSelection(ch, action, sel)` is pure (no state writes) — costs/warnings are
  computed there, applied only in `commitSelection`.
- Escape all user strings with `esc()` when building HTML.
- Keep the file openable from `file://` — nothing that requires a server or remote
  fetch; images embedded as data URIs.

## Verifying changes

1. `node --check` on the extracted script, then `./tests/run.sh`.
2. Open the app (`open dnd-companion.html`) and walk the core flow:
   Sylas → Shortbow → Steady Aim + Sneak Attack (+7 to hit adv, 1d6+4 + 3d6) →
   Use → bonus action used, Speed 0, once-per-turn set → New turn clears.
   Wizard → Fireball at level 4 (9d6, slot pip spent; long rest restores).
3. Reload the page — state must persist. When changing the character schema, keep
   old saved data loadable (migrate in `loadDB`, don't just bump `STORE_KEY`).
