// Run with: node test.js
const assert = require("assert");
const { MACHINES, EPS, run, strokes, runNFA, nfaStrokes, toDFA, blend } = require("./dfa.js");

const DFAS = Object.entries(MACHINES).filter(([, m]) => m.kind !== "nfa");
const NFAS = Object.entries(MACHINES).filter(([, m]) => m.kind === "nfa");

// A real DFA: exactly one transition per (state, symbol), to a known state with a colour.
function checkDFA(key, m) {
  assert.ok(m.delta[m.start], `${key}: start state has transitions`);
  for (const a of m.accept) assert.ok(m.delta[a], `${key}: accept state ${a} exists`);
  for (const [state, row] of Object.entries(m.delta)) {
    assert.ok(m.colour[state], `${key}: ${state} has a colour`);
    for (const sym of Object.keys(m.symbols)) {
      const t = row[sym];
      assert.ok(t && t.length === 3, `${key}: ${state} has a move on ${sym}`);
      assert.ok(m.delta[t[0]], `${key}: ${state} -${sym}-> ${t[0]} exists`);
    }
  }
}
for (const [key, m] of DFAS) checkDFA(key, m);

// A well-formed NFA: every symbol maps to a list (maybe empty) of moves to known states; only real symbols or ε.
for (const [key, m] of NFAS) {
  assert.ok(m.delta[m.start], `${key}: start state exists`);
  for (const a of m.accept) assert.ok(m.delta[a], `${key}: accept state ${a} exists`);
  for (const [state, row] of Object.entries(m.delta)) {
    assert.ok(m.colour[state], `${key}: ${state} has a colour`);
    for (const [sym, list] of Object.entries(row)) {
      assert.ok(sym === EPS || sym in m.symbols, `${key}: ${state} uses a known symbol (${sym})`);
      assert.ok(Array.isArray(list), `${key}: ${state} on ${sym} is a list`);
      for (const t of list) assert.ok(t.length === 3 && m.delta[t[0]], `${key}: ${state} -${sym}-> ${t[0]} exists`);
    }
  }
}

const accepts = (key, text) => run(MACHINES[key], text).accepted;

assert.strictEqual(accepts("evenVowels", "hello"), true);       // e, o
assert.strictEqual(accepts("evenVowels", "automaton"), false);  // a, u, o, a, o
assert.strictEqual(accepts("evenVowels", ""), true);
assert.strictEqual(accepts("endsInVowel", "banana"), true);
assert.strictEqual(accepts("endsInVowel", "alex"), false);
assert.strictEqual(accepts("noDoubleConsonant", "banana"), true);
assert.strictEqual(accepts("noDoubleConsonant", "strength"), false);
assert.strictEqual(accepts("multipleOf3", "110"), true);   // 6
assert.strictEqual(accepts("multipleOf3", "111"), false);  // 7
assert.strictEqual(accepts("multipleOf3", "1001"), true);  // 9
assert.strictEqual(accepts("multipleOf3", "12"), false);   // 2 isn't binary: dead state
assert.strictEqual(run(MACHINES.multipleOf3, "12").final, "dead");

// Same string, same painting.
const m = MACHINES.evenVowels;
assert.deepStrictEqual(strokes(m, run(m, "Alex").steps), strokes(m, run(m, "Alex").steps));
// One stroke per character, each in the colour of the state it was read in.
const r = run(m, "hello");
const segs = strokes(m, r.steps);
assert.strictEqual(segs.length, 5);
segs.forEach((g, i) => assert.strictEqual(g.colour, m.colour[r.steps[i].from]));

// ---- NFAs ----

