/* Engine: reads the drawing files, turns every drawing into numbers, and
   guesses what a new drawing is by finding the saved drawings most like it.
   It also checks the files for mistakes. The web page and the automatic
   Doodle check both use this file. You don't need to edit it.
   docs/HOW-IT-WORKS.md explains how the guessing works. */

const Doodle = (() => {
  // ---------------------------------------------------------------- settings
  const THEMES = ["paper", "chalk", "neon", "sunny"];
  const SETTINGS = ["title", "by", "theme", "seconds", "rounds"];
  const DEFAULTS = { title: "Doodle Guesser", by: "", theme: "paper", seconds: 20, rounds: 6 };
  const MIN_PLAY = 5;     // a category needs this many drawings to be in the game
  const FEW = 15;         // fewer than this: a gentle heads-up
  const K = 7;            // how many similar drawings get a vote

  // Every point of a drawing is stored as two characters from this alphabet,
  // so a whole drawing fits on one line of a text file.
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const GRID = 63;        // points are stored on a 64 × 64 grid

  // ----------------------------------------------------------- small helpers
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  function closest(name, names) {
    let best = null, bestD = Infinity;
    for (const n of names) {
      const dd = distance(name.toLowerCase(), n.toLowerCase());
      if (dd < bestD) { best = n; bestD = dd; }
    }
    return bestD <= (name.length <= 4 ? 1 : Math.max(2, Math.floor(name.length / 4))) ? best : null;
  }

  // Comments (<!-- -->) become blank, but every line keeps its line number.
  function lines(text) {
    const out = [];
    let inComment = false, openedAt = 0;
    String(text).replace(/\r/g, "").split("\n").forEach((raw, i) => {
      let line = "", rest = raw;
      while (rest.length) {
        if (inComment) {
          const end = rest.indexOf("-->");
          if (end < 0) { rest = ""; break; }
          inComment = false; rest = rest.slice(end + 3);
        } else {
          const start = rest.indexOf("<!--");
          if (start < 0) { line += rest; rest = ""; break; }
          line += rest.slice(0, start); inComment = true; openedAt = i + 1; rest = rest.slice(start + 4);
        }
      }
      out.push({ n: i + 1, text: line.trim() });
    });
    return { lines: out, unclosed: inComment ? openedAt : 0 };
  }

  // -------------------------------------------------------- drawings as text
  // A drawing is a list of strokes; a stroke is a list of [x, y] points.
  // Squeeze it onto the 64 × 64 grid (keeping its shape) and write it out.
  function encode(strokes) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const s of strokes) for (const [x, y] of s) {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
    const scale = GRID / Math.max(maxx - minx, maxy - miny, 1e-9);
    const parts = [];
    for (const s of strokes) {
      let last = "", text = "";
      for (const [x, y] of s) {
        const pair = ALPHA[Math.round((x - minx) * scale)] + ALPHA[Math.round((y - miny) * scale)];
        if (pair !== last) text += pair;
        last = pair;
      }
      if (text) parts.push(text);
    }
    return parts.join(" ");
  }

  // Returns the strokes, or a string that says what's wrong with the line.
  function decode(line) {
    const strokes = [];
    for (const part of line.split(/\s+/).filter(Boolean)) {
      const odd = [...part].find((ch) => !ALPHA.includes(ch));
      if (odd) return `it has a "${odd}" in it, which never appears in a drawing`;
      if (part.length % 2) return "a piece of it has an odd number of characters";
      const stroke = [];
      for (let i = 0; i < part.length; i += 2) {
        const x = ALPHA.indexOf(part[i]), y = ALPHA.indexOf(part[i + 1]);
        if (x < 0 || y < 0) return `it has a "${x < 0 ? part[i] : part[i + 1]}" in it, which never appears in a drawing`;
        stroke.push([x, y]);
      }
      strokes.push(stroke);
    }
    return strokes;
  }

  // Fewer points, same shape: drop points that sit on a nearly straight line.
  function simplify(points, eps) {
    if (points.length < 3) return points.slice();
    const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let far = 0, at = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const [px, py] = points[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > far) { far = d; at = i; }
    }
    if (far <= eps) return [points[0], points[points.length - 1]];
    return simplify(points.slice(0, at + 1), eps).slice(0, -1).concat(simplify(points.slice(at), eps));
  }

  // ------------------------------------------------- drawings as numbers
  // The computer can't look at a drawing. Instead, every drawing becomes a
  // list of 720 numbers:
  //   * a 24 × 24 picture of where the ink is (576 numbers), and
  //   * which way the lines go (flat, steep, or the two diagonals) in each
  //     part of a 6 × 6 grid (144 numbers).
  // Two drawings that look alike end up with lists of numbers that are alike.
  const SIZE = 24, ZONES = 6, DIR_WEIGHT = 1.5;

  function features(strokes) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const s of strokes) for (const [x, y] of s) {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
    const ink = new Float32Array(SIZE * SIZE), dirs = new Float32Array(ZONES * ZONES * 4);
    if (!isFinite(minx)) return { vector: new Float32Array(ink.length + dirs.length), ink };
    const size = Math.max(maxx - minx, maxy - miny) || 1, cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const norm = ([x, y]) => [(x - cx) / size + 0.5, (y - cy) / size + 0.5];
    const pad = 1.5, sc = SIZE - 2 * pad;
    for (const stroke of strokes) {
      const s = stroke.map(norm);
      if (s.length === 1) s.push(s[0]);
      for (let i = 0; i < s.length - 1; i++) {
        const [x0, y0] = s[i], [x1, y1] = s[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        const steps = Math.max(1, Math.ceil(len * SIZE * 2));
        const way = ((Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) % 4) + 4) % 4;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          const px = pad + x * sc, py = pad + y * sc, ix = Math.floor(px), iy = Math.floor(py);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = ix + dx, Y = iy + dy;
            if (X < 0 || Y < 0 || X >= SIZE || Y >= SIZE) continue;
            const w = Math.max(0, 1 - Math.hypot(X + 0.5 - px, Y + 0.5 - py) / 1.5);
            if (w > ink[Y * SIZE + X]) ink[Y * SIZE + X] = w;
          }
          if (len > 0 && k < steps) {
            const zx = Math.min(ZONES - 1, Math.max(0, Math.floor(x * ZONES)));
            const zy = Math.min(ZONES - 1, Math.max(0, Math.floor(y * ZONES)));
            dirs[(zy * ZONES + zx) * 4 + way] += len / steps;
          }
        }
      }
    }
    const picture = Float32Array.from(ink);
    unit(ink); unit(dirs);
    const vector = new Float32Array(ink.length + dirs.length);
    vector.set(ink);
    for (let i = 0; i < dirs.length; i++) vector[ink.length + i] = dirs[i] * DIR_WEIGHT;
    unit(vector);
    return { vector, ink: picture };
  }

  function unit(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= s;
    return v;
  }

  // How alike two drawings are: 1 means identical, 0 means nothing in common.
  function similarity(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // ------------------------------------------------------------- guessing
  // Find the K saved drawings most like this one. Each one votes for its own
  // category, and more similar drawings get a bigger vote.
  function guess(vector, examples, skip) {
    const near = [];
    for (const ex of examples) {
      if (ex === skip) continue;
      const s = similarity(vector, ex.vector);
      if (near.length < K || s > near[near.length - 1].similarity) {
        near.push({ example: ex, similarity: s });
        near.sort((a, b) => b.similarity - a.similarity);
        if (near.length > K) near.pop();
      }
    }
    const votes = new Map();
    for (const n of near) {
      const w = Math.pow(Math.max(n.similarity, 0), 4);
      votes.set(n.example.category, (votes.get(n.example.category) || 0) + w);
    }
    const total = [...votes.values()].reduce((a, b) => a + b, 0) || 1;
    const ranked = [...votes.entries()]
      .map(([category, v]) => ({ category, share: v / total }))
      .sort((a, b) => b.share - a.share);
    return { ranked, near };
  }

  // The report card: hide each drawing in turn, ask the computer to guess it
  // from all the others, and count how often it's right. `limit` pretends
  // each category only has that many drawings.
  function report(model, limit) {
    const cats = model.playable.map((c) => c.id);
    let examples = model.examples.filter((e) => cats.includes(e.category));
    if (limit) {
      const seen = {};
      examples = examples.filter((e) => (seen[e.category] = (seen[e.category] || 0) + 1) <= limit);
    }
    const confusion = {};
    for (const a of cats) { confusion[a] = {}; for (const b of cats) confusion[a][b] = 0; }
    const misses = [];
    let right = 0;
    for (const ex of examples) {
      const g = guess(ex.vector, examples, ex).ranked[0];
      const said = g ? g.category : null;
      if (said === ex.category) right++;
      else misses.push({ example: ex, said });
      if (said) confusion[ex.category][said]++;
    }
    const per = {};
    for (const c of cats) {
      const n = examples.filter((e) => e.category === c).length;
      per[c] = { total: n, right: confusion[c][c], accuracy: n ? confusion[c][c] / n : 0 };
    }
    const pairs = [];
    for (const a of cats) for (const b of cats) {
      if (a < b && confusion[a][b] + confusion[b][a] > 0) pairs.push({ a, b, times: confusion[a][b] + confusion[b][a] });
    }
    pairs.sort((x, y) => y.times - x.times);
    return { total: examples.length, right, accuracy: examples.length ? right / examples.length : 0, per, confusion, pairs, misses };
  }

  // ----------------------------------------------------------- the files
  function parseGame(file, text, problem) {
    const settings = { ...DEFAULTS };
    const { lines: ls, unclosed } = lines(text);
    if (unclosed) problem("error", file, unclosed, "A comment starts here with <!-- but never ends.", "Add --> where the note should end.");
    for (const { n, text: t } of ls) {
      if (!t) continue;
      const m = t.match(/^([a-z ]+):\s*(.*)$/i);
      if (!m) { problem("error", file, n, `This line isn't a setting: "${t}".`, "Settings look like title: Doodle Guesser. Notes for people go inside <!-- -->."); continue; }
      const key = m[1].trim().toLowerCase(), value = m[2].trim();
      if (!SETTINGS.includes(key)) {
        const near = closest(key, SETTINGS);
        problem("error", file, n, `There's no setting called "${key}".`, near ? `Did you mean ${near}:?` : `The settings are: ${SETTINGS.join(", ")}.`);
        continue;
      }
      if (key === "theme") {
        const v = value.toLowerCase();
        if (!THEMES.includes(v)) {
          const near = closest(v, THEMES);
          problem("error", file, n, `There's no theme called "${value}".`, near ? `Did you mean ${near}?` : `The themes are: ${THEMES.join(", ")}.`);
        } else settings.theme = v;
      } else if (key === "seconds" || key === "rounds") {
        const num = Number(value), [lo, hi] = key === "seconds" ? [5, 120] : [1, 20];
        if (!/^\d+$/.test(value) || num < lo || num > hi) problem("error", file, n, `${key}: needs a whole number from ${lo} to ${hi}.`, `For example: ${key}: ${DEFAULTS[key]}`);
        else settings[key] = num;
      } else settings[key] = value;
    }
    return settings;
  }

  function parseList(file, text, problem) {
    const names = [];
    const { lines: ls, unclosed } = lines(text);
    if (unclosed) problem("error", file, unclosed, "A comment starts here with <!-- but never ends.", "Add --> where the note should end.");
    for (const { n, text: t } of ls) {
      if (!t) continue;
      let name = t.replace(/^drawings\//, "");
      if (!name.endsWith(".txt")) {
        problem("error", file, n, `"${t}" isn't a drawing file name.`, `Drawing files end in .txt, like ${name.replace(/\.\w+$/, "")}.txt`);
        continue;
      }
      if (/\s/.test(name) || /[A-Z]/.test(name)) {
        problem("error", file, n, `"${t}" has ${/\s/.test(name) ? "a space" : "capital letters"} in it.`, "Drawing file names use lowercase letters, numbers and dashes, like ice-cream.txt. Rename the file to match.");
      }
      if (names.some((x) => x.name === name)) { problem("warning", file, n, `${name} is listed twice.`, "Delete one of the lines."); continue; }
      names.push({ name, line: n });
    }
    return names;
  }

  function parseCategory(file, text, problem) {
    const id = file.replace(/^.*\//, "").replace(/\.txt$/, "");
    const cat = { id, name: id.replace(/-/g, " "), emoji: "", by: "", file, drawings: [] };
    const { lines: ls, unclosed } = lines(text);
    if (unclosed) problem("error", file, unclosed, "A comment starts here with <!-- but never ends.", "Add --> where the note should end.");
    const seen = new Map();
    for (const { n, text: t } of ls) {
      if (!t) continue;
      if (t.startsWith("#")) { cat.name = t.replace(/^#+/, "").trim() || cat.name; continue; }
      const m = t.match(/^([a-z ]+):\s*(.*)$/i);
      const key = m ? m[1].trim().toLowerCase() : "";
      if (key === "emoji") { cat.emoji = m[2].trim(); continue; }
      if (key === "by") { cat.by = m[2].trim(); continue; }
      const near = m && closest(key, ["emoji", "by"]);
      if (near || (m && /\s/.test(m[1].trim()))) {
        problem("error", file, n, `There's no setting called "${key}".`, near ? `Did you mean ${near}:?` : "The only settings in a drawing file are emoji: and by:.");
        continue;
      }
      const strokes = decode(t);
      if (typeof strokes === "string") {
        problem("error", file, n, `Line ${n} isn't a drawing: ${strokes}.`,
          "Drawings are long strings of letters and numbers that the Teach tool makes. Did a line get cut in half, or did something get typed into the middle of one? Delete the line, or paste it again.");
        continue;
      }
      const points = strokes.reduce((a, s) => a + s.length, 0);
      if (points < 2) { problem("warning", file, n, "This drawing is almost empty (just a dot).", "Delete the line: a dot doesn't teach the computer anything."); continue; }
      if (seen.has(t)) {
        problem("warning", file, n, `This drawing is an exact copy of the one on line ${seen.get(t)}.`, "Delete one of them. Copies make the computer overconfident without teaching it anything new.");
        continue;
      }
      seen.set(t, n);
      cat.drawings.push({ strokes, line: n, text: t });
    }
    return cat;
  }

  // files: { game: {name, text} | null, list: {name, text} | null,
  //          drawings: [{ name, text } | { name, missing: true, near }] }
  function build(files) {
    const model = { settings: { ...DEFAULTS }, categories: [], playable: [], examples: [], problems: [], files: [] };
    const problem = (level, file, line, message, fix) => model.problems.push({ level, file, line, message, fix: fix || "" });

    if (files.game) model.settings = parseGame(files.game.name, files.game.text, problem);
    else problem("error", "game.txt", 0, "game.txt is missing.", "Make it again: Add file → Create new file → game.txt, with a line like title: Doodle Guesser.");

    const listed = files.list ? parseList(files.list.name, files.list.text, problem) : [];
    if (!files.list) problem("error", "drawings/list.txt", 0, "drawings/list.txt is missing, so the game doesn't know which drawings to load.", "Make it again with one drawing file name per line, like fish.txt.");

    for (const f of files.drawings) {
      const entry = listed.find((l) => l.name === f.name);
      if (f.missing) {
        problem("error", "drawings/list.txt", entry ? entry.line : 0, `drawings/${f.name} is listed, but there's no such file.`,
          f.near ? `Did you mean ${f.near}? File names have to match exactly, capital letters too.` : "Check the spelling, or make the file: Add file → Create new file.");
        continue;
      }
      model.files.push(f.name);
      const cat = parseCategory("drawings/" + f.name, f.text, problem);
      const twin = model.categories.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      if (twin) {
        problem("error", "drawings/" + f.name, 0, `Two files are both called "${cat.name}": ${twin.file} and ${cat.file}.`, "Put all the drawings of one thing in one file, or give one of them a different # name.");
        continue;
      }
      model.categories.push(cat);
    }

    for (const cat of model.categories) {
      const n = cat.drawings.length;
      if (n < MIN_PLAY) {
        problem("warning", cat.file, 0, `"${cat.name}" has ${n} drawing${n === 1 ? "" : "s"}, so it isn't in the game yet.`,
          `It joins the game at ${MIN_PLAY} drawings. Use Teach on the live site to draw more.`);
        continue;
      }
      if (n < FEW) problem("warning", cat.file, 0, `"${cat.name}" only has ${n} drawings.`, `It works, but the computer guesses much better with ${FEW} or more, drawn by more than one person.`);
      model.playable.push(cat);
      for (const d of cat.drawings) {
        const { vector } = features(d.strokes);
        model.examples.push({ category: cat.id, vector, strokes: d.strokes, file: cat.file, line: d.line });
      }
    }
    if (model.playable.length < 2) {
      problem("error", files.list ? files.list.name : "drawings/list.txt", 0, "The game needs at least 2 categories with enough drawings to guess between.",
        `Give at least two categories ${MIN_PLAY} or more drawings each.`);
    }
    return model;
  }

  const api = { THEMES, MIN_PLAY, FEW, K, ALPHA, encode, decode, simplify, features, similarity, guess, report, build, closest, lines };
  if (typeof module !== "undefined") module.exports = api;
  return api;
})();
