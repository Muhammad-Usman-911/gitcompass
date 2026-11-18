# Writing content for Git Compass

All content is typed data in `src/content/` (types in `src/content/types.ts`).
Each guide is one object. Keep it **accurate**, **practical**, and **beginner-friendly**:
plain words, short sentences, real commands that work on current Git (2.4x) and GitHub.

## Inline markup
Strings may use `` `code` `` and `**bold**`. No other Markdown (no links, no lists inside strings).

## Guide checklist
- `summary`: one sentence, starts with a verb ("Undo the last commit but keep your changes.").
- `keywords`: 4–10 phrases people actually search ("undo commit", "uncommit", "go back one commit").
- `whenToUse`: 2–4 bullets.
- `explain`: 1–3 short paragraphs, the mental model.
- `steps`: real, copy-pasteable commands. Use placeholders like `<branch>` only when necessary.
- `risks` + `undo`: required for anything that rewrites history or deletes work.
- `related`: only ids that exist (see the id list you were given).
- `sandbox` (optional but encouraged for git guides): a demo replayed in the browser simulator.

## Simulator: supported commands (sandbox only)
The simulator is a fake repo in the browser. A sandbox ALWAYS starts in an empty folder with
**no repo**, so `setup` usually begins with `git init`. Use only these:

Shell helpers
- `ls`, `cat <file>`, `touch <file>`, `rm <file>`, `clear`
- `echo "text" > <file>`, `echo "text" >> <file>`

Git
- `git init`, `git status`, `git add <file>|.|-A`, `git rm [--cached] <file>`, `git mv <a> <b>`
- `git commit -m "msg"`, `git commit -am "msg"`, `git commit --amend -m "msg"`, `git commit --amend --no-edit`
- `git log`, `git log --oneline`, `git log --oneline --graph --all`, `git show [<ref>]`, `git diff`, `git diff --staged`, `git reflog`
- `git branch`, `git branch <name> [<ref>]`, `git branch -d|-D <name>`, `git branch -m <new>`
- `git switch <branch>`, `git switch -c <branch>`, `git checkout <branch|ref>`, `git checkout -b <branch>`
- `git merge <branch>`, `git merge --no-ff <branch>`, `git merge --abort`
- `git rebase <branch>`, `git cherry-pick <ref>`, `git revert <ref> [--no-edit]`
- `git reset [--soft|--mixed|--hard] <ref>`, `git restore <file>`, `git restore --staged <file>`
- `git stash`, `git stash push -m "msg"`, `git stash list`, `git stash pop`, `git stash apply`, `git stash drop`
- `git tag <name> [<ref>]`, `git tag`
- `git remote add origin <url>`, `git remote -v`, `git clone <url>` (gives a repo with 3 sample commits)
- `git push [-u] [origin] [<branch>]`, `git push --force` / `--force-with-lease`, `git push --force --all`, `git push --tags`
- `git fetch`, `git pull`, `git pull --rebase`
- `git filter-repo --invert-paths --path <file> [--path <file2>] [--force]`
- Simulator-only helper: `teammate push "message" [<file>]`, makes a commit directly on `origin/<current branch>`
  as if a teammate pushed it (use it to demo fetch/pull/conflicts/force-push dangers).

Refs: `HEAD`, `HEAD~2`, `HEAD^`, `HEAD@{1}` (reflog), branch names, tag names, `origin/main`, short commit ids.
Merge conflicts happen when both sides changed the same file differently: the file gets
conflict markers; resolve with `echo "fixed" > <file>`, `git add <file>`, `git commit -m "..."`.

Keep sandboxes short: setup ≤ 10 commands, commands ≤ 8.

Example:
```ts
sandbox: {
  setup: ['git init', 'echo "hi" > a.txt', 'git add .', 'git commit -m "First"', 'echo "oops" >> a.txt', 'git commit -am "Bad commit"'],
  commands: ['git log --oneline', 'git reset --soft HEAD~1', 'git status', 'git log --oneline'],
},
```