const nfaAccepts = (key, text) => runNFA(MACHINES[key], text).accepted;
assert.strictEqual(nfaAccepts("containsAB", "abracadabra"), true);
assert.strictEqual(nfaAccepts("containsAB", "banana"), false);   // has a's and b's, but never a then b
assert.strictEqual(nfaAccepts("containsAB", ""), false);
assert.strictEqual(nfaAccepts("thirdLastVowel", "piano"), true);   // a
assert.strictEqual(nfaAccepts("thirdLastVowel", "alex"), false);   // l
assert.strictEqual(nfaAccepts("thirdLastVowel", "hello"), false);  // l
assert.strictEqual(nfaAccepts("thirdLastVowel", "pasta"), false);  // s
assert.strictEqual(nfaAccepts("thirdLastVowel", "ab"), false);     // too short
assert.strictEqual(nfaAccepts("aThenB", ""), true);
assert.strictEqual(nfaAccepts("aThenB", "aaabb"), true);
assert.strictEqual(nfaAccepts("aThenB", "aba"), false);
// ε-closure: before reading anything, the ε-move already puts the machine in both states.
assert.deepStrictEqual(runNFA(MACHINES.aThenB, "").start, ["q0", "q1"]);
// When every path dies, the set is empty.
assert.deepStrictEqual(runNFA(MACHINES.aThenB, "ba").final, []);

// Subset construction sizes: the third-last-vowel DFA must remember the last three characters.
const sizes = (key) => [Object.keys(MACHINES[key].delta).length, Object.keys(toDFA(MACHINES[key]).delta).length];
assert.deepStrictEqual(sizes("containsAB"), [3, 4]);
assert.deepStrictEqual(sizes("thirdLastVowel"), [4, 8]);
assert.deepStrictEqual(sizes("aThenB"), [2, 3]);
assert.strictEqual(blend(["#ff0000", "#0000ff"]), "#800080");

// One character that classifies as each symbol, so we can spell every possible symbol string.
function samples(m) {
  const out = {};
  for (const ch of "ab01cde xyz-_.") if (!(m.classify(ch) in out)) out[m.classify(ch)] = ch;
  for (const sym of Object.keys(m.symbols)) assert.ok(sym in out, `found a character for symbol ${sym}`);
  return Object.keys(m.symbols).map((sym) => out[sym]);
}

// The NFA and its DFA agree on every string up to length 6, and the DFA's state is exactly the NFA's set.
for (const [key, nfa] of NFAS) {
  const dfa = toDFA(nfa);
  checkDFA(`${key} as DFA`, dfa);
  const chars = samples(nfa);
  let strings = [""], checked = 0;
  for (let len = 0; len <= 6; len++) {
    for (const s of strings) {
      const a = runNFA(nfa, s), b = run(dfa, s);
      assert.strictEqual(b.accepted, a.accepted, `${key}: NFA and DFA disagree on "${s}"`);
      assert.strictEqual(b.final, "{" + a.final.join(",") + "}", `${key}: DFA state matches NFA set on "${s}"`);
      checked++;
    }
    strings = strings.flatMap((s) => chars.map((c) => s + c));
  }
  assert.strictEqual(checked, (Math.pow(chars.length, 7) - 1) / (chars.length - 1));
}

// Brushes: same string, same painting; the live brushes sit exactly in the NFA's current set of states.
for (const [key, nfa] of NFAS) {
  for (const text of ["", "abracadabra", "automaton", "aab", "Alex"]) {
    const art = nfaStrokes(nfa, text);
    assert.deepStrictEqual(art, nfaStrokes(nfa, text));
    assert.ok(!art.capped);
    const live = [...new Set(art.brushes.map((b) => b.state))].sort();
    assert.deepStrictEqual(live, [...runNFA(nfa, text).final].sort(), `${key}: brushes on "${text}"`);
  }
}
// "ac": on 'a' the brush splits (q0 and q1), on 'c' the q1 brush has no move and dies.
const ac = nfaStrokes(MACHINES.containsAB, "ac");
assert.strictEqual(ac.deaths.length, 1);
assert.strictEqual(ac.deaths[0].state, "q1");
assert.strictEqual(ac.segs.filter((g) => g.step === 1).length, 2);
// ε-moves paint a stroke flagged eps; in aThenB the start brush splits along ε before reading anything.
assert.ok(nfaStrokes(MACHINES.aThenB, "").segs.every((g) => g.eps && g.step === 0));

console.log("all tests passed");
