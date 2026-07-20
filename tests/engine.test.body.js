// Assertions run in the same scope as the extracted app script (see run.sh).

let fails = 0;
function check(name, cond, extra) {
  if (!cond) { fails++; console.log("FAIL:", name, extra ?? ""); }
  else console.log("ok:", name);
}

// --- dice parser ---
const rogue = seedRogue();
const shortbow = rogue.actions.find(a => a.name === "Shortbow");
const ctx = contextOf(rogue, shortbow);
check("rogue ctx level 5", ctx.level === 5);
check("rogue PB +3", ctx.pb === 3);
check("shortbow uses DEX +4", ctx.mod === 4, ctx);

const p = parseDice("ceil(L/2)d6", ctx);
check("sneak dice = 3d6 at L5", p.terms[0].count === 3 && p.terms[0].size === 6, JSON.stringify(p));
const p2 = parseDice("1d6+MOD", ctx);
const st2 = diceStats(p2.terms);
check("1d6+4 stats", st2.min === 5 && st2.max === 10 && st2.avg === 7.5, JSON.stringify(st2));
const p3 = parseDice("-1d6", ctx);
const st3 = diceStats(p3.terms);
check("-1d6 stats min=-6 max=-1", st3.min === -6 && st3.max === -1, JSON.stringify(st3));
check("L flat = 5", parseDice("L", ctx).terms[0].count === 5);
check("bad symbol error", parseDice("2dX+FOO", ctx).errors.length > 0);

// --- rogue combo: shortbow + sneak + steady aim + assassinate ---
const optIds = n => rogue.options.find(o => o.name.startsWith(n)).id;
const sel = { opts: new Set([optIds("Sneak Attack"), optIds("Steady Aim"), optIds("Assassinate")]), slotLevel: null, optSlots: {} };
const r = resolveSelection(rogue, shortbow, sel);
check("attack bonus +7", r.attackBonus === 7, r.attackBonus);
check("advantage", r.advState === 1);
// damage: 1d6+4 piercing + 3d6 + 5 flat => min 1+4+3+5=13? min: 1d6=1, +4, 3d6=3, L=5 => 13; max 6+4+18+5=33
check("combo min 13 max 33", r.stats.min === 13 && r.stats.max === 33, JSON.stringify(r.stats));
check("one damage group (piercing)", r.damage.length === 1 && r.damage[0].type === "piercing", JSON.stringify(r.damage.map(g=>g.type)));
check("bonus action cost", r.costs.some(c => c.kind === "econ" && c.time === "bonus"));
check("speed zero cost", r.costs.some(c => c.kind === "speedZero"));
check("once per turn cost", r.costs.some(c => c.kind === "perTurn"));

// commit and verify state
commitSelection(rogue, shortbow, sel, r);
check("bonus used", rogue.state.econ.bonus === true);
check("speed0 flag", rogue.state.flags.some(f => f.label.startsWith("Speed 0")));
check("sneak marked used", Object.keys(rogue.state.perTurnUsed).length > 0);
const r2 = resolveSelection(rogue, shortbow, sel);
check("warns once-per-turn", r2.warnings.some(w => /already used this turn/.test(w)), r2.warnings);
newTurn(rogue);
check("new turn clears flags", !rogue.state.flags.some(f => f.label.startsWith("Speed 0")) && rogue.state.econ.bonus === false);

// --- feats ---
const sharp = rogue.options.find(o => o.name.startsWith("Sharpshooter"));
check("sharpshooter seeded on rogue", !!sharp);
check("sharpshooter applies to shortbow", optionApplies(sharp, shortbow));
check("sharpshooter NOT on shortsword", !optionApplies(sharp, rogue.actions.find(a => a.name === "Shortsword")));
const selSharp = { opts: new Set([sharp.id]), slotLevel: null, optSlots: {} };
const rSharp = resolveSelection(rogue, shortbow, selSharp);
check("sharpshooter is note-only (no damage change)", rSharp.stats.max === 10, JSON.stringify(rSharp.stats));
check("sharpshooter note present", rSharp.notes.some(n => /Three-Quarters Cover/.test(n)));
const gwmDef = FEAT_LIBRARY.find(f => f.name.startsWith("Great Weapon Master"));
const pal0 = seedPaladin();
const gwm = featOption(gwmDef.name);
pal0.options.push(gwm);
// paladin longsword is not heavy — GWM must not apply; greatsword (heavy) must
check("GWM not on longsword", !optionApplies(gwm, pal0.actions.find(a => a.name === "Longsword")));
const gs = weaponAction("Greatsword");
pal0.actions.push(gs);
check("GWM applies to greatsword", optionApplies(gwm, gs));
const rG = resolveSelection(pal0, gs, { opts: new Set([gwm.id]), slotLevel: null, optSlots: {} });
check("GWM adds PB: 2d6+3+3 → max 18", rG.stats.max === 18 && rG.stats.min === 8, JSON.stringify(rG.stats));

