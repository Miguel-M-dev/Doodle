# Challenges

Your team's goal: by **Tuesday, December 1**, a drawing game about things
*your team* chose, live on the web, that guesses well enough to fool a
friend into thinking it's smart. You'll also know exactly when and why it
isn't. These challenges are ideas for getting there.

---

## Day 1: first steps

Everyone:

1. Play the [sample game](https://emenriquez.github.io/cs1101-doodles/) for
   five minutes. Try **Guess my drawing**: can you draw a fish it doesn't
   recognize? Open the **Report card**: what does it mix up?
2. Set up your team's copy (README section 1).
3. Get **one small pull request** merged: **Teach** → draw 5 examples of one
   of the things → **Copy for GitHub** → paste them at the end of its file and
   add your name to its `by:` line. A teammate approves it.

As a team, open an issue called **Project plan** (**Issues** → **New issue**
→ **Blank issue**) that answers:

- What will your game be about? Pick a theme and 5 to 8 things to draw: things
  in a kitchen, animals, video-game items, sports, things on campus, emoji...
  Things that look different from each other are easier to tell apart.
- Who owns which things?
- What will you show on December 1?

---

## Make it yours

**Pick at least 3** (teams of 4: at least 4). The first one is where almost
everyone starts.

### 1. Your own game *(team)*

Replace the sample with your theme: your own things to draw, your own title,
your own names in `game.txt`. Delete the sample files you don't use (and their
lines in `drawings/list.txt`).

**Done when:** the game has at least **5 things of your own**, each with at
least **20 drawings** drawn by at least 2 different people, no sample things
are left, and the problems button says ✓ No problems. Screenshot your report
card.

### 2. The stranger test *(one person leads)*

The report card tests the computer on drawings like the ones it learned from.
Real users are different. Find someone outside your team, have them play 3
games, and count how many drawings the computer guessed.

**Done when:** you've posted an issue called **Stranger test** with their
score, your report card score, and two or three sentences on why they're
different. (Hint: who drew the examples? Who didn't?)

### 3. Fix the mix-up *(one or two people)*

Open the **Report card** and find the two things it mixes up most. Click the
mixed-up drawings to see why. Then fix it: more examples, more different
examples, deleting bad ones, or even changing which things are in the game.

**Done when:** that pair's "mixed up" number has gone down. Put a before and
after screenshot in your pull request, and say what you changed and why you
think it worked.

### 4. How much data is enough? *(one person)*

Use the slider on the **Report card**: "Pretend each category only had…".
Write down the score at 3, 5, 10, 15, 20, and as many as you have.

**Done when:** your Project plan issue has a comment with your numbers (a
table or a hand-drawn graph is great) and an answer: did each extra drawing
help as much as the one before? When would you stop?

### 5. Fool it *(anyone)*

Draw three things that the computer gets confidently wrong. Use **Guess my
drawing** and look at "It looks most like these" and "What I see" to work out
why.

**Done when:** an issue called **Fooled it** has a screenshot of each one and
one sentence each explaining what fooled it. Bonus: teach it so the same
trick doesn't work any more.

### 6. Bad data *(one person, with a reviewer)*

On purpose, open a pull request that adds 5 drawings to the **wrong** file
(draw a few houses into the fish file). Look at what the check's report card
says. Your reviewer finds them and requests changes. Then fix it.

**Done when:** the pull request shows "changes requested", then the fix, then
an approval, and its description says what the bad drawings did to the
report card.

### 7. Game polish *(one person)*

Make it feel like your game: title, theme, seconds per round, number of
rounds, emoji for every thing. Make it hard but fair: a friend should win
about half the time.

**Done when:** `game.txt` is all yours, and a friend outside your team has
played it and called it fair (or you changed it until they did).

### 8. Your own idea

Something else your team wants to try? Write it in your Project plan issue
with a "done when" line, and check it with your instructor. docs/IDEAS.md has
bigger ideas, some of them made with an AI assistant.

---

## Before December 1: show and tell

You'll have about two minutes. No slides needed. Have this ready:

- [ ] Your live link is open, and the problems button says **✓ No problems**.
- [ ] Someone ready to play a round live (practice it once!).
- [ ] Your **Report card**: the score, and what it mixes up most.
- [ ] Each person can point to one thing they made.
- [ ] One surprise: something that fooled it, or something it got right that
      you didn't expect.
