const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(require("path").join(__dirname, "..", "dnd-companion.html"), "utf8");
const errors = [];
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "http://localhost/app.html",
  beforeParse(window) {
    window.addEventListener("error", e => errors.push(e.message));
    window.confirm = () => true; window.alert = () => {}; window.prompt = () => "Test Hero";
  }
});
const w = dom.window, d = w.document;
const G = expr => w.eval(expr);
let fails = 0;
const check = (name, cond, extra) => { if (!cond) { fails++; console.log("FAIL:", name, extra ?? ""); } else console.log("ok:", name); };

setTimeout(() => {
  try {
    check("no window errors on load", errors.length === 0, errors);
    check("char select has 4 seeds", d.querySelectorAll("#charSelect option").length === 4);
    check("sheet renders HP", d.querySelector("#view-sheet").textContent.includes("38 / 38"));
    check("sheet shows AC 15", d.querySelector("#view-sheet .statrow .stat .v").textContent === "15");
    check("Sylas portrait on sheet", d.querySelector("#view-sheet img.portrait") !== null);
    check("resources hidden by default (resource-less mode)", !d.querySelector("#view-sheet").textContent.includes("Resources"));
    check("passive perception tile (Sylas 14)", [...d.querySelectorAll("#view-sheet .stat")].some(t => t.textContent.includes("Pass. Perc.") && t.textContent.includes("14")));
    check("skills card with expertise Stealth +10", [...d.querySelectorAll("#view-sheet .skill")].some(k => k.textContent.includes("Stealth") && k.textContent.includes("+10")));
    check("equipment card seeded", [...d.querySelectorAll("#view-sheet .equiprow")].length >= 5);
    check("coins shown", d.querySelector("#view-sheet .coinrow input") !== null);
    w.clearLog();
    check("clear log works", d.querySelector("#log").textContent.includes("Nothing yet"));


    G(`UI.tab="actions";render()`);
    check("rogue action list renders", d.querySelectorAll("#view-actions .actionitem").length >= 6);
    check("shows min-max damage", d.querySelector("#view-actions .dmg").textContent.trim().length > 0);

    const rogue = w.currentChar();
    const shortbow = rogue.actions.find(a => a.name === "Shortbow");
    w.openAction(shortbow.id);
    check("modal opened", d.querySelector(".modal h2") && d.querySelector(".modal h2").textContent === "Shortbow");
    check("7 options shown (incl. Sharpshooter feat)", d.querySelectorAll(".optrow input").length === 7, d.querySelectorAll(".optrow input").length);
    check("Sharpshooter pre-checked (defaultOn)", [...d.querySelectorAll(".optrow")].some(r => r.textContent.includes("Sharpshooter") && r.querySelector("input").checked));
    check("Sharpshooter note in instructions", d.querySelector(".instructions").textContent.includes("Ignore Half/Three-Quarters Cover"));

    const sneak = rogue.options.find(o => o.name === "Sneak Attack");
    const steady = rogue.options.find(o => o.name === "Steady Aim");
    w.toggleOpt(sneak.id); w.toggleOpt(steady.id);
    const instr = d.querySelector(".instructions").textContent;
    check("instructions mention Advantage", /Advantage/.test(instr), instr.slice(0, 200));
    check("instructions mention 3d6", /3d6/.test(instr));
    check("min/avg/max shown", d.querySelector(".mmx") !== null);

    w.doAttackRoll();
    check("attack roll shown", /To hit/.test(d.querySelector(".rollout").textContent));
    w.doDamageRoll();
    check("damage roll shown", d.querySelectorAll(".rollout").length >= 2);
    w.doCommit();
    check("modal closed & back on sheet", G("UI.tab") === "sheet" && !d.querySelector(".modal"));
    check("bonus action marked used", d.querySelector(".econ.used") !== null);
    check("speed shows 0", d.querySelector("#view-sheet .statrow .stat .v.zeroed") !== null);
    check("log has entry", d.querySelector("#log").textContent.includes("Shortbow"));

    w.doNewTurn();
    check("new turn clears speed 0", d.querySelector("#view-sheet .stat .v.zeroed") === null);

    G(`DB.currentId = DB.characters.find(c=>c.name.includes("Eldrin")).id; render()`);
    check("wizard slots rendered", d.querySelectorAll("#view-sheet .slotrow").length >= 3);
    const wiz = w.currentChar();
    const fireball = wiz.actions.find(a => a.name === "Fireball");
    G(`UI.tab="actions";render()`);
    w.openAction(fireball.id);
    check("slot picker present", d.querySelector(".modal select") !== null);
    w.doCommit();
    check("fireball spent a L3 slot", wiz.state.slotsUsed[2] === 1, wiz.state.slotsUsed);

    G(`UI.tab="edit";render()`);
    check("edit: character form", d.querySelector("#view-edit fieldset") !== null);
    G(`UI.editTab="actions";renderEdit()`);
    check("edit: actions list", d.querySelectorAll("#view-edit .actionitem").length > 3);
    G('UI.editActionId="' + fireball.id + '";renderEdit()');
    check("edit: action form opens", d.querySelector("#view-edit .card textarea") !== null);
    G(`UI.editTab="options";UI.editOptionId=null;renderEdit()`);
    check("edit: options subtab renders", d.querySelector("#view-edit .btnrow") !== null);
    check("feat quick-pick present", d.querySelector("#featPick") !== null);
    const firstAction = w.currentChar().actions[0].id;
    w.eval(`UI.editTab="actions";UI.editActionId=null;renderEdit()`);
    check("drag handles present", d.querySelector("#view-edit .draghandle") !== null);
    w.moveItem("actions", 0, 1);
    check("arrow sorting moved first action down", w.currentChar().actions[1].id === firstAction);
    w.moveItem("actions", 1, -1);
    check("moved back up", w.currentChar().actions[0].id === firstAction);
    w.eval(`UI.editTab="options";renderEdit()`);
    const optCountBefore = w.currentChar().options.length;
    const gwmIdx = G(`FEAT_LIBRARY.findIndex(f => f.name.startsWith("Great Weapon Master"))`);
    d.querySelector("#featPick").value = String(gwmIdx);
    w.addFeatFromLibrary();
    check("feat added as editable option", w.currentChar().options.length === optCountBefore + 1 && d.querySelector("#view-edit .card textarea") !== null);

    // Feats that change no roll land under Actions as reference cards instead.
    w.eval(`UI.editTab="options";renderEdit()`);
    const actCountBefore = w.currentChar().actions.length;
    const optCountBefore2 = w.currentChar().options.length;
    const toughIdx = G(`FEAT_LIBRARY.findIndex(f => f.name.startsWith("Tough"))`);
    d.querySelector("#featPick").value = String(toughIdx);
    w.addFeatFromLibrary();
    check("reference feat added as feature action",
      w.currentChar().actions.length === actCountBefore + 1 &&
      w.currentChar().options.length === optCountBefore2 &&
      w.currentChar().actions[w.currentChar().actions.length - 1].kind === "feature");
    check("feat library complete", G("FEAT_LIBRARY.length") === 75);

    w.menuAction("new");
    check("new character created", G("DB.characters.length") === 5);
    w.menuAction("delete");
    check("character deleted again", G("DB.characters.length") === 4);

    // export path shouldn't throw (jsdom lacks URL.createObjectURL — stub it)
    w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
    w.menuAction("export");
    check("export runs", true);

    check("no window errors at end", errors.length === 0, errors);
  } catch (e) {
    fails++; console.log("EXCEPTION:", e.message, e.stack.split("\n")[1]);
  }
  console.log(fails ? `\n${fails} UI FAILURES` : "\nALL UI TESTS PASSED");
  process.exit(fails ? 1 : 0);
}, 300);
