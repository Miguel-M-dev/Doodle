/* Engine: the automatic Doodle check. GitHub runs this on every pull request
   and every change to main (see .github/workflows/check.yml). It runs the
   same checks as the web page, and it also works out how often the computer
   guesses right, so you can see whether a change made it better or worse. */

const fs = require("fs");
const path = require("path");
const Doodle = require("./doodle.js");

const root = path.join(__dirname, "..");
const read = (p) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : null);
const drawingsDir = path.join(root, "drawings");
const here = fs.existsSync(drawingsDir) ? fs.readdirSync(drawingsDir) : [];

const files = { game: null, list: null, drawings: [] };
const gameText = read("game.txt");
if (gameText !== null) files.game = { name: "game.txt", text: gameText };
const listText = read("drawings/list.txt");
if (listText !== null) {
  files.list = { name: "drawings/list.txt", text: listText };
  // Only the names, so the real parse (with its messages) happens in build().
  const names = Doodle.lines(listText).lines.map((l) => l.text.replace(/^drawings\//, "")).filter((t) => t.endsWith(".txt"));
  for (const name of [...new Set(names)]) {
    // The web cares about capital letters, so check the exact spelling.
    if (here.includes(name)) files.drawings.push({ name, text: fs.readFileSync(path.join(drawingsDir, name), "utf8") });
    else files.drawings.push({ name, missing: true, near: here.find((h) => h.toLowerCase() === name.toLowerCase()) });
  }
}

const model = Doodle.build(files);
const problems = model.problems.slice();

// Drawing files that aren't in list.txt are never loaded.
for (const f of here) {
  if (f.endsWith(".txt") && f !== "list.txt" && !files.drawings.some((d) => d.name === f)) {
    problems.push({ level: "warning", file: "drawings/" + f, line: 0,
      message: `drawings/${f} isn't in the game, because it isn't listed in drawings/list.txt.`,
      fix: `Add a line to drawings/list.txt that says: ${f}` });
  }
}

const order = ["game.txt", "drawings/list.txt", ...files.drawings.map((d) => "drawings/" + d.name)];
const rank = (p) => (p.level === "error" ? 0 : 1e7) + (order.indexOf(p.file) + 1) * 1e4 + p.line;
problems.sort((a, b) => rank(a) - rank(b));
const errors = problems.filter((p) => p.level === "error");
const warnings = problems.filter((p) => p.level === "warning");
const enc = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

for (const p of problems) {
  const where = p.file + (p.line ? `, line ${p.line}` : "");
  console.log(`${p.level === "error" ? "PROBLEM" : "Heads up"}  ${where}\n  ${p.message}\n  ${p.fix}\n`);
  // These lines make GitHub show the message right next to the line it's about.
  console.log(`::${p.level} file=${p.file}${p.line ? ",line=" + p.line : ""},title=${enc(p.message).replace(/[,:]/g, " ")}::${enc(p.message + " " + p.fix)}`);
}

// The report card: how often the computer guesses right.
const pct = (x) => Math.round(x * 100) + "%";
const name = (id) => (model.categories.find((c) => c.id === id) || { name: id }).name;
const card = model.playable.length >= 2 ? Doodle.report(model) : null;

const drawings = model.examples.length;
const summary = errors.length
  ? `## ✗ The game has ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix`
  : `## ✓ The game checks out`;
const lines = [summary, "",
  `${model.playable.length} categories in the game, ${drawings} drawings.`, ""];
if (card) {
  lines.push(`### Report card: ${pct(card.accuracy)} right`, "",
    "Each drawing was hidden in turn, and the computer guessed it from all the others.", "",
    "| Category | Drawings | Guessed right |", "| --- | --- | --- |");
  for (const c of model.playable) lines.push(`| ${c.emoji} ${c.name} | ${card.per[c.id].total} | ${pct(card.per[c.id].accuracy)} |`);
  if (card.pairs.length) lines.push("", `Most mixed up: **${name(card.pairs[0].a)}** and **${name(card.pairs[0].b)}** (${card.pairs[0].times} times).`);
  lines.push("");
}
if (problems.length) {
  lines.push("| | Where | Problem | How to fix it |", "| --- | --- | --- | --- |");
  for (const p of problems) {
    const cell = (s) => String(s).replace(/\|/g, "\\|");
    lines.push(`| ${p.level === "error" ? "🔴" : "🟡"} | ${p.file}${p.line ? " line " + p.line : ""} | ${cell(p.message)} | ${cell(p.fix)} |`);
  }
}
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
console.log(summary.replace(/^## /, "") +
  ` (${model.playable.length} categories, ${drawings} drawings${card ? ", guesses " + pct(card.accuracy) + " right" : ""}, ${warnings.length} heads-up)`);
process.exit(errors.length ? 1 : 0);
