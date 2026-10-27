# DFA Drawing

Automaton art: a deterministic finite automaton reads a string one character at a time, and every transition
paints a brush stroke in the colour of the state it was in. Accepted strings get a gold frame and a bloom;
rejected ones fade behind a dashed frame. Because a DFA always has exactly one next move, the same string
always draws the same painting.

## Run it

Open `index.html` in a browser. No build step, no dependencies.

- **Text:** the input string. Letter machines read it as vowels, consonants and other characters.
- **Machine:** one of the built-in DFAs (even number of vowels, ends in a vowel, no two consonants in a row,
  binary multiple of 3) or NFAs (contains "ab", third-last character is a vowel, some a's then some b's).
- **Convert to DFA** (NFAs only): runs the subset construction and repaints with the resulting DFA. Its states
  are sets of NFA states such as `{q0,q2}`, coloured as a blend of their members. The panel shows how many states
  the NFA and the DFA have (third-last vowel: 4 vs 8).
- **Symmetry:** repeats the painting around the centre, kaleidoscope style. It doesn't change the run.
- The panel shows the verdict, the run as a chain of states, and the transition table.

## How it works

- `dfa.js` holds the machines and the pure logic. Each transition is `[next state, turn in degrees, length]`.
  `run()` walks the string through the DFA; `strokes()` turns the run into line segments with turtle graphics
  (start at the centre facing up; each step turns, then moves).
- NFAs (`kind: "nfa"`) map each state and symbol to a *list* of moves, which may be empty, plus optional
  ε-moves under the symbol `"ε"`. `runNFA()` keeps the set of states the machine could be in (with the
  ε-closure) and accepts if any of them is accepting. `nfaStrokes()` paints one brush per path: a brush splits
  when there are several moves, dies with a fading dot when there are none, and draws ε-moves as dashed strokes.
  At most 150 brushes stay alive at once. `toDFA()` is the subset construction.
- `index.html` draws those segments on a canvas and animates them.

## Tests

```
node test.js
```

Checks that every DFA is complete and every NFA well-formed, that known strings are accepted or rejected, and
that the same string always produces the same strokes. For each NFA, its converted DFA must agree with it on
every string up to length 6, and the live NFA brushes must sit exactly in the NFA's current set of states.

## Next

1. A DFA editor: add states, pick colours, set each arrow's turn and length.
2. Gallery: save string + machine + painting to compare.
