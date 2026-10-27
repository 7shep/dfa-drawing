// Run with: node test.js
const assert = require("assert");
const { MACHINES, run, strokes } = require("./dfa.js");

// Every machine is a real DFA: exactly one transition per (state, symbol), to a known state with a colour.
for (const [key, m] of Object.entries(MACHINES)) {
  assert.ok(m.delta[m.start], `${key}: start state has transitions`);
  for (const a of m.accept) assert.ok(m.delta[a], `${key}: accept state ${a} exists`);
  for (const [state, row] of Object.entries(m.delta)) {
    assert.ok(m.colour[state], `${key}: ${state} has a colour`);
    for (const sym of Object.keys(m.symbols)) {
      const t = row[sym];
      assert.ok(t, `${key}: ${state} has a move on ${sym}`);
      assert.ok(m.delta[t[0]], `${key}: ${state} -${sym}-> ${t[0]} exists`);
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

console.log("all tests passed");
