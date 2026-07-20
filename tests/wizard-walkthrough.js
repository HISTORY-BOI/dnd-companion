// Prints what the app actually tells a wizard player for each spell — a "mock
// wizard" review. Not part of run.sh; run manually: node wizard-walkthrough.js
const fs = require("fs"); const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "dnd-companion.html"), "utf8");
const js = src.match(/<script>([\s\S]*)<\/script>/)[1];
const strip = h => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
// sloppy-mode eval leaks the app's function declarations into this scope
eval("globalThis.localStorage={getItem:()=>null,setItem:()=>{}};globalThis.confirm=()=>true;globalThis.alert=()=>{};" + js);

const wiz = seedWizard();
console.log("=== Eldrin, Wizard 5 — spell DC", contextOf(wiz, null).dc, "— slots", JSON.stringify(slotsFor(wiz)), "===\n");
for (const a of wiz.actions) {
  const levels = a.spellLevel >= 1 ? [a.spellLevel, Math.min(a.spellLevel + 1, 3)] : [null];
  for (const lvl of [...new Set(levels)]) {
    const r = resolveSelection(wiz, a, { opts: new Set(), slotLevel: lvl, optSlots: {} });
    console.log(`--- ${a.name}${lvl ? ` (slot L${lvl})` : ""} [${a.kind}${a.spellLevel === 0 ? ", cantrip" : ""}]`);
    r.steps.forEach((s, i) => console.log(`  ${i + 1}. ${strip(s)}`));
    if (r.damage.length) console.log(`  → min ${r.stats.min} / avg ${r.stats.avg} / max ${r.stats.max}`);
    if (r.healStats) console.log(`  → heal ${r.healStats.min}–${r.healStats.max}`);
    if (r.warnings.length) console.log("  ⚠", r.warnings.join(" | "));
    console.log();
  }
}
