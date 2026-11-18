import type { Guide } from '../types'

// Path: rescue — "Fix mistakes & rewrite history".
// Every guide here has `risks` and `undo`, because these commands move refs or delete work.

export const rescueGuides: Guide[] = [
  // ---------------------------------------------------------------------------
  {
    id: 'undo-last-commit',
    title: 'Undo the last commit',
    path: 'rescue',
    order: 1,
    level: 'beginner',
    summary: 'Take back your last commit, and choose whether to keep or throw away its changes.',
    keywords: [
      'undo commit',
      'uncommit',
      'undo last commit',
      'go back one commit',
      'remove last commit',
      'committed by mistake',
      'reset HEAD~1',
      'delete last commit',
    ],
    whenToUse: [
      'You committed too early, to the wrong branch, or with the wrong files.',
      'The commit is still only on your machine (not pushed yet).',
      'The commit is already pushed: use `git revert` instead (see the revert guide).',
    ],
    explain: [
      "A branch is just a pointer to a commit. `git reset HEAD~1` moves that pointer back one commit, so the last commit is no longer part of the branch. The commit itself is not destroyed right away: Git keeps it in the reflog for weeks.",
      "The flag decides what happens to the changes from that commit: `--soft` keeps them staged, the default (`--mixed`) keeps them as unstaged edits, and `--hard` deletes them from your files.",
    ],
    steps: [
      { text: 'Check what the last commit contains before you undo it.', code: 'git log --oneline -3\ngit show --stat HEAD' },
      {
        text: 'Undo the commit and keep the changes **staged**, ready to commit again (the most common choice).',
        code: 'git reset --soft HEAD~1',
      },
      {
        text: 'Or undo the commit and keep the changes as **unstaged** edits, so you can pick files again.',
        code: 'git reset HEAD~1',
      },
      {
        text: 'Or undo the commit and **throw away** its changes completely.',
        code: 'git reset --hard HEAD~1',
        note: '`--hard` also deletes any uncommitted edits in your working folder. Run `git status` first.',
      },
      {
        text: 'If the commit was already pushed, do not reset. Create a new commit that reverses it instead.',
        code: 'git revert HEAD\ngit push',
      },
    ],
    risks: [
      'Resetting a commit that is already pushed rewrites shared history: teammates who pulled it will get diverged branches.',
      '`--hard` deletes uncommitted work in your folder. Unsaved, never-committed changes cannot be recovered by Git.',
      '`HEAD~1` fails on the very first commit of a repo (there is no parent). Use `git update-ref -d HEAD` to uncommit it while keeping files staged.',
    ],
    undo: [
      'Find the commit you removed with `git reflog` (look for the line just before `reset: moving to HEAD~1`).',
      'Put the branch back on it with `git reset --hard HEAD@{1}`, or `git reset --hard <sha>` using the hash from the reflog.',
    ],
    tips: [
      'Committed to the wrong branch? Run `git branch new-branch` first (it keeps the commit), then `git reset --hard HEAD~1` on the wrong branch.',
      'Use `HEAD~3` to undo the last three commits.',
    ],
    related: ['amend-last-commit', 'reset-soft-mixed-hard', 'revert-a-pushed-commit', 'recover-with-reflog'],
    sandbox: {
      setup: [
        'git init',
        'echo "hello" > app.txt',
        'git add .',
        'git commit -m "First commit"',
        'echo "half-finished idea" >> app.txt',
        'git commit -am "Oops, committed too early"',
      ],
      commands: ['git log --oneline', 'git reset --soft HEAD~1', 'git status', 'git log --oneline'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'amend-last-commit',
    title: 'Fix the last commit (amend)',
    path: 'rescue',
    order: 2,
    level: 'beginner',
    summary: 'Change the message of your last commit or add a forgotten file to it.',
    keywords: [
      'amend commit',
      'change commit message',
      'edit last commit',
      'fix commit message typo',
      'forgot to add file',
      'add file to last commit',
      'commit --amend',
      'change commit author',
    ],
    whenToUse: [
      'You made a typo in the last commit message.',
      'You forgot to add a file or a small fix to the commit you just made.',
      'The commit has the wrong author name or email.',
    ],
    explain: [
      "Commits cannot be edited. `git commit --amend` builds a **new** commit from the current staging area plus the old commit's parent, and moves the branch to it. The old commit is left behind (still reachable through the reflog).",
      'Because the commit hash changes, amending a commit that is already pushed means you will need a force push.',
    ],
    steps: [
      { text: 'Fix only the message.', code: 'git commit --amend -m "Add login page"' },
      {
        text: 'Add a forgotten file to the last commit and keep the same message.',
        code: 'git add forgotten-file.js\ngit commit --amend --no-edit',
      },
      {
        text: 'Fix the author (for example after setting the right email).',
        code: 'git config user.email "you@example.com"\ngit commit --amend --no-edit --reset-author',
      },
      {
        text: 'If you had already pushed the old commit, update the remote with a safe force push (only on your own branch).',
        code: 'git push --force-with-lease',
      },
    ],
    risks: [
      'Amending a pushed commit rewrites history. Anyone who pulled the old commit now has a diverged branch.',
      'Anything currently staged goes into the amended commit. Run `git status` first so you do not sneak in unrelated changes.',
    ],
    undo: [
      'The previous version of the commit is in the reflog: `git reflog` shows it as the entry before `commit (amend)`.',
      'Go back to it with `git reset --soft HEAD@{1}` (keeps your changes staged) or `git reset --hard HEAD@{1}`.',
    ],
    tips: [
      'To fix an older commit (not the last one), use `git commit --fixup <sha>` and then `git rebase -i --autosquash <sha>~1`.',
      'Never amend commits on a shared branch like `main`. Make a new commit instead.',
    ],
    related: ['undo-last-commit', 'interactive-rebase', 'force-push-safely', 'writing-good-commits'],
    sandbox: {
      setup: [
        'git init',
        'echo "home" > index.html',
        'git add .',
        'git commit -m "Add home page"',
        'echo "login form" > login.html',
        'git add login.html',
        'git commit -m "Add lgoin page"',
      ],
      commands: [
        'git log --oneline',
        'echo "login styles" > login.css',
        'git add login.css',
        'git commit --amend -m "Add login page"',
        'git log --oneline',
        'git show',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'unstage-files',
    title: 'Unstage files (undo git add)',
    path: 'rescue',
    order: 3,
    level: 'beginner',
    summary: 'Remove files from the staging area without losing your edits.',
    keywords: ['unstage', 'undo git add', 'remove from staging', 'git restore --staged', 'git reset file', 'added wrong file'],
    whenToUse: [
      'You ran `git add .` and staged files that do not belong in this commit.',
      'You want to split your changes into two smaller commits.',
    ],
    explain: [
      "The staging area (index) is the draft of your next commit. `git restore --staged` copies the file's version from the last commit back into the index. Your working file is not touched, so your edits stay.",
    ],
    steps: [
      { text: 'See what is staged.', code: 'git status' },
      { text: 'Unstage one file.', code: 'git restore --staged config.json' },
      { text: 'Unstage everything.', code: 'git restore --staged .' },
      {
        text: 'On old Git versions (before 2.23) use reset instead. It does the same thing.',
        code: 'git reset HEAD config.json',
      },
      {
        text: 'In a brand-new repo with no commits yet, use `git rm --cached` to unstage a new file.',
        code: 'git rm --cached config.json',
      },
    ],
    risks: [
      'Safe: unstaging never changes your working files.',
      'Do not confuse it with `git restore <file>` (without `--staged`), which **discards** your edits.',
    ],
    undo: ['Stage the file again with `git add <file>`.'],
    tips: ['Use `git add -p` to stage only some parts of a file.'],
    related: ['staging-and-committing', 'discard-local-changes', 'undo-last-commit'],
    sandbox: {
      setup: ['git init', 'echo "v1" > app.js', 'git add .', 'git commit -m "Initial commit"', 'echo "v2" >> app.js', 'echo "debug=true" > debug.log'],
      commands: ['git add .', 'git status', 'git restore --staged debug.log', 'git status', 'git diff --staged'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'discard-local-changes',
    title: 'Discard local changes',
    path: 'rescue',
    order: 4,
    level: 'beginner',
    summary: 'Throw away uncommitted edits and go back to the last committed version of your files.',
    keywords: [
      'discard changes',
      'revert file',
      'undo changes to file',
      'reset file',
      'git restore',
      'git clean',
      'remove untracked files',
      'throw away local changes',
      'git checkout -- file',
    ],
    whenToUse: [
      'An experiment went wrong and you want the file back as it was in the last commit.',
      'You want a clean working folder before switching branches or pulling.',
      'Build output or junk files (untracked) are cluttering `git status`.',
    ],
    explain: [
      'Uncommitted edits live only in your working folder. `git restore <file>` overwrites the file with the staged (or committed) version. `git clean` deletes untracked files, which Git has never stored.',
      'This is one of the few Git operations that cannot be undone, because Git never saved the edits you discard.',
    ],
    steps: [
      { text: 'Look at what you are about to lose.', code: 'git status\ngit diff' },
      { text: 'Discard changes in one file.', code: 'git restore app.js' },
      { text: 'Discard all unstaged changes in the repo.', code: 'git restore .' },
      {
        text: 'Discard staged **and** unstaged changes in a file (go back to the last commit).',
        code: 'git restore --staged --worktree app.js',
      },
      {
        text: 'Delete untracked files and folders. Always do a dry run first.',
        code: 'git clean -n -d   # dry run: lists what would be deleted\ngit clean -f -d   # really delete',
        note: '`git clean -x` also deletes ignored files such as `.env` and `node_modules`. Use it with care.',
      },
      {
        text: 'Not sure? Stash instead of discarding. You can bring the changes back later.',
        code: 'git stash push -u -m "maybe useful"',
      },
    ],
    risks: [
      'Discarded edits and cleaned untracked files are gone for good. Git never stored them.',
      '`git reset --hard` discards all staged and unstaged changes in every tracked file at once.',
      '`git clean -fdx` also wipes ignored files (local config, `.env`, dependencies).',
    ],
    undo: [
      'Git cannot recover discarded uncommitted edits. Check your editor: VS Code and JetBrains IDEs keep a Local History of files.',
      'If you had staged the file before discarding, the content may survive as a dangling blob: `git fsck --lost-found` writes it to `.git/lost-found/`.',
      'If you used `git stash` instead, run `git stash pop` to get the changes back.',
    ],
    tips: [
      'Old tutorials use `git checkout -- <file>`. It still works, but `git restore` is clearer and harder to misuse.',
      'Commit or stash often. Committed work is almost impossible to lose in Git.',
    ],
    related: ['stash-work-in-progress', 'unstage-files', 'reset-soft-mixed-hard', 'gitignore'],
    sandbox: {
      setup: ['git init', 'echo "working code" > app.js', 'git add .', 'git commit -m "Working version"', 'echo "broken experiment" >> app.js'],
      commands: ['cat app.js', 'git diff', 'git restore app.js', 'cat app.js', 'git status'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'revert-a-pushed-commit',
    title: 'Revert a pushed commit',
    path: 'rescue',
    order: 5,
    level: 'beginner',
    summary: 'Undo a commit that is already on GitHub by adding a new commit that reverses it.',
    keywords: [
      'git revert',
      'undo pushed commit',
      'revert commit',
      'undo commit on main',
      'roll back deploy',
      'revert merge commit',
      'undo without rewriting history',
    ],
    whenToUse: [
      'A bad commit is already pushed to a shared branch like `main`.',
      'You need to roll back a change quickly without breaking teammates.',
      'You want to undo a merged pull request.',
    ],
    explain: [
      '`git revert <commit>` calculates the opposite of that commit and records it as a new commit. History is only added to, never rewritten, so everyone can simply pull it. This is the safe way to undo shared work.',
    ],
    steps: [
      { text: 'Find the commit to undo.', code: 'git log --oneline' },
      {
        text: 'Revert it. Git opens your editor for the message; `--no-edit` uses the default one.',
        code: 'git revert <sha> --no-edit',
      },
      { text: 'Push the revert like any other commit.', code: 'git push' },
      {
        text: 'Revert a range of commits (oldest to newest, inclusive) as one single commit.',
        code: 'git revert --no-commit <oldest-sha>^..<newest-sha>\ngit commit -m "Revert feature X"',
      },
      {
        text: 'Reverting a merge commit (for example a merged PR) needs `-m 1` to say which parent is the mainline.',
        code: 'git revert -m 1 <merge-sha>',
      },
      {
        text: 'If the revert conflicts with later changes, fix the files, then continue (or abort).',
        code: 'git add .\ngit revert --continue\n# or: git revert --abort',
      },
    ],
    risks: [
      'Reverting a merge commit tells Git those changes are already applied. Merging the same branch again later will not bring them back; you must revert the revert first.',
      'Later commits may depend on the reverted code, which leads to conflicts.',
    ],
    undo: [
      'Revert the revert: `git revert <revert-sha>` brings the original change back.',
      'If the revert is not pushed yet, `git reset --hard HEAD~1` removes it.',
    ],
    tips: [
      'On GitHub, merged pull requests have a **Revert** button that opens a new PR with the revert.',
      'Use revert on shared branches and reset only on private ones.',
    ],
    related: ['undo-last-commit', 'reset-soft-mixed-hard', 'force-push-safely', 'open-a-pull-request'],
    sandbox: {
      setup: [
        'git init',
        'echo "v1" > app.js',
        'git add .',
        'git commit -m "Add app"',
        'echo "bug" >> app.js',
        'git commit -am "Add buggy feature"',
        'git remote add origin https://github.com/you/demo.git',
        'git push -u origin main',
      ],
      commands: ['git log --oneline', 'git revert HEAD --no-edit', 'cat app.js', 'git log --oneline', 'git push'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'reset-soft-mixed-hard',
    title: 'git reset: --soft vs --mixed vs --hard',
    path: 'rescue',
    order: 6,
    level: 'intermediate',
    summary: 'Understand exactly what each reset mode does to your branch, staging area and files.',
    keywords: [
      'git reset',
      'reset soft',
      'reset mixed',
      'reset hard',
      'difference between reset modes',
      'move branch back',
      'reset to commit',
      'reset to origin',
    ],
    whenToUse: [
      'You want to move a branch back to an earlier commit.',
      'You want to make your local branch exactly match the remote.',
      'You are unsure which reset flag is safe for your situation.',
    ],
    explain: [
      'Git has three places: the **branch pointer** (HEAD), the **staging area** (index) and your **working folder**. `git reset <commit>` always moves the branch pointer. The mode decides how far the reset reaches.',
      '`--soft` moves only the branch; the undone changes stay staged. `--mixed` (the default) also resets the staging area; changes stay in your files as unstaged edits. `--hard` resets all three; changes are deleted from your files.',
    ],
    steps: [
      { text: 'Move back and keep everything staged (good for re-committing or squashing).', code: 'git reset --soft HEAD~2' },
      { text: 'Move back and keep the changes as unstaged edits (the default mode).', code: 'git reset HEAD~2' },
      {
        text: 'Move back and delete the changes.',
        code: 'git reset --hard HEAD~2',
        note: 'Also wipes uncommitted edits. Run `git stash` first if in doubt.',
      },
      {
        text: 'Make your local branch exactly match GitHub (throw away local commits and edits).',
        code: 'git fetch origin\ngit reset --hard origin/main',
      },
      {
        text: '`--keep` is a safer alternative to `--hard`: it refuses to run if it would overwrite your uncommitted edits.',
        code: 'git reset --keep HEAD~1',
      },
    ],
    risks: [
      'Resetting pushed commits rewrites shared history and forces a force push.',
      '`--hard` destroys uncommitted changes with no way back.',
      'Untracked files are not touched by reset; use `git clean` for those.',
    ],
    undo: [
      'Every reset is recorded in the reflog. Run `git reflog`, find the entry before the reset, then `git reset --hard HEAD@{1}`.',
      'Git also saves the previous position in `ORIG_HEAD`: `git reset --hard ORIG_HEAD` undoes the last reset.',
    ],
    tips: [
      'Remember: soft = staged, mixed = in files, hard = gone.',
      'For a single file, use `git restore --source=<commit> <file>` instead of resetting the whole branch.',
    ],
    related: ['undo-last-commit', 'recover-with-reflog', 'discard-local-changes', 'squash-commits'],
    sandbox: {
      setup: [
        'git init',
        'echo "one" > notes.txt',
        'git add .',
        'git commit -m "One"',
        'echo "two" >> notes.txt',
        'git commit -am "Two"',
        'echo "three" >> notes.txt',
        'git commit -am "Three"',
      ],
      commands: [
        'git reset --soft HEAD~1',
        'git status',
        'git commit -m "Three again"',
        'git reset --mixed HEAD~1',
        'git status',
        'git reset --hard HEAD',
        'cat notes.txt',
        'git log --oneline',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'recover-with-reflog',
    title: 'Recover lost commits with reflog',
    path: 'rescue',
    order: 7,
    level: 'intermediate',
    summary: 'Find and restore commits that seem lost after a reset, rebase or amend.',
    keywords: [
      'git reflog',
      'recover lost commit',
      'undo reset hard',
      'undo rebase',
      'restore deleted commit',
      'lost commits',
      'find old commit',
      'HEAD@{1}',
    ],
    whenToUse: [
      'You ran `git reset --hard` and lost commits.',
      'A rebase or amend went wrong and you want the old version back.',
      'Commits vanished from `git log` and you do not know their hash.',
    ],
    explain: [
      'The reflog is a local diary of every position HEAD (and each branch) has pointed to: commits, resets, checkouts, rebases. A commit that no branch points to is still in the object database, and the reflog remembers its hash.',
      'Reflog entries expire (by default 90 days, or 30 days for commits no branch can reach), after which `git gc` can delete those commits. The reflog is local: it is not pushed and not cloned.',
    ],
    steps: [
      {
        text: 'Show the reflog. The newest entry is `HEAD@{0}`.',
        code: 'git reflog\n# a1b2c3d HEAD@{0}: reset: moving to HEAD~2\n# 9f8e7d6 HEAD@{1}: commit: Add payment form',
      },
      { text: 'Inspect a candidate before restoring it.', code: 'git show HEAD@{1}\ngit log --oneline HEAD@{1}' },
      { text: 'Move your branch back to it.', code: 'git reset --hard HEAD@{1}' },
      {
        text: 'Or, more carefully, create a new branch at it and look around first.',
        code: 'git branch rescued 9f8e7d6\ngit switch rescued',
      },
      {
        text: 'See the history of a single branch, or with dates.',
        code: 'git reflog show feature\ngit reflog --date=relative',
      },
    ],
    risks: [
      '`git reset --hard` to a reflog entry discards uncommitted changes in your folder; stash them first.',
      'The reflog cannot recover changes that were never committed or staged.',
      'Running `git gc --prune=now` or `git reflog expire` destroys the safety net.',
    ],
    undo: [
      'Restoring is itself a reflog entry, so you can always jump again: `git reflog` then `git reset --hard HEAD@{n}`.',
      'If the reflog entry is gone, `git fsck --lost-found` lists dangling commits you can inspect with `git show <sha>`.',
    ],
    tips: [
      'Before risky operations, make a throwaway backup branch: `git branch backup-before-rebase`.',
      '`ORIG_HEAD` points to where HEAD was before the last reset, rebase or merge.',
    ],
    related: ['recover-deleted-branch', 'reset-soft-mixed-hard', 'undo-last-commit', 'interactive-rebase'],
    sandbox: {
      setup: [
        'git init',
        'echo "base" > app.js',
        'git add .',
        'git commit -m "Base"',
        'echo "feature A" >> app.js',
        'git commit -am "Feature A"',
        'echo "feature B" >> app.js',
        'git commit -am "Feature B"',
      ],
      commands: ['git log --oneline', 'git reset --hard HEAD~2', 'git log --oneline', 'git reflog', 'git reset --hard HEAD@{1}', 'git log --oneline'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'recover-deleted-branch',
    title: 'Recover a deleted branch',
    path: 'rescue',
    order: 8,
    level: 'intermediate',
    summary: 'Bring back a branch you deleted with `git branch -D` or on GitHub.',
    keywords: [
      'recover deleted branch',
      'restore branch',
      'undo branch delete',
      'branch -D by mistake',
      'deleted branch on github',
      'undelete branch',
    ],
    whenToUse: [
      'You force-deleted a local branch with unmerged work.',
      'A branch was deleted on GitHub after a pull request.',
    ],
    explain: [
      'Deleting a branch only removes the name (pointer). The commits stay in the repository until garbage collection, and the reflog still knows their hashes. Recreating the branch is just putting a new name on the old tip commit.',
    ],
    steps: [
      {
        text: 'If you just deleted it, Git printed the tip hash. Recreate the branch from it.',
        code: '# Deleted branch feature (was 3e4f5a6).\ngit branch feature 3e4f5a6',
      },
      {
        text: 'Otherwise, search the reflog for the last commit or checkout on that branch.',
        code: 'git reflog | grep -i feature\n# or look for "checkout: moving from feature to main"',
      },
      { text: 'Recreate the branch at the commit you found and check it.', code: 'git branch feature <sha>\ngit log --oneline feature' },
      {
        text: 'If the branch still exists on GitHub, just switch to it: Git creates the local branch from `origin/feature`.',
        code: 'git fetch\ngit switch feature',
      },
      {
        text: 'Deleted on GitHub? Open the closed or merged pull request and click **Restore branch**, or push it back from any local copy.',
        code: 'git push origin feature',
      },
    ],
    risks: [
      'Commits from a deleted branch can be garbage collected once their reflog entries expire (30 days for unreachable commits by default).',
      'Another clone (a teammate, CI) may be the only copy if you never had the branch locally.',
    ],
    undo: ['If you restored the wrong commit, delete the new branch with `git branch -D feature` and recreate it at the right hash.'],
    tips: [
      'Prefer `git branch -d` (lowercase): it refuses to delete branches with unmerged work.',
      'Lost the reflog too? `git fsck --lost-found` lists dangling commits to inspect.',
    ],
    related: ['recover-with-reflog', 'create-and-switch-branches', 'what-is-a-branch'],
    sandbox: {
      setup: [
        'git init',
        'echo "app" > app.js',
        'git add .',
        'git commit -m "Initial commit"',
        'git switch -c feature',
        'echo "new idea" > idea.js',
        'git add .',
        'git commit -m "Work on idea"',
        'git switch main',
      ],
      commands: ['git log --oneline --graph --all', 'git branch -D feature', 'git log --oneline --graph --all', 'git reflog', 'git branch feature HEAD@{1}', 'git log --oneline --graph --all'],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'stash-work-in-progress',
    title: 'Stash work in progress',
    path: 'rescue',
    order: 9,
    level: 'beginner',
    summary: 'Put unfinished changes aside, switch tasks, and bring them back later.',
    keywords: [
      'git stash',
      'save changes without committing',
      'stash pop',
      'switch branch with uncommitted changes',
      'shelve changes',
      'temporary save',
      'stash untracked files',
    ],
    whenToUse: [
      'You need to switch branches but have uncommitted changes.',
      'You want to pull, but local edits block it.',
      'You started work on the wrong branch and want to move the edits.',
    ],
    explain: [
      '`git stash` saves your uncommitted changes (staged and unstaged) as a special commit on a stack and resets your folder to clean. `git stash pop` reapplies the newest entry and removes it from the stack; `git stash apply` reapplies it and keeps it.',
      'By default untracked (new) files are not stashed. Add `-u` to include them.',
    ],
    steps: [
      { text: 'Stash your changes with a description.', code: 'git stash push -m "half-done navbar"' },
      { text: 'Include new untracked files too.', code: 'git stash push -u -m "navbar incl. new files"' },
      { text: 'List stashes and peek inside one.', code: 'git stash list\ngit stash show -p stash@{0}' },
      { text: 'Bring the newest stash back and remove it from the list.', code: 'git stash pop' },
      { text: 'Apply a specific stash but keep it in the list.', code: 'git stash apply stash@{1}' },
      { text: 'Move stashed work onto a new branch (avoids conflicts).', code: 'git stash branch navbar-work stash@{0}' },
      { text: 'Delete a stash you no longer need.', code: 'git stash drop stash@{0}' },
    ],
    risks: [
      'If `git stash pop` hits a conflict, the stash is **not** dropped. Resolve the conflict, then `git stash drop` yourself.',
      'Stashes are local only and easy to forget. Old stashes pile up.',
      '`git stash clear` deletes every stash at once.',
    ],
    undo: [
      'Popped into the wrong branch? Run `git stash` again, switch, and pop there.',
      'Dropped a stash by mistake? Its hash was printed (`Dropped stash@{0} (abc123)`). Restore it with `git stash apply abc123`. If lost, `git fsck --unreachable | grep commit` lists candidates.',
    ],
    tips: [
      'For anything longer than a few minutes, a WIP commit on a branch is safer than a stash.',
      '`git switch` with uncommitted changes often works without stashing, if the files do not clash.',
    ],
    related: ['discard-local-changes', 'create-and-switch-branches', 'fetch-vs-pull'],
    sandbox: {
      setup: [
        'git init',
        'echo "home" > index.html',
        'git add .',
        'git commit -m "Home page"',
        'git branch hotfix',
        'echo "navbar draft" >> index.html',
      ],
      commands: [
        'git status',
        'git stash push -m "navbar draft"',
        'git status',
        'git switch hotfix',
        'git switch main',
        'git stash list',
        'git stash pop',
        'cat index.html',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'cherry-pick-commit',
    title: 'Cherry-pick a commit',
    path: 'rescue',
    order: 10,
    level: 'intermediate',
    summary: 'Copy a single commit from one branch onto another.',
    keywords: [
      'cherry-pick',
      'copy commit to another branch',
      'apply commit from other branch',
      'move commit',
      'backport fix',
      'pick one commit',
    ],
    whenToUse: [
      'A bug fix on `develop` is also needed on `main` or a release branch (backport).',
      'You committed on the wrong branch and want the commit on the right one.',
      'You want one commit from a branch without merging the whole branch.',
    ],
    explain: [
      'Cherry-pick takes the changes introduced by a commit and applies them as a **new** commit on your current branch. The new commit has a different hash; the original stays where it was.',
    ],
    steps: [
      { text: 'Find the hash of the commit you want.', code: 'git log --oneline feature' },
      { text: 'Switch to the branch that should receive it, then cherry-pick.', code: 'git switch main\ngit cherry-pick <sha>' },
      {
        text: 'Add `-x` to record where the commit came from (useful for backports).',
        code: 'git cherry-pick -x <sha>',
      },
      { text: 'Pick a range of commits (oldest to newest, inclusive).', code: 'git cherry-pick <oldest-sha>^..<newest-sha>' },
      {
        text: 'On conflict, fix the files and continue, or abort to go back.',
        code: 'git add .\ngit cherry-pick --continue\n# or: git cherry-pick --abort',
      },
      {
        text: 'Wrong-branch commit? After picking it to the right branch, remove it from the wrong one.',
        code: 'git switch wrong-branch\ngit reset --hard HEAD~1',
      },
    ],
    risks: [
      'Duplicated commits: if both branches are merged later, the same change exists twice (usually merges cleanly, sometimes conflicts).',
      'A commit may depend on earlier commits that you did not pick.',
    ],
    undo: [
      'Not pushed: `git reset --hard HEAD~1` removes the picked commit.',
      'Pushed: `git revert <new-sha>`.',
      'Mid-conflict: `git cherry-pick --abort`.',
    ],
    tips: ['Use `-n` (`--no-commit`) to apply the changes without committing, so you can combine several picks into one commit.'],
    related: ['merge-branches', 'rebase-basics', 'undo-last-commit', 'resolve-merge-conflicts'],
    sandbox: {
      setup: [
        'git init',
        'echo "app v1" > app.js',
        'git add .',
        'git commit -m "Initial commit"',
        'git switch -c develop',
        'echo "wip" > wip.js',
        'git add .',
        'git commit -m "Unfinished feature"',
        'echo "fix crash" > fix.js',
        'git add .',
      ],
      commands: [
        'git commit -m "Fix crash on login"',
        'git switch main',
        'git log --oneline --graph --all',
        'git cherry-pick develop',
        'ls',
        'git log --oneline --graph --all',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'detached-head',
    title: 'Detached HEAD: what it is and how to fix it',
    path: 'rescue',
    order: 11,
    level: 'intermediate',
    summary: 'Understand the detached HEAD state and save any commits you made in it.',
    keywords: [
      'detached head',
      'HEAD detached at',
      'not on any branch',
      'commits lost after checkout',
      'checkout old commit',
      'save work from detached head',
    ],
    whenToUse: [
      'Git says `You are in detached HEAD state` or `HEAD detached at abc123`.',
      'You checked out a commit, tag or remote branch to look at old code.',
      'You made commits while detached and want to keep them.',
    ],
    explain: [
      'Normally HEAD points to a branch, and the branch points to a commit. When you check out a commit or tag directly, HEAD points to the commit itself: it is "detached". You can look around and even commit, but no branch moves with you.',
      'If you switch away, commits made while detached are not on any branch. They are still in the reflog, but easy to lose.',
    ],
    steps: [
      { text: 'Check where you are.', code: 'git status\n# HEAD detached at 3e4f5a6' },
      { text: 'Just looking? Go back to your branch.', code: 'git switch main\n# or: git switch -   (back to the previous branch)' },
      { text: 'Made commits you want to keep? Create a branch right where you are.', code: 'git switch -c rescue-work' },
      {
        text: 'Already switched away and lost them? Find the commit in the reflog and make a branch.',
        code: 'git reflog\ngit branch rescue-work <sha>',
      },
      { text: 'To inspect old code on purpose, detach explicitly.', code: 'git switch --detach v1.2.0' },
    ],
    risks: [
      'Commits made in detached HEAD are garbage collected after the reflog expires if no branch points to them.',
      'Rebases and `git bisect` also detach HEAD temporarily; finish or abort them instead of committing randomly.',
    ],
    undo: ['Any commit made while detached can be recovered with `git reflog` and `git branch <name> <sha>`.'],
    tips: [
      'Use `git switch` for branches and `git switch --detach` for commits. `git switch` refuses to detach by accident, unlike `git checkout`.',
      'To work from a tag, create a branch: `git switch -c hotfix-1.2 v1.2.0`.',
    ],
    related: ['create-and-switch-branches', 'what-is-a-branch', 'recover-with-reflog', 'tags-and-releases-git'],
    sandbox: {
      setup: [
        'git init',
        'echo "v1" > app.js',
        'git add .',
        'git commit -m "Version 1"',
        'echo "v2" >> app.js',
        'git commit -am "Version 2"',
      ],
      commands: [
        'git checkout HEAD~1',
        'git status',
        'echo "experiment" > test.js',
        'git add .',
        'git commit -m "Experiment on old version"',
        'git switch -c experiment',
        'git log --oneline --graph --all',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'squash-commits',
    title: 'Squash several commits into one',
    path: 'rescue',
    order: 12,
    level: 'intermediate',
    summary: 'Combine your last few commits into a single clean commit.',
    keywords: [
      'squash commits',
      'combine commits',
      'merge commits into one',
      'clean up commits',
      'squash last 3 commits',
      'squash and merge',
      'git merge --squash',
    ],
    whenToUse: [
      'Your branch has messy commits like "wip", "fix typo", "try again" before a pull request.',
      'A reviewer asks you to squash your commits.',
    ],
    explain: [
      'The quickest way: `git reset --soft HEAD~3` moves the branch back three commits but keeps all their changes staged. One new commit then contains everything.',
      'For more control (keep some commits, reorder, reword), use interactive rebase. GitHub can also squash for you when merging a pull request.',
    ],
    steps: [
      { text: 'Check how many commits to squash.', code: 'git log --oneline -5' },
      { text: 'Move back N commits, keeping the changes staged.', code: 'git reset --soft HEAD~3' },
      { text: 'Make one commit with a good message.', code: 'git commit -m "Add user profile page"' },
      {
        text: 'Alternative: squash everything since the branch left `main`.',
        code: 'git reset --soft $(git merge-base main HEAD)\ngit commit -m "Add user profile page"',
      },
      {
        text: 'If the branch was already pushed, update it with a safe force push (your own branch only).',
        code: 'git push --force-with-lease',
      },
      {
        text: 'Or let GitHub do it: choose **Squash and merge** on the pull request. Locally the equivalent is:',
        code: 'git switch main\ngit merge --squash feature\ngit commit -m "Add user profile page"',
      },
    ],
    risks: [
      'Squashing pushed commits rewrites history; collaborators on the same branch must reset to the new version.',
      'Counting wrong (HEAD~4 instead of HEAD~3) squashes commits that are not yours, possibly from `main`.',
    ],
    undo: [
      'Before pushing: `git reset --hard ORIG_HEAD` (or `git reflog` then `git reset --hard HEAD@{2}`) restores the original commits.',
    ],
    tips: [
      'Use `git commit --fixup <sha>` while working, then `git rebase -i --autosquash main` squashes the fixups automatically.',
      'Many teams enable only "Squash merging" in repo settings to keep `main` linear.',
    ],
    related: ['interactive-rebase', 'reset-soft-mixed-hard', 'force-push-safely', 'open-a-pull-request', 'writing-good-commits'],
    sandbox: {
      setup: [
        'git init',
        'echo "app" > app.js',
        'git add .',
        'git commit -m "Initial commit"',
        'echo "profile" > profile.js',
        'git add .',
        'git commit -m "wip"',
        'echo "fix typo" >> profile.js',
        'git commit -am "fix typo"',
        'echo "styles" >> profile.js',
      ],
      commands: [
        'git commit -am "try again"',
        'git log --oneline',
        'git reset --soft HEAD~3',
        'git status',
        'git commit -m "Add user profile page"',
        'git log --oneline',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'interactive-rebase',
    title: 'Interactive rebase: edit, reorder, squash commits',
    path: 'rescue',
    order: 13,
    level: 'advanced',
    summary: 'Rewrite a series of commits: reword messages, squash, reorder, split or drop them.',
    keywords: [
      'interactive rebase',
      'rebase -i',
      'rewrite git history',
      'history rewrite',
      'edit old commit',
      'change old commit message',
      'reorder commits',
      'drop commit',
      'fixup autosquash',
      'split commit',
    ],
    whenToUse: [
      'You want to change a commit message that is not the last one.',
      'You want to clean up a feature branch before opening a pull request.',
      'You need to remove or reorder commits in your own branch.',
    ],
    explain: [
      '`git rebase -i <base>` lists the commits after `<base>` in your editor, oldest first. You change the word in front of each line, save, and Git replays the commits one by one following your instructions.',
      'Every replayed commit gets a new hash, so this rewrites history. Use it on commits that are not shared, or on your own feature branch before merging.',
    ],
    steps: [
      { text: 'Start a rebase of the last 4 commits (or everything since `main`).', code: 'git rebase -i HEAD~4\n# or: git rebase -i main' },
      {
        text: 'Change the command in front of each commit, then save and close the editor.',
        code: 'pick   a1b2c3d Add profile page\nreword b2c3d4e Add avatr upload      # r: edit message\nfixup  c3d4e5f fix typo              # f: melt into previous, drop msg\nsquash d4e5f6a Add avatar tests      # s: melt into previous, keep msg\n# edit (e) = stop to amend, drop (d) = delete, reorder = move lines',
      },
      {
        text: 'If Git stops (for `edit` or a conflict), make your change, stage it, and continue.',
        code: 'git add .\ngit commit --amend   # only for "edit" stops\ngit rebase --continue',
      },
      { text: 'Something wrong? Abort and you are back where you started.', code: 'git rebase --abort' },
      {
        text: 'Split a commit: mark it `edit`, then undo it softly and commit in pieces.',
        code: 'git reset HEAD~1\ngit add part1.js && git commit -m "Part 1"\ngit add part2.js && git commit -m "Part 2"\ngit rebase --continue',
      },
      {
        text: 'Automatic fixups: commit fixes with `--fixup`, then rebase with `--autosquash`.',
        code: 'git commit --fixup a1b2c3d\ngit rebase -i --autosquash main',
      },
      { text: 'Push the rewritten branch (your own branch only).', code: 'git push --force-with-lease' },
    ],
    risks: [
      'Rewriting commits others already pulled causes duplicate commits and painful merges for them.',
      'Conflicts can appear at several steps in a row; take your time and test after finishing.',
      'Dropping the wrong line deletes that commit from the branch.',
    ],
    undo: [
      'During the rebase: `git rebase --abort`.',
      'After it finished: `git reset --hard ORIG_HEAD`, or find the entry `rebase (start)` in `git reflog` and reset to the entry just before it.',
    ],
    tips: [
      'Set `git config --global rebase.autoSquash true` so `--fixup` commits are arranged automatically.',
      '`git config --global rebase.updateRefs true` also moves stacked branches during a rebase.',
      'Make a backup first: `git branch backup-before-rebase`.',
    ],
    related: ['squash-commits', 'rebase-basics', 'merge-vs-rebase', 'force-push-safely', 'recover-with-reflog'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'remove-secrets-from-history',
    title: 'Remove secrets or files from Git history',
    path: 'rescue',
    order: 14,
    level: 'advanced',
    summary: 'Delete a leaked password, API key or file from every commit with git filter-repo, then force-push the clean history.',
    keywords: [
      'history rewrite',
      'rewrite git history',
      'remove secret',
      'remove password from git',
      'delete file from all commits',
      'filter-repo',
      'leaked api key',
      'committed .env file',
      'remove sensitive data',
      'bfg repo cleaner',
      'purge file from history',
    ],
    whenToUse: [
      'You committed a password, API key, token, private key or `.env` file.',
      'A large file (binary, dump, video) bloats the repository and must leave all history.',
      'GitHub secret scanning alerted you about a leaked credential.',
    ],
    explain: [
      'Deleting the file in a new commit is not enough: every old commit still contains it, and anyone can check it out. `git filter-repo` rewrites **every** commit so the file never existed. All commit hashes change, so you must force-push and everybody must re-clone.',
      '**Rewriting history does not un-leak a secret.** Forks, existing clones, CI caches, search engines and GitHub pull request refs may still hold copies, and bots scan public pushes within minutes. Rotating (revoking) the secret is the real fix; cleaning history is housekeeping.',
      'filter-repo deliberately removes the `origin` remote after rewriting, so you cannot accidentally push into the old history before checking the result. You add it back yourself.',
    ],
    steps: [
      {
        text: '**Step 0: rotate or revoke the secret now.** Generate a new key or password at the provider (AWS, Stripe, database, GitHub token) and disable the old one. Check the provider logs for misuse.',
        note: 'Do this first, even if the repo is private. Treat the old secret as public forever.',
      },
      {
        text: 'Install git-filter-repo (it is a separate tool, not built into Git).',
        code: 'pip install git-filter-repo        # or: pipx install git-filter-repo\nbrew install git-filter-repo       # macOS\nsudo apt install git-filter-repo   # Debian/Ubuntu\ngit filter-repo --version',
      },
      {
        text: 'Make a safety backup of your current work: push or note any unpushed branches, and keep your existing folder untouched (for example rename it).',
        code: 'mv my-repo my-repo-backup',
        note: 'The backup still contains the secret. Delete it once the cleanup is verified.',
      },
      {
        text: 'Clone a fresh copy with all branches. filter-repo expects a fresh clone and refuses to run in a used one unless you pass `--force`.',
        code: 'git clone --no-single-branch https://github.com/yourname/your-repo.git my-repo-clean\ncd my-repo-clean',
        note: 'In a fresh clone, filter-repo turns the remote branches (`origin/*`) into local branches, so `--all` later pushes all of them. Check with `git branch -a`.',
      },
      {
        text: 'Rewrite history to remove the files from every commit, branch and tag.',
        code: 'git filter-repo --invert-paths --path secret.txt --path config/secret.md\n# whole folder:   --path private/\n# by pattern:     --path-glob "*.secret"',
        note: 'Add `--force` only if filter-repo says the repo is not a fresh clone and you are sure you are in a disposable copy.',
      },
      {
        text: 'If the secret is inside a file you must keep (like `config.js`), replace the text instead of deleting the file.',
        code: 'echo "sk_live_abc123==>REMOVED" > ../replacements.txt\ngit filter-repo --replace-text ../replacements.txt',
        note: 'Each line is `secret==>replacement` (or `regex:pattern==>replacement`). Keep this file outside the repo.',
      },
      {
        text: 'Verify the secret is gone from all history.',
        code: 'git log --all --oneline -- secret.txt     # should print nothing\ngit log --all -S "sk_live_abc123" --oneline  # should print nothing',
      },
      {
        text: 'Stop it coming back: remove any remaining tracked copies and ignore the files.',
        code: 'git rm --cached --ignore-unmatch secret.txt config/secret.md\necho "secret.txt" >> .gitignore\necho "*.secret" >> .gitignore\necho ".env" >> .gitignore\ngit add .gitignore\ngit commit -m "Ignore secret files"',
      },
      {
        text: 'Add the remote again (filter-repo removed it on purpose).',
        code: 'git remote add origin https://github.com/yourname/your-repo.git\ngit remote -v',
      },
      {
        text: 'If branch protection or a ruleset blocks force pushes, temporarily allow them for this push (Repo → Settings → Rules / Branches).',
        note: 'Turn the protection back on right after the push.',
      },
      {
        text: 'Force-push all branches and tags.',
        code: 'git push origin --force --all\ngit push origin --force --tags',
      },
      {
        text: 'Tell every collaborator to delete their old clone and **re-clone**. They must not pull or merge the old history back in, or the secret returns. Open pull requests based on old commits need to be recreated.',
      },
      {
        text: 'If the data is sensitive, contact GitHub Support to purge cached views and pull request refs (`refs/pull/*`, which you cannot force-push). Forks are separate repos and are not cleaned.',
      },
    ],
    risks: [
      'Every commit hash changes: open pull requests, links to commits and signed commits are affected.',
      'One teammate pushing their old clone re-introduces the secret everywhere.',
      'Forgetting a branch or tag leaves the secret in the repo; check `git log --all` after the rewrite.',
      'Cleaning history without rotating the secret gives a false sense of safety.',
    ],
    undo: [
      'Before pushing: just delete the `my-repo-clean` folder and start again from the backup or a new clone.',
      'After pushing: force-push the old history back from the backup (`git push origin --force --all` inside `my-repo-backup`). This also brings the secret back, so only do it to fix a broken rewrite.',
    ],
    tips: [
      '**BFG Repo-Cleaner** is a popular alternative: `bfg --delete-files secret.txt` or `bfg --replace-text passwords.txt`, then `git reflog expire --expire=now --all && git gc --prune=now --aggressive`.',
      'Avoid the old `git filter-branch`: it is slow and Git itself recommends filter-repo.',
      'Prevention: keep secrets in `.env` files listed in `.gitignore`, commit a `.env.example` with fake values, and enable GitHub **Secret scanning** and **Push protection**.',
      'Add a pre-commit hook such as gitleaks or detect-secrets to block secrets before they are committed.',
    ],
    related: ['force-push-safely', 'untrack-committed-file', 'gitignore', 'github-security-basics', 'protect-main-branch'],
    sandbox: {
      setup: [
        'git init',
        'echo "API_KEY=sk_live_123" > secret.txt',
        'echo "app" > app.js',
        'git add .',
        'git commit -m "Initial commit"',
        'echo "more app" >> app.js',
        'git commit -am "Add feature"',
        'git remote add origin https://github.com/you/demo.git',
        'git push -u origin main',
      ],
      commands: [
        'git filter-repo --invert-paths --path secret.txt --force',
        'git log --oneline',
        'git remote -v',
        'git remote add origin https://github.com/you/demo.git',
        'echo "secret.txt" >> .gitignore',
        'git add .gitignore',
        'git commit -m "Ignore secret files"',
        'git push --force --all',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'force-push-safely',
    title: 'Force push safely',
    path: 'rescue',
    order: 15,
    level: 'intermediate',
    summary: 'Overwrite a remote branch after rewriting history without destroying teammates\' work.',
    keywords: [
      'force push',
      'git push --force',
      'force-with-lease',
      'push rejected non-fast-forward',
      'overwrite remote branch',
      'force-if-includes',
      'updates were rejected',
    ],
    whenToUse: [
      'You amended, rebased or squashed commits that were already pushed to **your own** branch.',
      'Git rejects your push with "non-fast-forward" after a history rewrite.',
    ],
    explain: [
      '`git push --force` makes the remote branch point to your commit no matter what is there. Any commits a teammate pushed in the meantime are silently dropped from the branch.',
      "`--force-with-lease` only overwrites if the remote branch is still where your last fetch saw it. If someone pushed since, the push is rejected. But a plain `git fetch` updates what you \"saw\", so add `--force-if-includes` (Git 2.30+) to also check you actually integrated those commits.",
    ],
    steps: [
      { text: 'Check the remote has nothing you are missing.', code: 'git fetch\ngit log --oneline HEAD..origin/my-branch   # should be empty' },
      { text: 'Push with a lease instead of a plain force.', code: 'git push --force-with-lease --force-if-includes' },
      {
        text: 'If it is rejected, someone pushed. Integrate their work, then push again.',
        code: 'git pull --rebase\ngit push --force-with-lease --force-if-includes',
      },
      {
        text: 'Make the safe version your habit with an alias.',
        code: 'git config --global alias.pushf "push --force-with-lease --force-if-includes"\ngit pushf',
      },
    ],
    risks: [
      'Never force-push `main` or other shared branches unless the whole team agreed (for example a secret cleanup).',
      'Plain `--force` deletes teammates\' commits from the remote branch without warning.',
      'Tools that fetch in the background (some IDEs) refresh the lease, which weakens `--force-with-lease` alone.',
    ],
    undo: [
      'The overwritten commits still exist in the clone of whoever made them. They can push them back, or you can restore with `git push --force origin <old-sha>:my-branch`.',
      'Your own previous tip is in `git reflog`. On GitHub, the repository **Activity** view lists force pushes with the old commit.',
    ],
    tips: [
      'Protect `main` with a branch protection rule or ruleset that blocks force pushes.',
      'Force-push only branches that you alone work on, such as your PR branch.',
    ],
    related: ['protect-main-branch', 'interactive-rebase', 'squash-commits', 'push-to-github', 'keep-branch-updated'],
    sandbox: {
      setup: [
        'git init',
        'echo "app" > app.js',
        'git add .',
        'git commit -m "Initial commit"',
        'git remote add origin https://github.com/you/demo.git',
        'git push -u origin main',
        'teammate push "Teammate: add tests" tests.js',
      ],
      commands: [
        'git fetch',
        'git log --oneline --graph --all',
        'echo "my change" >> app.js',
        'git add app.js',
        'git commit --amend -m "Initial commit (amended)"',
        'git push --force',
        'git fetch',
        'git log --oneline --graph --all',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'untrack-committed-file',
    title: 'Stop tracking a committed file',
    path: 'rescue',
    order: 16,
    level: 'beginner',
    summary: 'Make Git forget a file you already committed, keep it on disk, and ignore it from now on.',
    keywords: [
      'untrack file',
      'git rm --cached',
      'gitignore not working',
      'remove file from repo but keep locally',
      'stop tracking file',
      'ignore already committed file',
      'remove node_modules from git',
    ],
    whenToUse: [
      'You added a file to `.gitignore`, but Git still tracks it.',
      'You committed `node_modules/`, build output, logs or local config.',
    ],
    explain: [
      '`.gitignore` only affects **untracked** files. Once a file is tracked, Git keeps tracking it. `git rm --cached` removes it from the index (the next commit) but leaves the file in your folder.',
      'The file still exists in older commits. If it contains secrets, also clean history and rotate the secret.',
    ],
    steps: [
      { text: 'Remove a file from tracking, keep it locally.', code: 'git rm --cached .env' },
      { text: 'For a whole folder, add `-r`.', code: 'git rm -r --cached node_modules/' },
      { text: 'Add it to `.gitignore` so it is not added again.', code: 'echo ".env" >> .gitignore\necho "node_modules/" >> .gitignore' },
      { text: 'Commit and push.', code: 'git add .gitignore\ngit commit -m "Stop tracking .env and node_modules"\ngit push' },
      {
        text: 'Re-apply a changed `.gitignore` to everything at once.',
        code: 'git rm -r --cached .\ngit add .\ngit commit -m "Apply .gitignore"',
      },
    ],
    risks: [
      'When teammates pull this commit, Git **deletes** the file from their folders (it was removed from the repo). Tell them to back up local copies such as `.env` first.',
      'The file stays in history. For secrets, follow the secret-removal guide.',
    ],
    undo: ['Track the file again: remove it from `.gitignore` and run `git add -f <file>`, then commit.'],
    tips: [
      'Commit a `.env.example` with fake values so others know which variables exist.',
      '`git check-ignore -v <file>` shows which ignore rule matches a file.',
    ],
    related: ['gitignore', 'remove-secrets-from-history', 'github-security-basics'],
    sandbox: {
      setup: [
        'git init',
        'echo "app" > app.js',
        'echo "DB_PASSWORD=hunter2" > .env',
        'git add .',
        'git commit -m "Initial commit"',
      ],
      commands: [
        'git rm --cached .env',
        'echo ".env" >> .gitignore',
        'git add .gitignore',
        'git commit -m "Stop tracking .env"',
        'ls',
        'git status',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: 'bisect-find-bug',
    title: 'Find the commit that broke something (bisect)',
    path: 'rescue',
    order: 17,
    level: 'advanced',
    summary: 'Use binary search over history to find the exact commit that introduced a bug.',
    keywords: [
      'git bisect',
      'find bad commit',
      'which commit broke',
      'find regression',
      'binary search commits',
      'bisect run',
    ],
    whenToUse: [
      'Something worked in an older version and is broken now, but you do not know which commit broke it.',
      'There are too many commits to check by hand.',
    ],
    explain: [
      'You tell Git one bad commit and one good commit. Git checks out the commit in the middle; you test and say good or bad. Each answer halves the range, so 1000 commits take only about 10 steps.',
      'Git can also run a test script for you: exit code 0 means good, 1 to 127 means bad (except 125, which means skip this commit).',
    ],
    steps: [
      { text: 'Start and mark the current (broken) commit as bad.', code: 'git bisect start\ngit bisect bad' },
      { text: 'Mark a commit or tag you know was good.', code: 'git bisect good v1.4.0' },
      {
        text: 'Git checks out a middle commit. Test it, then answer. Repeat until Git prints the first bad commit.',
        code: 'git bisect good   # works here\ngit bisect bad    # broken here\ngit bisect skip   # cannot test this one',
      },
      { text: 'Or automate it with a test command.', code: 'git bisect run npm test' },
      { text: 'Finish and return to where you started.', code: 'git bisect reset' },
    ],
    risks: [
      'Bisect checks out old commits (detached HEAD). Do not commit there; stash or commit your work before starting.',
      'Wrong good/bad answers lead to the wrong commit. `git bisect log` shows your answers.',
    ],
    undo: [
      '`git bisect reset` always returns you to the original branch.',
      'Made a wrong answer? `git bisect log > log.txt`, edit the wrong line out, then `git bisect replay log.txt`.',
    ],
    tips: [
      'Use `git bisect start --first-parent` to test only merge commits on `main`.',
      'Small, focused commits make bisect results much more useful.',
    ],
    related: ['viewing-history', 'diff-changes', 'detached-head', 'revert-a-pushed-commit'],
  },
]
