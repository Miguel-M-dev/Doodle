# Doodles

A drawing game where the computer guesses what you drew, and your team
teaches it. You draw a fish, and before you've finished, it says "Oh, I know!
It's a fish!" It isn't magic: it learned from example drawings, and every one
of those examples is a line in a text file your team controls. Pick what it
should know, draw the examples, test how good it is, and find out what fools it.

That's **machine learning**: instead of writing rules, you give the computer
examples and let it work out the pattern. The same idea (with a lot more
examples) is behind face unlock, spam filters and voice assistants.
**No programming needed.**

**See it working first:** [play the sample game](https://emenriquez.github.io/cs1101-doodles/).
It knows 10 things, from 600 drawings by people all over the world. Try
**Guess my drawing**, then open the **Report card**.

> **Start here.** Read this page top to bottom once. It takes five minutes.

---

## 1. Set up your team's copy (Day 1)

### One person: the owner

Pick one teammate to own the repository. Everyone else will work in it too.

1. Near the top of this page, click **Use this template** → **Create a new repository**.
2. Name it `doodles`, set it to **Public**, and click **Create repository**.
3. **Turn on the live link.** In the new repository: **Settings** → **Pages** →
   under **Branch** choose `main` and `/ (root)` → **Save**. About a minute
   later, the game is live at `https://OWNER-USERNAME.github.io/doodles/`.
4. **Invite your teammates.** **Settings** → **Collaborators** →
   **Add people** → type a teammate's GitHub username → **Add**. Repeat for
   each teammate. (GitHub may ask for your password first.)

### Everyone else

1. Open `https://github.com/OWNER-USERNAME/doodles/invitations` (use the
   owner's username) and click **Accept invitation**. The same invitation is
   also in your email.
2. Bookmark the team's repository and the live link.

---

## 2. Ways to split the work

| File | What's in it | Who |
| --- | --- | --- |
| `game.txt` | the title, your names, the theme, seconds per round, rounds per game | the owner |
| `drawings/list.txt` | which drawing files are in the game | anyone who adds a new thing to draw |
| `drawings/fish.txt`, `drawings/house.txt`, ... | **one file per thing**: every example drawing of it, one per line | whoever owns that thing |

**Each person owns some of the drawing files.** Because nobody edits anyone
else's file, those changes never collide. `list.txt` is shared, so that's where
your team will eventually see a **conflict** (section 6 shows how to fix one).
That's normal: real teams deal with it every day.

These are suggestions, not rules. Pick what fits your team:

- **Two people:** split your things in half. Each person owns theirs and gets
  other people to draw them too (the more different people draw, the better
  the computer gets).
- **Three people:** add a **tester** who runs the report card, finds what the
  computer mixes up, and runs the stranger test (see CHALLENGES.md). The
  tester also owns a couple of things.
- **Four people:** split the things four ways, or have one person be the
  **game designer** (game.txt, the theme, the title, which things are in the
  game) as well as owning a few things.

**Your first change (everyone):** go to the live link, open **Teach**, pick
one of the things, and draw 5 new examples. Click **Copy for GitHub** and
follow the steps it shows: paste them at the end of that drawing file, put
your name on its `by:` line, and get it merged with a pull request (next
section).

---

## 3. How to change things: a pull request

On a team, nobody changes `main` directly. `main` is what the live link
shows, so it's the version everyone shares. Instead you **propose** a change,
a teammate **reviews** it, and then it's **merged** into `main`. That's a
**pull request**, and almost every software team in the world works this way.

### Making a pull request

1. Open the file (for example `drawings/fish.txt`) and click the **pencil**
   icon (*Edit this file*).
2. Make your change. For new drawings: scroll to the very end, start a new
   line, and paste what **Copy for GitHub** gave you.
3. Click **Commit changes...**. Write a message that says what you changed,
   like `Add 10 fish drawings`.
4. Choose **Create a new branch for this commit and start a pull request**,
   then click **Propose changes**.
5. On the next page, fill in the description and click **Create pull request**.
6. Wait about 30 seconds for the **Doodle check** at the bottom of the page.
   - ✓ green: no mistakes. Click **Details** to see the report card: how
     often the computer guesses right with your change. Ask a teammate to review.
   - ✗ red: click **Details** to see what to fix. To fix it, go to the
     **Files changed** tab, click the **⋯** menu on your file → **Edit file**,
     and commit again. Your fix goes into the same pull request.

### Reviewing a teammate's pull request

You can't read a drawing written as letters and numbers, so look at the
drawings themselves:

1. Open the **Pull requests** tab and click their pull request.
2. On **Files changed**, click the **⋯** menu on the drawing file → **View
   file**, then the **Copy raw file** button.
3. Open the live link → **Test a draft** → choose *my changes to fish.txt*
   (whichever file it is) → paste → **Test it**. Then open **The drawings**.
4. **Look at every new drawing.** Is each one really a fish? A wrong drawing
   in the fish file teaches the computer the wrong thing. That's called
   **bad data**, and it's one of the biggest problems in real machine learning.
5. Compare the report card number in the check's **Details** with the one on
   `main`. Did it go up or down?
6. Click **Review changes** (or **Submit review**). Choose **Approve** if it's
   ready, or **Request changes** with a comment that says exactly which
   drawing is wrong and why.
7. Once it's approved, open the **Conversation** tab and click
   **Merge pull request** → **Confirm merge**. The live link updates about a
   minute later.

Don't merge your own pull request until a teammate has approved it.

### Adding a brand-new thing to draw

1. On the live site: **Teach** → **+ Something new…** → type its name (and
   an emoji if you like) → **Add it**. Draw at least 5 examples (15 or more is
   much better), then **Copy for GitHub**.
2. In GitHub, open the `drawings` folder → **Add file** → **Create new file**.
   Name it what the Teach page says (like `pizza.txt`), paste, and make a pull
   request as usual.
3. The game only loads files listed in `drawings/list.txt`. In the same pull
   request, click the branch name under the pull request's title, open
   `drawings/list.txt`, click the pencil, add `pizza.txt` on a new line, and
   choose **Commit directly to the …** branch. (Forgot? The check gives you
   a yellow heads-up that says exactly which line to add.)

---

## 4. The files: a cheat sheet

`game.txt`:

```text
title: Doodle Guesser      the name at the top of the page
by: Sam, Ana and Lee       your team
theme: paper               paper, chalk, neon or sunny
seconds: 20                how long you get to draw each round
rounds: 6                  how many rounds in one game
```

A drawing file, like `drawings/fish.txt`:

```text
# Fish                     the name the game uses
emoji: 🐟                  optional: shown next to the name
by: Sam, Ana               who drew them

ALAJGDKBQAWAYBmN7k9X9J_A7E4KtWidVjKiGgBVBN
oMfKVILJGMBVAdAlDuF0H2L6T-d_l_p8s4wt0z SZRbRZPbRbTd
```

- **Every line of letters and numbers is one drawing.** Each pair of
  characters is one point, and a space starts a new pen stroke. You never
  type these yourself: the **Teach** page makes them.
- **To remove a drawing**, delete its whole line. (Find it first: on **The
  drawings** page, point at a drawing to see its file and line number.)
- A thing needs **at least 5 drawings** to be in the game, and **15 or more**
  to be guessed well.
- `drawings/list.txt` has one file name per line. Notes go inside
  `<!--` and `-->` in any file.

---

## 5. Tools on the live site

| Tab or button | Does |
| --- | --- |
| **Play** | the game: draw what it asks, and it guesses while you draw |
| **Guess my drawing** | draw anything; see its top guesses, the saved drawings yours looks most like, and what the computer "sees" |
| **Teach** | draw new examples, then **Copy for GitHub** to add them |
| **The drawings** | every example the computer has, grouped by thing. Click one for a closer look |
| **Report card** | how often it guesses right, what it mixes up, and a slider to see what happens with fewer drawings |
| **Test a draft** | paste a drawing file you're still working on and try it, without committing anything |
| **✓ No problems** / **problems** | every mistake in the files, with the file, the line, and how to fix it |

New drawings on the **Teach** page are kept in your browser until you add
them on GitHub, so you can draw some, close the tab, and come back.

---

## 6. When something goes wrong

- The **problems** button turns red when a file has a mistake. It tells you
  the file, the line, and the usual fix.
- A line "isn't a drawing"? It probably got cut in half or something got
  typed into it. Delete the line, or paste it again from **Teach**.
- The **Doodle check** on every pull request runs the same checks, so
  mistakes get caught before they reach `main`.
- A merged pull request broke something? Open it and click **Revert**. That
  makes a new pull request that undoes it.

### "This branch has conflicts that must be resolved"

Two pull requests changed the same lines (usually in `drawings/list.txt`),
and GitHub can't tell which one you want. Click **Resolve conflicts**. GitHub
shows both versions between markers:

```text
<<<<<<< pizza-branch
pizza.txt
=======
guitar.txt
>>>>>>> main
```

Edit the text so it says what you actually want (here: keep both lines!),
delete the three marker lines, then click **Mark as resolved** → **Commit
merge**. The Doodle check runs again, and the pull request can be merged.

---

## More

- [CHALLENGES.md](CHALLENGES.md): first steps, and the "make it yours" challenges.
- [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md): how a drawing becomes numbers, how the guessing works, and where it goes wrong.
- [docs/IDEAS.md](docs/IDEAS.md): **optional** bigger features, if your team wants to go further.
- Found something that doesn't work right? **Issues** → **New issue** → **Bug report**.

The sample drawings come from Google's
[Quick, Draw! dataset](https://github.com/googlecreativelab/quickdraw-dataset),
made by players of the [Quick, Draw!](https://quickdraw.withgoogle.com) game
and shared under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
license.
