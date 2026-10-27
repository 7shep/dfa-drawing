// The machines and the pure logic: run a string through a DFA, then turn the run into brush strokes.
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
    return steps.map((s) => {
      angle += s.turn;
      const nx = x + s.len * Math.cos((angle * Math.PI) / 180);
      const ny = y + s.len * Math.sin((angle * Math.PI) / 180);
      const seg = { x1: x, y1: y, x2: nx, y2: ny, state: s.from, colour: machine.colour[s.from] };
      x = nx;
      y = ny;
      return seg;
    });
  }

  const api = { MACHINES, run, strokes, letterClass };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DFA = api;
})(this);
