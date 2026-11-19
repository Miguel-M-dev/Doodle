/* Engine: the web page. Loads the files, runs the game, the guesser, the
   teaching tool, the gallery and the report card. You don't need to edit
   this file. */

const App = (() => {
  const $ = (id) => document.getElementById(id);
  const S = { live: null, draft: null, model: null, mode: "play", card: null, cardLimit: 0 };
  const DRAFT_KEY = "doodles-draft:" + location.pathname;
  const TEACH_KEY = "doodles-teach:" + location.pathname;

  // ------------------------------------------------------------ helpers
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "text") e.textContent = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid.nodeType ? kid : String(kid));
    return e;
  }
  const pct = (x) => Math.round(x * 100) + "%";
  const cat = (id) => S.model.categories.find((c) => c.id === id) || { id, name: id.replace(/-/g, " "), emoji: "" };
  const label = (id) => { const c = cat(id); return (c.emoji ? c.emoji + " " : "") + c.name; };
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage is off */ } },
  };
  const session = {
    get(key) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(key, v) { try { v ? sessionStorage.setItem(key, JSON.stringify(v)) : sessionStorage.removeItem(key); } catch (e) { /* storage is off */ } },
  };

  // ------------------------------------------------------------ loading
  async function fetchText(path) {
    try {
      const r = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
      return r.ok ? await r.text() : null;
    } catch (e) { return null; }
  }

  async function load() {
    if (location.protocol === "file:") {
      $("title").textContent = "Open this from your live link";
      showNotice("This page has to load its drawing files from a web server, so it can't run from a downloaded file. Open your team's live link instead: <code>https://YOUR-USERNAME.github.io/doodles/</code>");
      $("modes").hidden = true; $("main").hidden = true;
      return;
    }
    const files = { game: null, list: null, drawings: [] };
    const game = await fetchText("game.txt");
    if (game !== null) files.game = { name: "game.txt", text: game };
    const list = await fetchText("drawings/list.txt");
    if (list !== null) {
      files.list = { name: "drawings/list.txt", text: list };
      const names = Doodle.lines(list).lines.map((l) => l.text.replace(/^drawings\//, "")).filter((t) => t.endsWith(".txt"));
      const texts = await Promise.all([...new Set(names)].map((n) => fetchText("drawings/" + n)));
      [...new Set(names)].forEach((name, i) => files.drawings.push(texts[i] === null ? { name, missing: true } : { name, text: texts[i] }));
    }
    S.live = files;
    S.draft = session.get(DRAFT_KEY);
    rebuild();
  }

  function withDraft() {
    const f = { game: S.live.game, list: S.live.list, drawings: S.live.drawings.slice() };
    if (!S.draft) return f;
    if (S.draft.target === "new") f.drawings.push({ name: "draft.txt", text: S.draft.text });
    else {
      const i = f.drawings.findIndex((d) => d.name === S.draft.target);
      const d = { name: S.draft.target, text: S.draft.text };
      if (i >= 0) f.drawings[i] = d; else f.drawings.push(d);
    }
    return f;
  }

  function rebuild() {
    S.model = Doodle.build(withDraft());
    S.card = null;
    const st = S.model.settings;
    document.body.className = "theme-" + st.theme;
    $("title").textContent = st.title;
    document.title = st.title;
    $("byline").textContent = st.by ? "by " + st.by : "";
    $("credit").hidden = !S.model.categories.some((c) => /quick,? ?draw/i.test(c.by));
    problemButton();
    draftNotice();
    setMode(S.mode);
  }

  function showNotice(html, cls) {
    const n = $("notice");
    n.innerHTML = html; n.className = cls || ""; n.hidden = false;
  }

  // ------------------------------------------------------------ problems
  function problemButton() {
    const p = S.model.problems, errors = p.filter((x) => x.level === "error").length, warns = p.length - errors;
    const b = $("btn-problems");
    b.className = errors ? "bad" : warns ? "warn" : "";
    b.textContent = errors ? `${errors} problem${errors === 1 ? "" : "s"}` : warns ? `${warns} heads-up` : "✓ No problems";
  }

  function problemCards(list) {
    return list.map((p) => el("div", { class: "problem " + p.level },
      el("div", { class: "where", text: (p.level === "error" ? "Problem · " : "Heads up · ") + p.file + (p.line ? ", line " + p.line : "") }),
      el("div", { class: "what", text: p.message }),
      el("div", { class: "fix", text: p.fix })));
  }

  function showProblems() {
    const p = S.model.problems;
    openPanel("Problems", p.length
      ? [el("p", { text: "Red ones stop the game from working right; yellow ones are worth a look. Each one says which file and line to fix." }), ...problemCards(p)]
      : [el("p", { class: "all-good", text: "✓ No problems. Every file checks out." })]);
  }

  // ------------------------------------------------------------ panel
  function openPanel(title, kids) {
    $("panel-title").textContent = title;
    $("panel-body").replaceChildren(...kids);
    $("panel").hidden = false;
    $("panel-close").focus();
  }
  function closePanel() { $("panel").hidden = true; }

  // A closer look at one drawing: what it was guessed as, and why.
  function closer(strokes, title, skip) {
    const { vector, ink } = Doodle.features(strokes);
    const g = Doodle.guess(vector, S.model.examples, skip);
    const kids = [
      el("div", { class: "seen" }, Pad.thumb(strokes, 160, "#1f2933"),
        el("div", {}, el("h3", { text: "The computer's guesses" }), bars(g.ranked.slice(0, 3)))),
      el("h3", { text: "It looked most like these saved drawings" }),
      nearThumbs(g.near, 64),
      el("p", { class: "small muted", text: "Each of these gets a vote for its own category. The more alike two drawings are, the bigger the vote. " + (skip ? "(This drawing itself was left out, so it couldn't vote for itself.)" : "") }),
      el("h3", { text: "What the computer sees" }),
      el("div", { class: "seen" }, Pad.seen(ink, 96),
        el("p", { class: "small muted", text: "Your drawing, squeezed into a 24 × 24 grid of numbers (darker means more ink), plus which way each line points. That's all it has to go on." })),
    ];
    openPanel(title, kids);
  }

  function bars(ranked) {
    if (!ranked.length) return el("p", { class: "muted", text: "Nothing yet." });
    return el("div", { class: "bars" }, ranked.map((r) => el("div", { class: "bar-row" },
      el("span", { class: "label", text: label(r.category) }),
      el("span", { class: "bar" }, el("i", { style: `width:${Math.round(r.share * 100)}%` })),
      el("span", { class: "num", text: pct(r.share) }))));
  }

  function nearThumbs(near, px) {
    return el("div", { class: "thumbs" }, near.map((n) => el("div", {
      class: "thumb", title: `${n.example.file}, line ${n.example.line}`,
    }, Pad.thumb(n.example.strokes, px), el("span", { text: label(n.example.category) }), el("span", { text: pct(Math.max(0, n.similarity)) + " alike" }))));
  }

  // ------------------------------------------------------------ modes
  let stopMode = () => {};

  function setMode(mode) {
    stopMode(); stopMode = () => {};
    S.mode = mode;
    for (const b of $("modes").querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.mode === mode ? "true" : "false");
    const wide = mode === "drawings" || mode === "report";
    $("main").hidden = wide; $("wide").hidden = !wide;
    $("timer").hidden = true;
    $("pad-tools").replaceChildren();
    $("side").replaceChildren();
    $("wide").replaceChildren();
    Pad.clear();
    Pad.enable(true);
    ({ play: playIntro, guess: guessMode, teach: teachMode, drawings: gallery, report: reportCard })[mode]();
    Pad.redraw();
  }

  function prompt(main, sub) {
    $("prompt").replaceChildren(main, sub ? el("span", { class: "sub", text: sub }) : "");
  }

  function padTools(...buttons) { $("pad-tools").replaceChildren(...buttons); }
  const undoButton = () => el("button", { type: "button", onclick: () => Pad.undo(), text: "Undo" });
  const clearButton = () => el("button", { type: "button", onclick: () => Pad.clear(), text: "Clear" });

  function notEnough() {
    prompt("Not enough drawings yet", "The game needs at least two categories with " + Doodle.MIN_PLAY + " drawings each.");
    Pad.enable(false);
    $("side").replaceChildren(el("p", { text: "Open the Teach tab to draw some, or click the Problems button above to see what's missing." }));
  }

  // Throttle: run f at most once every ms milliseconds while drawing.
  function every(ms, f) {
    let last = 0;
    return () => { const now = performance.now(); if (now - last >= ms) { last = now; f(); } };
  }

  function speak(ranked, phrasing) {
    if (!ranked.length) return "…";
    const [a, b] = ranked;
    if (a.share >= 0.6 || !b) return phrasing.replace("{a}", label(a.category));
    return `Hmm… ${label(a.category)}? Or ${label(b.category)}?`;
  }

  // ------------------------------------------------------------ play
  const G = { list: [], round: 0, results: [], target: null, done: true, ends: 0, raf: 0, wait: 0 };

  function playIntro() {
    if (S.model.playable.length < 2) return notEnough();
    const st = S.model.settings;
    prompt("Play", "Draw what I ask. I'll guess while you draw.");
    Pad.enable(false);
    $("side").replaceChildren(
      el("div", { class: "speech", text: `Ready? I'll ask for ${st.rounds} drawings, and you get ${st.seconds} seconds for each one.` }),
      el("div", {}, el("button", { type: "button", class: "big-button", onclick: startGame, text: "Start" })),
      el("div", {}, el("h3", { text: "Things I know how to guess" }), knownChips()));
  }

  function knownChips() {
    return el("div", { class: "chips" }, S.model.playable.map((c) => el("span", { class: "chip", text: (c.emoji ? c.emoji + " " : "") + c.name })));
  }

  function startGame() {
    const ids = S.model.playable.map((c) => c.id), n = S.model.settings.rounds;
    G.list = [];
    let bag = [];
    while (G.list.length < n) {
      if (!bag.length) bag = ids.slice().sort(() => Math.random() - 0.5);
      const next = bag.pop();
      if (next === G.list[G.list.length - 1] && ids.length > 1) { bag.unshift(next); continue; }
      G.list.push(next);
    }
    G.round = 0; G.results = [];
    stopMode = () => { cancelAnimationFrame(G.raf); clearTimeout(G.wait); G.done = true; };
    nextRound();
  }

  function nextRound() {
    if (S.mode !== "play") return;
    if (G.round >= G.list.length) return gameOver();
    G.target = G.list[G.round++];
    G.done = false;
    Pad.clear(); Pad.enable(true);
    prompt(el("span", { text: "Draw: " + label(G.target) }), `Round ${G.round} of ${G.list.length}`);
    $("side").replaceChildren(el("div", { class: "speech", id: "speech", text: "…" }),
      el("div", { id: "live-bars" }));
    padTools(undoButton(), clearButton(), el("button", { type: "button", onclick: () => finishRound(false), text: "Skip" }));
    $("timer").hidden = false;
    const total = S.model.settings.seconds * 1000;
    G.ends = performance.now() + total;
    const tick = () => {
      const left = G.ends - performance.now();
      $("timer-fill").style.transform = `scaleX(${Math.max(0, left / total)})`;
      if (left <= 0) return finishRound(false);
      G.raf = requestAnimationFrame(tick);
    };
    G.raf = requestAnimationFrame(tick);
  }

  const phrases = ["I see {a}.", "Is it {a}?", "Looks like {a}.", "Maybe {a}?"];
  function playGuess() {
    if (S.mode !== "play" || G.done || Pad.points() < 3) return;
    const g = Doodle.guess(Doodle.features(Pad.drawing()).vector, S.model.examples);
    const top = g.ranked[0];
    if (top && top.category === G.target && top.share >= 0.5) return finishRound(true, g);
    $("speech").textContent = speak(g.ranked, phrases[G.results.length % phrases.length]);
    $("live-bars").replaceChildren(bars(g.ranked.slice(0, 3)));
  }

  function finishRound(won, g) {
    if (G.done) return;
    G.done = true;
    cancelAnimationFrame(G.raf);
    const strokes = Pad.drawing();
    Pad.enable(false);
    if (!g && strokes.length) g = Doodle.guess(Doodle.features(strokes).vector, S.model.examples);
    const said = g && g.ranked[0] ? g.ranked[0].category : null;
    G.results.push({ target: G.target, strokes, won, said });
    const sp = $("speech");
    if (won) { sp.textContent = `Oh, I know! It's ${label(G.target)}!`; sp.className = "speech win"; }
    else {
      sp.textContent = strokes.length && said ? `Time's up! I couldn't guess it. Was it ${label(said)}?` : "Time's up! I couldn't guess it.";
      sp.className = "speech lose";
    }
    padTools();
    G.wait = setTimeout(nextRound, 1700);
  }

  function gameOver() {
    $("timer").hidden = true;
    const got = G.results.filter((r) => r.won).length;
    $("main").hidden = true; $("wide").hidden = false;
    $("wide").replaceChildren(
      el("div", {}, el("div", { class: "big-number", text: `${got} of ${G.results.length}` }),
        el("p", { text: got === G.results.length ? "I guessed every one! Click a drawing to see why." : "That's how many I guessed. Click any drawing to see what I saw." })),
      el("div", { class: "results" }, G.results.map((r) => el("div", {
        class: "result " + (r.won ? "good" : "bad"), role: "button", tabindex: "0",
        onclick: () => r.strokes.length && closer(r.strokes, "You drew " + label(r.target)),
      }, r.strokes.length ? Pad.thumb(r.strokes, 110) : el("div", { class: "muted", style: "height:110px;display:flex;align-items:center;justify-content:center", text: "(nothing)" }),
        el("div", { text: label(r.target) }),
        el("div", { class: "muted", text: r.won ? "✓ guessed it" : r.said ? "✗ I thought: " + label(r.said) : "✗ no guess" })))),
      el("div", {}, el("button", { type: "button", class: "big-button", onclick: () => setMode("play"), text: "Play again" })));
  }

  // ------------------------------------------------------------ guess
  function guessMode() {
    if (S.model.playable.length < 2) return notEnough();
    prompt("Guess my drawing", "Draw one of the things below. I'll guess as you go.");
    padTools(undoButton(), clearButton());
    const update = () => {
      if (S.mode !== "guess") return;
      const strokes = Pad.drawing();
      const side = $("side");
      if (Pad.points() < 2) {
        side.replaceChildren(el("div", { class: "speech", text: "Go ahead, draw something!" }),
          el("div", {}, el("h3", { text: "Things I know how to guess" }), knownChips()));
        return;
      }
      const { vector, ink } = Doodle.features(strokes);
      const g = Doodle.guess(vector, S.model.examples);
      side.replaceChildren(
        el("div", { class: "speech", text: speak(g.ranked, "I'm pretty sure it's {a}.") }),
        el("div", {}, el("h3", { text: "My top guesses" }), bars(g.ranked.slice(0, 3))),
        el("div", {}, el("h3", { text: "It looks most like these" }), nearThumbs(g.near.slice(0, 5), 56)),
        el("div", {}, el("h3", { text: "What I see" }), el("div", { class: "seen" }, Pad.seen(ink, 84),
          el("p", { class: "small muted", text: "Your drawing as a 24 × 24 grid of numbers, plus which way the lines point. I compare those numbers with every saved drawing." }))));
    };
    S.update = update;
    update();
  }

  // ------------------------------------------------------------ teach
  function teachStore() { return store.get(TEACH_KEY, { cats: {}, who: "" }); }
  function saveTeach(t) { store.set(TEACH_KEY, t); }
  const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  function teachMode() {
    const t = teachStore();
    const all = S.model.categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, isNew: false }));
    for (const [id, c] of Object.entries(t.cats)) if (c.isNew && !all.some((a) => a.id === id)) all.push({ id, name: c.name, emoji: c.emoji || "", isNew: true });
    if (!S.teaching || !all.some((a) => a.id === S.teaching)) S.teaching = all.length ? all[0].id : "";
    const current = () => all.find((a) => a.id === S.teaching);

    const select = el("select", { id: "teach-cat", onchange: (e) => {
      if (e.target.value === "+new") { newBox.hidden = false; $("teach-new").focus(); return; }
      S.teaching = e.target.value; setMode("teach");
    } },
      all.map((a) => el("option", { value: a.id, selected: a.id === S.teaching, text: (a.emoji ? a.emoji + " " : "") + a.name + (a.isNew ? " (new)" : "") })),
      el("option", { value: "+new", text: "+ Something new…" }));
    const newBox = el("div", { class: "teach-pick", hidden: true },
      el("input", { id: "teach-new", placeholder: "Name, like pizza", maxlength: "30", "aria-label": "Name of the new thing" }),
      el("input", { id: "teach-emoji", placeholder: "Emoji (optional)", maxlength: "8", size: "12", "aria-label": "An emoji for it (optional)" }),
      el("button", { type: "button", class: "plain", text: "Add it", onclick: () => {
        const name = $("teach-new").value.trim(), id = slug(name);
        if (!id) return $("teach-new").focus();
        const tt = teachStore();
        const existing = all.find((a) => a.id === id);
        if (!existing) tt.cats[id] = { name: name.toLowerCase(), emoji: $("teach-emoji").value.trim(), isNew: true, lines: [] };
        saveTeach(tt);
        S.teaching = id; setMode("teach");
      } }));

    const c = current();
    if (!c) {
      prompt("Teach", "Pick something to draw.");
      $("side").replaceChildren(el("div", { class: "teach-pick" }, el("label", { for: "teach-cat", text: "What are you drawing?" }), select), newBox);
      newBox.hidden = false;
      Pad.enable(false);
      return;
    }
    prompt(el("span", { text: "Teach: draw " + (c.emoji ? c.emoji + " " : "") + c.name }), "Every drawing you keep becomes an example the computer learns from.");
    const kept = (t.cats[c.id] && t.cats[c.id].lines) || [];
    const playing = S.model.playable.length >= 2;

    const keep = () => {
      if (S.mode !== "teach") return;
      const strokes = Pad.strokes;
      if (strokes.reduce((a, s) => a + s.length, 0) < 2) return;
      let verdict = "";
      if (playing) {
        const g = Doodle.guess(Doodle.features(strokes).vector, S.model.examples).ranked[0];
        verdict = g && g.category === c.id
          ? `Before this one, I'd already have guessed ${label(c.id)}. Nice and clear!`
          : `Before this one, I'd have guessed ${g ? label(g.category) : "nothing"}. That makes it a really useful example: it teaches me something new.`;
      }
      const tt = teachStore();
      tt.cats[c.id] = tt.cats[c.id] || { name: c.name, emoji: c.emoji, isNew: c.isNew, lines: [] };
      tt.cats[c.id].lines.push(Doodle.encode(strokes));
      saveTeach(tt);
      S.lastVerdict = verdict;
      setMode("teach");
    };
    S.keep = keep;

    padTools(undoButton(), clearButton(), el("button", { type: "button", class: "primary", onclick: keep, text: "Keep it" }));
    const removeAt = (i) => { const tt = teachStore(); tt.cats[c.id].lines.splice(i, 1); saveTeach(tt); setMode("teach"); };
    const real = S.model.categories.find((x) => x.id === c.id);
    $("side").replaceChildren(
      el("div", { class: "teach-pick" }, el("label", { for: "teach-cat", text: "What are you drawing?" }), select), newBox,
      S.lastVerdict ? el("div", { class: "speech", text: S.lastVerdict }) : el("p", { class: "muted small",
        text: `Draw it, then click Keep it (or press Enter). Draw it lots of different ways: big, small, simple, detailed.${real ? ` It has ${real.drawings.length} drawings on GitHub so far.` : ""}` }),
      el("div", {}, el("h3", { text: `New drawings, not on GitHub yet (${kept.length})` }),
        kept.length ? el("div", { class: "thumbs" }, kept.map((line, i) => {
          const s = Doodle.decode(line);
          return el("div", { class: "thumb" }, Pad.thumb(Array.isArray(s) ? s : [], 56),
            el("button", { type: "button", class: "x", title: "Remove this drawing", "aria-label": "Remove this drawing", onclick: () => removeAt(i), text: "✕ remove" }));
        })) : el("p", { class: "muted small", text: "None yet." })),
      el("div", {}, el("button", { type: "button", class: "big-button", disabled: !kept.length, onclick: () => copyPanel(c, kept), text: "Copy for GitHub" }),
        el("p", { class: "muted small", text: "Your new drawings stay in this browser until you add them on GitHub. Nobody else can see them yet." })));
    S.lastVerdict = "";
  }

  function copyPanel(c, kept) {
    const t = teachStore();
    const exists = S.live.drawings.some((d) => d.name === c.id + ".txt" && !d.missing);
    const text = exists ? kept.join("\n") + "\n"
      : `# ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}\n${c.emoji ? "emoji: " + c.emoji + "\n" : ""}by: ${t.who || "YOUR NAME"}\n\n${kept.join("\n")}\n`;
    const area = el("textarea", { readonly: true, "aria-label": "The lines to paste into GitHub" });
    area.value = text;
    const copy = el("button", { type: "button", text: "Copy", onclick: async () => {
      area.select();
      try { await navigator.clipboard.writeText(text); copy.textContent = "Copied!"; }
      catch (e) { document.execCommand("copy"); copy.textContent = "Copied!"; }
    } });
    const done = el("button", { type: "button", class: "quiet", text: "They're on GitHub now: clear my list", onclick: () => {
      const tt = teachStore(); delete tt.cats[c.id]; saveTeach(tt); closePanel(); setMode("teach");
    } });
    const steps = exists ? el("ol", {},
      el("li", {}, "On GitHub, open ", el("code", { text: `drawings/${c.id}.txt` }), " and click the pencil (", el("em", { text: "Edit this file" }), ")."),
      el("li", { text: "Scroll to the very end. Click at the end of the last line and press Enter, so you're on a new, empty line." }),
      el("li", { text: "Paste. Then add your name to the by: line near the top, if it isn't there yet." }),
      el("li", {}, el("strong", { text: "Commit changes…" }), " → ", el("strong", { text: "Create a new branch for this commit and start a pull request" }), " → ", el("strong", { text: "Propose changes" }), ", then create the pull request."))
      : el("ol", {},
        el("li", {}, "On GitHub, open the ", el("code", { text: "drawings" }), " folder and click ", el("strong", { text: "Add file" }), " → ", el("strong", { text: "Create new file" }), "."),
        el("li", {}, "Name it ", el("code", { text: `${c.id}.txt` }), " and paste. Put your name after ", el("code", { text: "by:" }), "."),
        el("li", {}, el("strong", { text: "Commit changes…" }), " → ", el("strong", { text: "Create a new branch for this commit and start a pull request" }), " → ", el("strong", { text: "Propose changes" }), ", then create the pull request."),
        el("li", {}, "The game only loads files listed in ", el("code", { text: "drawings/list.txt" }), ", so add one more change to the same pull request: on the pull request, click the branch name under the title, open ", el("code", { text: "drawings/list.txt" }), ", click the pencil, add ", el("code", { text: `${c.id}.txt` }), " on a new line, and choose ", el("strong", { text: "Commit directly to the … branch" }), "."));
    const who = el("input", { value: t.who || "", placeholder: "Your name", "aria-label": "Your name", onchange: (e) => { const tt = teachStore(); tt.who = e.target.value.trim(); saveTeach(tt); copyPanel(c, kept); } });
    openPanel(`Add ${kept.length} drawing${kept.length === 1 ? "" : "s"} of ${c.name} on GitHub`, [
      el("div", { class: "panel-form" },
        exists ? "" : el("p", {}, el("label", { text: "Your name, for the by: line" }), who),
        steps,
        el("label", { text: exists ? "The lines to paste" : `Everything in the new file, drawings/${c.id}.txt` }),
        area,
        el("div", { class: "panel-buttons" }, copy, done),
        el("p", { class: "small muted", text: "Each line is one drawing, written as letters and numbers: every pair of characters is one point. Don't type into the lines, or the drawing breaks." }))]);
  }

  // ------------------------------------------------------------ the drawings
  function gallery() {
    const m = S.model, wide = $("wide");
    const total = m.categories.reduce((a, c) => a + c.drawings.length, 0);
    wide.append(el("div", {},
      el("h2", { text: "Everything the computer knows" }),
      el("p", { text: `${total} drawings in ${m.categories.length} categories. That's all of it: the computer has never seen anything else, so it can only ever guess one of these.` })));
    for (const c of m.categories) {
      const block = el("div", { class: "cat-block" });
      const show = (n) => {
        const ex = m.examples.filter((e) => e.category === c.id);
        const playable = ex.length > 0;
        block.replaceChildren(
          el("div", { class: "cat-head" },
            el("span", { class: "name", text: (c.emoji ? c.emoji + " " : "") + c.name }),
            el("span", { class: "muted", text: `${c.drawings.length} drawings` + (playable ? "" : ` (not in the game until it has ${Doodle.MIN_PLAY})`) }),
            el("code", { class: "muted small", text: c.file })),
          c.by ? el("p", { class: "muted small", style: "margin:0 0 8px", text: "by " + c.by }) : "",
          el("div", { class: "thumbs" }, c.drawings.slice(0, n).map((d) => {
            const example = ex.find((e) => e.line === d.line);
            return el("div", { class: "thumb", title: `${c.file}, line ${d.line}`, role: "button", tabindex: "0",
              onclick: () => closer(d.strokes, `${c.name}: ${c.file}, line ${d.line}`, example) }, Pad.thumb(d.strokes, 56));
          })),
          c.drawings.length > n ? el("button", { type: "button", class: "chip-button", style: "margin-top:8px", onclick: () => show(Infinity), text: `Show all ${c.drawings.length}` }) : "");
      };
      show(24);
      wide.append(block);
    }
  }

  // ------------------------------------------------------------ report card
  function reportCard() {
    const wide = $("wide"), m = S.model;
    if (m.playable.length < 2) {
      wide.replaceChildren(el("p", { text: "The report card needs at least two categories with " + Doodle.MIN_PLAY + " drawings each." }));
      return;
    }
    const most = Math.max(...m.playable.map((c) => c.drawings.length));
    if (!S.cardLimit || S.cardLimit > most) S.cardLimit = most;
    wide.replaceChildren(el("p", { class: "muted", text: "Working it out…" }));
    setTimeout(() => {
      if (S.mode !== "report") return;
      const limit = S.cardLimit >= most ? 0 : S.cardLimit;
      const r = Doodle.report(m, limit);
      const slider = el("input", { type: "range", min: "3", max: String(most), value: String(S.cardLimit), "aria-label": "Drawings per category",
        onchange: (e) => { S.cardLimit = +e.target.value; reportCard(); },
        oninput: (e) => { sliderLabel.textContent = e.target.value; } });
      const sliderLabel = el("strong", { text: String(S.cardLimit) });
      const missesFor = (a, b) => r.misses.filter((x) => (x.example.category === a && x.said === b) || (x.example.category === b && x.said === a)).slice(0, 8);
      wide.replaceChildren(
        el("div", {},
          el("h2", { text: "How good is it?" }),
          el("p", { text: "To find out, the computer tests itself: it hides one drawing, guesses it using all the others, and checks the answer. Then it does the same for every drawing." }),
          el("div", { class: "big-number", text: pct(r.accuracy) }),
          el("p", { class: "muted", text: `right, out of ${r.total} drawings${limit ? ` (using only ${limit} per category)` : ""}.` })),
        el("div", { class: "slider" }, el("span", {}, "Pretend each category only had ", sliderLabel, " drawings:"), slider),
        el("div", {}, el("h3", { text: "Each category" }),
          el("div", { class: "bars" }, m.playable.map((c) => el("div", { class: "bar-row" },
            el("span", { class: "label", text: label(c.id) }),
            el("span", { class: "bar" }, el("i", { style: `width:${Math.round(r.per[c.id].accuracy * 100)}%` })),
            el("span", { class: "num", text: pct(r.per[c.id].accuracy) }))))),
        el("div", {}, el("h3", { text: "What it mixes up most" }),
          r.pairs.length ? r.pairs.slice(0, 3).map((p) => el("div", { style: "margin-bottom:12px" },
            el("p", { style: "margin:0 0 6px", text: `${label(p.a)} and ${label(p.b)}: ${p.times} time${p.times === 1 ? "" : "s"}` }),
            el("div", { class: "thumbs" }, missesFor(p.a, p.b).map((x) => el("div", { class: "thumb bad", role: "button", tabindex: "0", title: `${x.example.file}, line ${x.example.line}`,
              onclick: () => closer(x.example.strokes, `${cat(x.example.category).name}: ${x.example.file}, line ${x.example.line}`, x.example) },
              Pad.thumb(x.example.strokes, 56), el("span", { text: "guessed " + cat(x.said).name })))))) : el("p", { text: "Nothing! Every drawing was guessed right." })),
        el("div", {}, el("h3", { text: "Every guess, in one table" }),
          el("p", { class: "small muted", text: "Each row is what the drawing really was; each column is what the computer guessed. The diagonal is where it got it right." }),
          el("div", { class: "matrix-wrap" }, matrix(r))),
        el("p", { class: "small", text: "This score is about drawings like the ones saved here. Someone who draws differently might fool it much more often. Try it: have someone outside your team play, and compare." }));
    }, 30);
  }

  function matrix(r) {
    const ids = S.model.playable.map((c) => c.id);
    const short = (id) => cat(id).emoji || cat(id).name.slice(0, 4);
    return el("table", { class: "matrix" },
      el("tr", {}, el("th", { class: "row", text: "It was ↓ · guessed →" }), ids.map((id) => el("th", { title: cat(id).name, text: short(id) }))),
      ids.map((a) => {
        const total = r.per[a].total || 1;
        return el("tr", {}, el("th", { class: "row", text: label(a) }), ids.map((b) => {
          const n = r.confusion[a][b], share = n / total;
          const bg = a === b ? `rgba(30,160,80,${0.12 + share * 0.5})` : n ? `rgba(220,60,40,${0.1 + share * 1.2})` : "";
          return el("td", { class: a === b ? "hit" : "", style: bg ? `background:${bg}` : null, text: n || "" });
        }));
      }));
  }

  // ------------------------------------------------------------ draft tester
  function draftNotice() {
    if (!S.draft) { $("notice").hidden = true; return; }
    const what = S.draft.target === "new" ? "a new drawing file" : "your changes to " + S.draft.target;
    const n = $("notice");
    n.className = "draft"; n.hidden = false;
    n.replaceChildren(`Testing a draft of ${what}. Nothing is saved until it's merged on GitHub. `,
      el("button", { type: "button", onclick: () => openDraft(), text: "Edit draft" }),
      el("button", { type: "button", onclick: stopDraft, text: "Stop testing" }));
  }

  function openDraft() {
    const names = S.live.drawings.filter((d) => !d.missing).map((d) => d.name);
    const pick = el("select", { id: "draft-target" },
      el("option", { value: "new", text: "a new drawing file" }),
      names.map((n) => el("option", { value: n, selected: S.draft && S.draft.target === n, text: "my changes to " + n })));
    const area = el("textarea", { id: "draft-text", spellcheck: "false", "aria-label": "Your draft" });
    area.value = S.draft ? S.draft.text : "";
    const draftProblems = S.draft ? S.model.problems.filter((p) => p.file === "drawings/" + (S.draft.target === "new" ? "draft.txt" : S.draft.target)) : [];
    openPanel("Test a draft", [el("div", { class: "panel-form" },
      el("p", { text: "Try out a drawing file before you commit it: paste the whole file here and play with it. Nothing is saved until it's merged on GitHub." }),
      el("label", {}, "This draft is ", pick),
      area,
      el("div", { class: "panel-buttons" },
        el("button", { type: "button", text: "Test it", onclick: () => {
          if (!area.value.trim()) return area.focus();
          S.draft = { target: pick.value, text: area.value };
          session.set(DRAFT_KEY, S.draft);
          closePanel(); rebuild();
          if (draftNow().length) openDraft();
        } }),
        S.draft ? el("button", { type: "button", class: "quiet", text: "Stop testing", onclick: () => { closePanel(); stopDraft(); } }) : ""),
      S.draft ? el("h3", { style: "margin-top:16px", text: draftProblems.length ? "Problems in this draft" : "✓ No problems in this draft" }) : "",
      ...problemCards(draftProblems))]);
  }
  function draftNow() { return S.draft ? S.model.problems.filter((p) => p.file === "drawings/" + (S.draft.target === "new" ? "draft.txt" : S.draft.target)) : []; }
  function stopDraft() { S.draft = null; session.set(DRAFT_KEY, null); rebuild(); }

  // ------------------------------------------------------------ wiring
  function start() {
    for (const b of $("modes").querySelectorAll("button")) b.addEventListener("click", () => setMode(b.dataset.mode));
    $("btn-problems").addEventListener("click", showProblems);
    $("btn-draft").addEventListener("click", openDraft);
    $("panel-close").addEventListener("click", closePanel);
    $("panel").addEventListener("click", (e) => { if (e.target === $("panel")) closePanel(); });
    const live = every(350, () => { if (S.mode === "play") playGuess(); else if (S.mode === "guess" && S.update) S.update(); });
    Pad.on("move", live);
    Pad.on("stroke", () => { if (S.mode === "play") playGuess(); else if (S.mode === "guess" && S.update) S.update(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return closePanel();
      if (!$("panel").hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "z" || e.key === "Z") Pad.undo();
      else if (e.key === "c" || e.key === "C") Pad.clear();
      else if (e.key === "Enter" && S.mode === "teach" && S.keep) S.keep();
    });
    const first = (location.hash || "").replace("#", "");
    if (["play", "guess", "teach", "drawings", "report"].includes(first)) S.mode = first;
    load();
  }

  start();
  return { state: S, game: G, setMode, rebuild };
})();
