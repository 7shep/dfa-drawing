# DFA Drawing

Automaton art: a deterministic finite automaton reads a string one character at a time, and every transition
paints a brush stroke in the colour of the state it was in. Accepted strings get a gold frame and a bloom;
rejected ones fade behind a dashed frame. Because a DFA always has exactly one next move, the same string
always draws the same painting.

## Run it

Open `index.html` in a browser. No build step, no dependencies.

- **Text:** the input string. Letter machines read it as vowels, consonants and other characters.
- **Machine:** one of the built-in DFAs (even number of vowels, ends in a vowel, no two consonants in a row,
  binary multiple of 3).
- **Symmetry:** repeats the painting around the centre, kaleidoscope style. It doesn't change the run.
- The panel shows the verdict, the run as a chain of states, and the transition table.

## How it works

- `dfa.js` holds the machines and the pure logic. Each transition is `[next state, turn in degrees, length]`.
  `run()` walks the string through the DFA; `strokes()` turns the run into line segments with turtle graphics
  (start at the centre facing up; each step turns, then moves).
- `index.html` draws those segments on a canvas and animates them.

## Tests

```
node test.js
```

Checks that every machine is a complete DFA, that known strings are accepted or rejected, and that the same
string always produces the same strokes.

## Next

1. A DFA editor: add states, pick colours, set each arrow's turn and length.
2. NFA mode: keep a set of current states and paint one brush per state.
3. Gallery: save string + machine + painting to compare.