// --- wizard: fireball upcast, magic missile darts, cantrip scaling ---
const wiz = seedWizard();
const fireball = wiz.actions.find(a => a.name === "Fireball");
const rf = resolveSelection(wiz, fireball, { opts: new Set(), slotLevel: 4, optSlots: {} });
check("fireball@4 = 9d6", rf.stats.min === 9 && rf.stats.max === 54, JSON.stringify(rf.stats));
check("fireball save DC 14", rf.save && rf.save.dc === 14 && rf.save.half === true, JSON.stringify(rf.save));
check("slot cost lvl4", rf.costs.some(c => c.kind === "slot" && c.level === 4));
commitSelection(wiz, fireball, { opts: new Set(), slotLevel: 4, optSlots: {} }, rf);
check("slot 4 spent", wiz.state.slotsUsed[3] === 1);
longRest(wiz);
check("long rest restores slots", wiz.state.slotsUsed[3] === 0);

const mm = wiz.actions.find(a => a.name === "Magic Missile");
const rm = resolveSelection(wiz, mm, { opts: new Set(), slotLevel: 2, optSlots: {} });
check("MM@2 = 4 darts", rm.count === 4, rm.count);
check("MM total min 8 max 20", rm.stats.min === 8 && rm.stats.max === 20, JSON.stringify(rm.stats));

const fb = wiz.actions.find(a => a.name === "Fire Bolt");
const rb = resolveSelection(wiz, fb, { opts: new Set(), slotLevel: null, optSlots: {} });
check("fire bolt 2d10 at L5", rb.stats.min === 2 && rb.stats.max === 20, JSON.stringify(rb.stats));

// --- paladin: divine smite upcast + healing ---
const pal = seedPaladin();
const sword = pal.actions.find(a => a.name === "Longsword");
const smiteId = pal.options.find(o => o.name === "Divine Smite").id;
const selP = { opts: new Set([smiteId]), slotLevel: null, optSlots: {} };
selP.optSlots[smiteId] = 2;
const rp = resolveSelection(pal, sword, selP);
// 1d8+3 slashing + 3d8 radiant (2d8 base + 1d8 upcast)
check("smite groups slashing+radiant", rp.damage.length === 2, JSON.stringify(rp.damage.map(g => [g.type, fmtTerms(g.terms)])));
check("smite@2 total min 5 max 35", rp.stats.min === 1+3+3 && rp.stats.max === 8+3+24, JSON.stringify(rp.stats));
check("smite slot cost lvl2", rp.costs.some(c => c.kind === "slot" && c.level === 2));
check("smite bonus action", rp.costs.some(c => c.kind === "econ" && c.time === "bonus"));
check("paladin half caster slots L5 = 4,2", JSON.stringify(slotsFor(pal)) === "[4,2]", JSON.stringify(slotsFor(pal)));

const cure = pal.actions.find(a => a.name === "Cure Wounds");
const rc = resolveSelection(pal, cure, { opts: new Set(), slotLevel: 2, optSlots: {} });
check("cure@2 healing 4d8+3", rc.healing && rc.healStats.min === 7 && rc.healStats.max === 35, JSON.stringify(rc.healStats));
check("no damage groups for cure", rc.damage.length === 0);

// --- cleric: toll the dead cantrip save ---
const cle = seedCleric();
const sac = cle.actions.find(a => a.name === "Sacred Flame");
const rs = resolveSelection(cle, sac, { opts: new Set(), slotLevel: null, optSlots: {} });
check("sacred flame 2d8 at L5, no half", rs.stats.max === 16 && rs.save.half === false, JSON.stringify(rs.stats));

// crit doubling
const terms = parseDice("3d6+4", ctx).terms;
const critStats = diceStats(terms, { crit: true });
check("crit 3d6+4 => 6d6+4", critStats.min === 10 && critStats.max === 40, JSON.stringify(critStats));
const roll = rollTerms(terms, { crit: true });
check("crit roll has 6 dice", roll.detail.filter(d => d.die).length === 6);

// d20
for (const adv of [-1,0,1]) {
  const rr = rollD20(adv);
  check("d20 adv="+adv+" valid", rr.pick >= 1 && rr.pick <= 20 && rr.rolls.length === (adv===0?1:2));
}

// note tokens
check("token DC-DEX", noteTokens("DC {DC-DEX}", ctx) === "DC 15", noteTokens("DC {DC-DEX}", ctx));

console.log(fails ? `\n${fails} FAILURES` : "\nALL TESTS PASSED");
process.exit(fails ? 1 : 0);