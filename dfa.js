// The machines and the pure logic: run a string through a DFA or NFA, then turn the run into brush strokes.
// No drawing here, so the same file works in the browser (window.DFA) and in Node (tests).
(function (root) {
  const VOWELS = "aeiouAEIOU";

  // Letters as three symbols, so any name or word can be fed to the letter machines.
  function letterClass(ch) {
    if (VOWELS.includes(ch)) return "V";
    if (/[a-z]/i.test(ch)) return "C";
    return "_";
  }
  const LETTER_SYMBOLS = { V: "vowel", C: "consonant", _: "other" };

  // For machines that care about the actual letters a and b.
  const abClass = (ch) => (ch === "a" || ch === "A" ? "a" : ch === "b" || ch === "B" ? "b" : "x");
  const AB_SYMBOLS = { a: "a", b: "b", x: "anything else" };

  // The empty move: an NFA can follow it without reading a character.
  const EPS = "ε";

  // delta: state -> symbol -> [next state, turn in degrees, step length]
  const MACHINES = {
    evenVowels: {
      name: "Even number of vowels",
      about: "Accepts strings with an even number of vowels. Two states that swap places on every vowel.",
      symbols: LETTER_SYMBOLS,
      classify: letterClass,
      start: "even",
      accept: ["even"],
      colour: { even: "#4f8cff", odd: "#ff8a3d" },
      delta: {
        even: { V: ["odd", 72, 60], C: ["even", -25, 34], _: ["even", 90, 18] },
        odd: { V: ["even", 144, 60], C: ["odd", 35, 40], _: ["odd", -90, 18] },
      },
    },
    endsInVowel: {
      name: "Ends in a vowel",
      about: "Accepts strings whose last letter is a vowel. The machine only remembers what it saw last.",
      symbols: LETTER_SYMBOLS,
      classify: letterClass,
      start: "other",
      accept: ["vowel"],
      colour: { other: "#2dd4bf", vowel: "#f472b6" },
      delta: {
        other: { V: ["vowel", 100, 52], C: ["other", -20, 30], _: ["other", 45, 16] },
        vowel: { V: ["vowel", 160, 44], C: ["other", -110, 56], _: ["other", -45, 16] },
      },
    },
    noDoubleConsonant: {
      name: "No two consonants in a row",
      about: "Rejects any string with two consonants side by side. Once it sees one, it falls into a dead state it can never leave.",
      symbols: LETTER_SYMBOLS,
      classify: letterClass,
      start: "free",
      accept: ["free", "one"],
      colour: { free: "#a3e635", one: "#facc15", stuck: "#6b7280" },
      delta: {
        free: { V: ["free", 50, 40], C: ["one", -70, 46], _: ["free", 120, 16] },
        one: { V: ["free", 130, 50], C: ["stuck", 180, 24], _: ["free", -120, 16] },
        stuck: { V: ["stuck", 9, 7], C: ["stuck", -9, 7], _: ["stuck", 9, 7] },
      },
    },
    multipleOf3: {
      name: "Binary multiple of 3",
      about: "Reads 0s and 1s as a binary number and accepts multiples of 3. Each state is the remainder so far. Any other character sends it to a dead state.",
      symbols: { 0: "0", 1: "1", x: "anything else" },
      classify: (ch) => (ch === "0" || ch === "1" ? ch : "x"),
      start: "r0",
      accept: ["r0"],
      colour: { r0: "#34d399", r1: "#a78bfa", r2: "#fb7185", dead: "#6b7280" },
      delta: {
        r0: { 0: ["r0", 30, 30], 1: ["r1", 90, 50], x: ["dead", 180, 20] },
        r1: { 0: ["r2", -60, 50], 1: ["r0", 120, 40], x: ["dead", 180, 20] },
        r2: { 0: ["r1", 75, 45], 1: ["r2", -30, 35], x: ["dead", 180, 20] },
        dead: { 0: ["dead", 9, 7], 1: ["dead", -9, 7], x: ["dead", 9, 7] },
      },
    },

    // NFAs: delta maps state -> symbol -> a LIST of [next state, turn, length]. Several moves mean "any of these";
    // an empty (or missing) list means this path has nowhere to go and dies. The symbol EPS ("ε") holds moves the
    // machine can take without reading a character.
    containsAB: {
      kind: "nfa",
      name: "Contains 'ab' somewhere",
      about: "Waits in q0. On every 'a' it also guesses \"this a starts the ab\" and sends a copy to q1. If a 'b' follows, the guess was right and that copy settles in q2 for good; otherwise the copy dies.",
      symbols: AB_SYMBOLS,
      classify: abClass,
      start: "q0",
      accept: ["q2"],
      colour: { q0: "#60a5fa", q1: "#fbbf24", q2: "#f472b6" },
      delta: {
        q0: { a: [["q0", 25, 30], ["q1", 95, 50]], b: [["q0", -30, 30]], x: [["q0", 15, 18]] },
        q1: { a: [], b: [["q2", 120, 56]], x: [] },
        q2: { a: [["q2", 40, 30]], b: [["q2", -50, 34]], x: [["q2", 20, 16]] },
      },
    },
    thirdLastVowel: {
      kind: "nfa",
      name: "Third-last character is a vowel",
      about: "On every vowel, q0 guesses \"this is third from the end\" and sends a copy that counts down q1 → q2 → q3. Only a copy that lands in q3 exactly as the string ends accepts. The NFA needs 4 states; a DFA has to remember the last three characters, so it needs 8.",
      symbols: LETTER_SYMBOLS,
      classify: letterClass,
      start: "q0",
      accept: ["q3"],
      colour: { q0: "#38bdf8", q1: "#a78bfa", q2: "#fb7185", q3: "#facc15" },
      delta: {
        q0: { V: [["q0", 20, 28], ["q1", 75, 46]], C: [["q0", -25, 30]], _: [["q0", 60, 14]] },
        q1: { V: [["q2", 60, 40]], C: [["q2", -60, 40]], _: [["q2", 30, 20]] },
        q2: { V: [["q3", 50, 36]], C: [["q3", -50, 36]], _: [["q3", 25, 18]] },
        q3: { V: [], C: [], _: [] },
      },
    },
    aThenB: {
      kind: "nfa",
      name: "Some a's, then some b's (uses ε)",
      about: "q0 reads a's, q1 reads b's, and an ε-move lets the machine slip from q0 to q1 without reading anything. So the copy in q0 always has a twin in q1, ready for the b's.",
      symbols: AB_SYMBOLS,
      classify: abClass,
      start: "q0",
      accept: ["q1"],
      colour: { q0: "#34d399", q1: "#c084fc" },
      delta: {
        q0: { a: [["q0", 30, 36]], b: [], x: [], [EPS]: [["q1", 150, 22]] },
        q1: { a: [], b: [["q1", -40, 36]], x: [] },
      },
    },
  };

  // One step per character: which symbol it was read as, and the transition taken.
  function run(machine, text) {
    let state = machine.start;
    const steps = [];
    for (const ch of text) {
      const sym = machine.classify(ch);
      const [to, turn, len] = machine.delta[state][sym];
      steps.push({ ch, sym, from: state, to, turn, len });
      state = to;
    }
    return { steps, final: state, accepted: machine.accept.includes(state) };
  }

  // Turtle graphics: start at (0, 0) facing up. Each step turns, then moves, painting in the colour of the
  // state the machine was in when it read that character.
  function strokes(machine, steps) {
    let x = 0, y = 0, angle = -90;
    return steps.map((s, i) => {
      angle += s.turn;
      const nx = x + s.len * Math.cos((angle * Math.PI) / 180);
      const ny = y + s.len * Math.sin((angle * Math.PI) / 180);
      const seg = { x1: x, y1: y, x2: nx, y2: ny, state: s.from, colour: machine.colour[s.from], step: i + 1 };
      x = nx;
      y = ny;
      return seg;
    });
  }

  // ---- NFAs ----

  // States in declaration order, so a set always lists its members the same way: {q0,q2}, never {q2,q0}.
  const statesOf = (m) => Object.keys(m.delta);
  const moves = (m, state, sym) => (m.delta[state] && m.delta[state][sym]) || [];

  // Epsilon closure: the given states plus everything reachable from them by ε-moves alone.
  function closure(m, states) {
    const seen = new Set(states);
    const stack = [...seen];
    while (stack.length) {
      for (const [to] of moves(m, stack.pop(), EPS)) {
        if (!seen.has(to)) { seen.add(to); stack.push(to); }
      }
    }
    return statesOf(m).filter((q) => seen.has(q));
  }

  // Run an NFA by tracking the SET of states it could be in. Each character: follow every move from every state
  // in the set, then take the ε-closure. Accept if any state in the final set is accepting.
  function runNFA(machine, text) {
    const start = closure(machine, [machine.start]);
    let current = start;
    const steps = [];
    for (const ch of text) {
      const sym = machine.classify(ch);
      const to = closure(machine, current.flatMap((q) => moves(machine, q, sym).map(([next]) => next)));
      steps.push({ ch, sym, from: current, to });
      current = to;
    }
    return { start, steps, final: current, accepted: current.some((q) => machine.accept.includes(q)) };
  }

  // Painting an NFA: one brush per path. A brush with several moves splits into several brushes from the same
  // point; a brush with no move dies (listed in `deaths`, drawn as a fading dot). An ε-move paints a stroke too
  // (flagged `eps`), and the brush that took it leaves its twin behind, since the NFA may be in either state.
  // Paths can multiply fast, so at most MAX_BRUSHES stay alive; any extra are dropped and `capped` is set.
  const MAX_BRUSHES = 150;
  function nfaStrokes(machine, text) {
    const segs = [], deaths = [];
    let capped = false;

    const move = (b, [to, turn, len], step, eps) => {
      const angle = b.angle + turn;
      const x = b.x + len * Math.cos((angle * Math.PI) / 180);
      const y = b.y + len * Math.sin((angle * Math.PI) / 180);
      segs.push({ x1: b.x, y1: b.y, x2: x, y2: y, state: b.state, colour: machine.colour[b.state], step, eps });
      return { x, y, angle, state: to };
    };
    // Follow ε-moves from each brush. `visited` keeps an ε-cycle from splitting forever.
    const expand = (brushes, step) => {
      const out = [];
      for (const b of brushes) {
        const visited = new Set([b.state]);
        const queue = [b];
        while (queue.length) {
          const c = queue.shift();
          out.push(c);
          for (const t of moves(machine, c.state, EPS)) {
            if (!visited.has(t[0])) { visited.add(t[0]); queue.push(move(c, t, step, true)); }
          }
        }
      }
      if (out.length > MAX_BRUSHES) { capped = true; out.length = MAX_BRUSHES; }
      return out;
    };

    let brushes = expand([{ x: 0, y: 0, angle: -90, state: machine.start }], 0);
    let step = 0;
    for (const ch of text) {
      step++;
      const sym = machine.classify(ch);
      const next = [];
      for (const b of brushes) {
        const ms = moves(machine, b.state, sym);
        if (!ms.length) deaths.push({ x: b.x, y: b.y, state: b.state, colour: machine.colour[b.state], step });
        for (const t of ms) next.push(move(b, t, step, false));
      }
      brushes = expand(next, step);
    }
    return { segs, deaths, brushes, capped };
  }

  // Average the members' colours, so {q0,q2} looks like a mix of q0 and q2. The empty set is the grey dead state.
  function blend(colours) {
    if (!colours.length) return "#6b7280";
    const rgb = [1, 3, 5].map((i) => colours.reduce((sum, c) => sum + parseInt(c.slice(i, i + 2), 16), 0) / colours.length);
    return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  }

  // Subset construction: each DFA state is a set of NFA states, named like "{q0,q2}". Start from the ε-closure of
  // the NFA's start; for each set and symbol, the next set is the ε-closure of everywhere its members can move.
  // Only sets that can actually be reached get built. A set accepts if it contains an accepting NFA state.
  // Each DFA stroke averages the turns and lengths of the NFA moves it stands for.
  function toDFA(nfa) {
    const name = (set) => "{" + set.join(",") + "}";
    const mean = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    const start = closure(nfa, [nfa.start]);
    const members = { [name(start)]: start };
    const delta = {}, colour = {}, accept = [];
    const queue = [start];
    while (queue.length) {
      const set = queue.shift(), key = name(set);
      colour[key] = blend(set.map((q) => nfa.colour[q]));
      if (set.some((q) => nfa.accept.includes(q))) accept.push(key);
      delta[key] = {};
      Object.keys(nfa.symbols).forEach((sym, i) => {
        const taken = set.flatMap((q) => moves(nfa, q, sym));
        const next = closure(nfa, taken.map(([to]) => to));
        const nextKey = name(next);
        if (!members[nextKey]) { members[nextKey] = next; queue.push(next); }
        delta[key][sym] = taken.length
          ? [nextKey, mean(taken.map((t) => t[1])), mean(taken.map((t) => t[2]))]
          : [nextKey, i % 2 ? -9 : 9, 7];  // no moves at all: the dead state {} just wiggles
      });
    }
    return {
      kind: "dfa",
      name: `${nfa.name} (as a DFA)`,
      about: "Built from the NFA by subset construction. Each state is the set of NFA states the NFA could be in at that point, coloured as a blend of its members. A set accepts if it contains an accepting NFA state" +
        (members["{}"] ? "; {} means every path has died." : "."),
      symbols: nfa.symbols,
      classify: nfa.classify,
      start: name(start),
      accept,
      colour,
      delta,
      members,
    };
  }

  const api = { MACHINES, EPS, run, strokes, letterClass, closure, runNFA, nfaStrokes, toDFA, blend, MAX_BRUSHES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DFA = api;
})(this);
