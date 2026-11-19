# How it works

You don't need any of this to finish the project. It's here for when you
wonder what's going on inside.

## The big idea: learning from examples

There are two ways to get a computer to recognize a fish.

1. **Write rules.** "A fish is an oval with a triangle on one end." That breaks
   the moment someone draws a fish facing the other way, or with fins, or as a
   stick figure.
2. **Show it examples.** Give it a pile of fish drawings and a pile of house
   drawings, and let it compare. That's **machine learning**, and it's what
   this project does. Your team never writes a rule. Everything the computer
   knows is in the `drawings` folder.

## Step 1: a drawing becomes numbers

The computer can't look at a picture. When you draw, the page records your
pen as a list of points: (x, y), (x, y), and so on, one list per stroke. Then:

1. **Size and position stop mattering.** The drawing is shrunk or stretched to
   fit a square, and moved to the middle. A tiny fish in the corner and a big
   fish in the middle end up the same.
2. **Where's the ink?** The square is split into a 24 × 24 grid, and every
   cell gets a number for how much ink is in it. That's 576 numbers. (The
   **What I see** picture on the *Guess my drawing* page is exactly this.)
3. **Which way do the lines go?** The square is also split into a 6 × 6 grid,
   and for each part it adds up how much of the line goes across, up and down,
   and along each diagonal. That's 144 more numbers. They help it tell a
   star (lots of diagonals) from a house (lots of straight up and across).

So every drawing becomes a list of 720 numbers. Two drawings that look alike
have lists that are alike. The page measures *how* alike with one number
from 0% (nothing in common) to 100% (identical). That's the "% alike" you
see under the example drawings.

## Step 2: the closest examples vote

To guess your drawing, the computer compares it with **every** saved drawing
and finds the **7 most alike**. Each one votes for its own thing, and the
more alike it is, the bigger its vote. Most votes wins. If 5 of the 7
closest drawings are fish, it guesses fish.

This method is called **k-nearest neighbors** ("k" is the 7). There's no
training step: adding a drawing to a file is the whole of "learning". It's one
of the simplest kinds of machine learning, and it's easy to see why it made
every guess: **It looks most like these** shows you the voters.

Google's real Quick, Draw! game uses a **neural network** trained on millions
of drawings. It's much better at messy drawings, but much harder to
explain. Both share one big idea: they only know what their examples taught
them.

## Step 3: how good is it? The report card

You can't test a computer on drawings it learned from: it would just find the
exact same drawing and get it right every time. That's like studying for a
test with the answer key.

So the report card plays fair: it **hides one drawing**, guesses it using all
the others, checks the answer, and puts it back. Then it does that for every
single drawing. The percentage it gets right is the score. (Machine-learning
people call this *leave-one-out testing*.) The Doodle check on every pull
request works out the same score, so you can see whether a change made the
game better or worse.

The table at the bottom is a **confusion matrix**: each row is what a
drawing really was, and each column is what the computer guessed. Numbers off
the diagonal are mistakes, and they show you which things it mixes up.

## Where it goes wrong (and why that matters)

- **It only knows what it was shown.** Draw a guitar and it will still pick
  one of its things, because it doesn't know "none of the above".
- **Bad data teaches bad lessons.** A house drawing saved in the fish file
  makes it a little more likely to call houses fish.
- **Who drew the examples matters.** If everyone on your team draws cats the
  same way, it learns *your* way of drawing cats. Someone who draws cats
  differently gets worse results. That's **bias**, and it's a real problem in
  real AI: face recognition that works worse on people who weren't in the
  examples, voice assistants that understand some accents better than others.
  The fix is the same here as there: examples from lots of different people,
  and testing on people who weren't in the examples (the stranger test!).
- **More data helps, but less and less.** The report card's slider shows it:
  going from 5 to 10 examples helps a lot; going from 50 to 60 barely helps.

## Where the drawings are kept

Each drawing is stored as one line of text. Every point is two characters
(one for across, one for down, each from 64 possible values), and a space
starts a new stroke. So `ALAJGD` is three points: (0, 11), (0, 9), (6, 3).
It looks like gibberish, but it's just numbers written compactly, which is
what every file on a computer is underneath.

## The files in `engine/`

| File | What it does |
| --- | --- |
| `doodle.js` | reads the files, turns drawings into numbers, guesses, works out the report card, and finds mistakes |
| `pad.js` | the drawing pad, and the little pictures of drawings |
| `app.js` | the page: the game, Teach, the gallery, the report card, Test a draft |
| `check-cli.js` | the Doodle check that GitHub runs on every pull request |
| `style.css` | the colors and layout, including the four themes |
