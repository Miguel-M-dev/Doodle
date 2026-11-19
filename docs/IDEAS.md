# Going further (optional)

Everything here is **optional**. The assignment can be completed in full
without anything on this page, and without using AI at all.

These ideas are for teams that have finished their challenges and want more.
Some need nothing new. Others need changes to the engine, which is where an
AI assistant can help, as long as **you stay in charge of checking its work**.

---

## No new skills needed

- **A tricky pair on purpose.** Add two things that look alike (a cat and a
  dog, a cup and a bucket). How many examples does it take before the
  computer can tell them apart?
- **A drawing party.** Get 10 people who aren't on your team to draw 3
  examples each. Does the report card go up? Does the stranger test?
- **Hard mode.** Set `seconds: 8` in `game.txt`. Is it still fair?
- **One artist.** Make a copy of one thing where only one person drew every
  example, and compare it with a thing drawn by everyone. Which one does a
  stranger do better on?

---

## With an AI assistant

### Rules for working with AI on code

1. **Work on a branch, through a pull request.** Never commit AI changes
   straight to `main`.
2. **The Doodle check must pass.** If your feature changes how the drawing
   files are written, the check (`engine/doodle.js`) has to learn the new
   format too, or every pull request will turn red.
3. **A teammate who didn't build it tests it** on the live site before
   approving. They follow the "Check it" list below.
4. **Say what the AI got wrong.** In the pull request, write one thing the AI
   got wrong the first time and how you caught it. (It will get something
   wrong.)
5. **Be ready to explain** what the change does, in your own words.

### Ideas

**"I don't know"** · easier
When none of the closest drawings are very alike, say "I have no idea!"
instead of guessing. Check it: a random scribble gets "I have no idea", and a
good fish still gets "fish".

**Sound effects** · easier
A sound when it guesses right, a different one when time runs out. Check it:
sounds play in the game, there's a way to mute them, and nothing plays in
Teach mode.

**Show the votes** · medium
On *Guess my drawing*, show all 7 voters with lines connecting them to the
thing they voted for. Check it: the number of voters for each thing matches
the bars.

**Two-player mode** · medium
Players take turns; one draws, the other watches the computer guess, and the
faster guess wins a point. Check it: scores add up over a full game, and
switching players clears the pad.

**Draw with your body** · harder
Use the webcam to track a colored object (like a marker cap) and draw with
it in the air. Check it: it works in good light, there's a clear way to turn
the camera off, and the camera never turns on until someone clicks a button.

**A smarter guesser** · harder
Ask an AI assistant to explain other ways to compare drawings, and try one
(more grid cells, stroke order, a different number of voters than 7). Check it:
the report card score on the *same* drawings goes up, and you can explain why.
