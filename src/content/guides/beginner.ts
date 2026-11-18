import type { Guide } from '../types'

export const beginnerGuides: Guide[] = [
  {
    id: 'what-is-git',
    title: 'What is Git?',
    path: 'beginner',
    order: 1,
    level: 'beginner',
    summary: 'Understand what Git is, why developers use it, and how it differs from GitHub.',
    keywords: ['what is git', 'version control', 'git vs github', 'why use git', 'git basics', 'vcs', 'source control'],
    whenToUse: [
      'You are new to programming tools and keep hearing about Git.',
      'You save copies like `final_v2_REAL.zip` and want something better.',
      'You need to collaborate on code with other people.',
    ],
    explain: [
      'Git is a **version control system**: it records snapshots of your project (called **commits**) so you can see what changed, when, and why, and go back to any earlier version.',
      'Git is **distributed**: every copy of a repository holds the full history, so you can work offline and commit locally. You only need the network to share work.',
      '**GitHub** is a website that hosts Git repositories and adds collaboration features such as pull requests, issues and Actions. Git is the tool, GitHub is one place to store and share what Git tracks.',
    ],
    steps: [
      { text: 'Check whether Git is already installed.', code: 'git --version' },
      {
        text: 'Learn the three areas every change moves through: the **working directory** (your files), the **staging area** (what goes into the next commit), and the **repository** (saved commits).',
      },
      {
        text: 'The everyday loop is: edit files, stage them, commit them. Then push to share.',
        code: 'git add <file>\ngit commit -m "Describe the change"\ngit push',
      },
    ],
    tips: [
      'Commit small, focused changes often. Commits are cheap and easy to undo.',
      'Use `git status` constantly. It tells you where you are and what to do next.',
    ],
    related: ['install-and-configure', 'first-repo', 'staging-and-committing', 'github-overview'],
    sandbox: {
      setup: ['git init', 'echo "Hello" > hello.txt'],
      commands: ['git status', 'git add hello.txt', 'git commit -m "Add hello"', 'git log --oneline'],
    },
  },
  {
    id: 'install-and-configure',
    title: 'Install and configure Git',
    path: 'beginner',
    order: 2,
    level: 'beginner',
    summary: 'Install Git on Windows, macOS or Linux and set your name, email, default branch and editor.',
    keywords: ['install git', 'git setup', 'git config', 'set username', 'set email', 'default branch main', 'git editor', 'git config list'],
    whenToUse: [
      'You are setting up Git on a new computer.',
      'Your commits show the wrong name or email.',
      'New repositories start on `master` and you want `main`.',
    ],
    explain: [
      'Git stores settings in config files. `--global` settings live in `~/.gitconfig` and apply to every repository for your user. Settings without `--global` apply to the current repository only and override the global ones.',
      'Your name and email are written into every commit you make. GitHub uses the email to link commits to your account, so use an email that is added to your GitHub account (or your GitHub `noreply` address).',
    ],
    steps: [
      {
        text: '**Windows:** download and run the installer from git-scm.com (it includes Git Bash), or use winget.',
        code: 'winget install --id Git.Git -e',
      },
      {
        text: '**macOS:** run `git --version`; if Git is missing, macOS offers to install the Xcode Command Line Tools. Or use Homebrew for a newer version.',
        code: 'brew install git',
      },
      {
        text: '**Linux:** use your package manager.',
        code: '# Debian / Ubuntu\nsudo apt install git\n# Fedora\nsudo dnf install git\n# Arch\nsudo pacman -S git',
      },
      { text: 'Confirm the install.', code: 'git --version' },
      {
        text: 'Set the name and email that will appear on your commits.',
        code: 'git config --global user.name "Your Name"\ngit config --global user.email "you@example.com"',
      },
      { text: 'Make `main` the default branch name for new repositories.', code: 'git config --global init.defaultBranch main' },
      {
        text: 'Choose the editor Git opens for commit messages and rebases (pick one).',
        code: 'git config --global core.editor "code --wait"   # VS Code\ngit config --global core.editor "nano"          # nano\ngit config --global core.editor "vim"           # vim',
      },
      {
        text: 'Review all settings and where each one comes from.',
        code: 'git config --list --show-origin\ngit config user.email   # check one value',
      },
    ],
    tips: [
      'On Windows, consider `git config --global core.autocrlf true`; on macOS/Linux use `input`. This avoids line-ending noise in diffs.',
      'To keep your email private, use the `noreply` address from GitHub → Settings → Emails.',
      'Use a different email in one repository by running `git config user.email` without `--global` inside it.',
    ],
    related: ['what-is-git', 'first-repo', 'ssh-keys-github', 'multiple-github-accounts'],
  },
  {
    id: 'first-repo',
    title: 'Create your first repository',
    path: 'beginner',
    order: 3,
    level: 'beginner',
    summary: 'Turn a folder into a Git repository and make your first commit.',
    keywords: ['git init', 'create repository', 'new repo', 'start git project', 'first commit', 'initialize git'],
    whenToUse: [
      'You start a new project and want to track it with Git.',
      'You have an existing folder of code that is not under version control yet.',
    ],
    explain: [
      '`git init` creates a hidden `.git` folder. That folder **is** the repository: it stores every commit, branch and setting. Your project files around it are the working directory.',
      'Deleting `.git` removes all history but keeps your current files. Never edit files inside `.git` by hand.',
    ],
    steps: [
      { text: 'Create a folder (or go into an existing one).', code: 'mkdir my-project\ncd my-project' },
      { text: 'Initialize the repository.', code: 'git init' },
      { text: 'Create a file and check the status. The file shows as **untracked**.', code: 'echo "# My Project" > README.md\ngit status' },
      { text: 'Stage the file and make the first commit.', code: 'git add README.md\ngit commit -m "Initial commit"' },
      { text: 'See your commit in the history.', code: 'git log --oneline' },
    ],
    risks: ['Running `git init` in your home folder turns everything below it into one giant repository. Run it inside the project folder only.'],
    undo: ['If you ran `git init` in the wrong place, delete the `.git` folder there: `rm -rf .git` (your files stay).'],
    tips: ['Add a `.gitignore` before your first commit so build output and secrets never get tracked.'],
    related: ['install-and-configure', 'staging-and-committing', 'gitignore', 'push-to-github'],
    sandbox: {
      commands: ['git init', 'echo "# My Project" > README.md', 'git status', 'git add README.md', 'git commit -m "Initial commit"', 'git log --oneline'],
    },
  },
  {
    id: 'staging-and-committing',
    title: 'Stage and commit changes',
    path: 'beginner',
    order: 4,
    level: 'beginner',
    summary: 'Choose exactly which changes go into a commit with the staging area, then save them.',
    keywords: ['git add', 'git commit', 'staging area', 'stage files', 'save changes', 'index', 'commit all', 'git add -p'],
    whenToUse: [
      'You changed files and want to save a snapshot.',
      'You changed several things and want to commit them separately.',
    ],
    explain: [
      'The **staging area** (also called the index) is a draft of your next commit. `git add` copies the current state of a file into it; `git commit` saves everything staged as one snapshot.',
      'If you edit a file after staging it, the new edits are not staged until you run `git add` again. `git status` shows both parts.',
    ],
    steps: [
      { text: 'See what changed.', code: 'git status' },
      { text: 'Stage specific files, or everything in the current folder.', code: 'git add index.html style.css\ngit add .' },
      { text: 'Stage only some parts of a file, hunk by hunk (answer y/n for each).', code: 'git add -p' },
      { text: 'Commit what is staged with a message.', code: 'git commit -m "Add contact form"' },
      {
        text: 'Shortcut: stage all **already tracked** files and commit in one step.',
        code: 'git commit -am "Fix typo in footer"',
        note: '`-a` does not include new (untracked) files. Use `git add` for those.',
      },
      { text: 'Unstage a file if you added it by mistake.', code: 'git restore --staged <file>' },
    ],
    tips: [
      'Review before committing with `git diff --staged`.',
      'One commit = one logical change. It makes history readable and reverts easy.',
    ],
    related: ['writing-good-commits', 'unstage-files', 'diff-changes', 'amend-last-commit', 'undo-last-commit'],
    sandbox: {
      setup: ['git init', 'echo "v1" > app.js', 'git add .', 'git commit -m "Initial commit"', 'echo "v2" >> app.js', 'echo "notes" > notes.txt'],
      commands: ['git status', 'git add app.js', 'git status', 'git commit -m "Update app"', 'git status', 'git log --oneline'],
    },
  },
  {
    id: 'writing-good-commits',
    title: 'Write good commit messages',
    path: 'beginner',
    order: 5,
    level: 'beginner',
    summary: 'Write clear commit messages using a short subject line and the Conventional Commits format.',
    keywords: ['commit message', 'conventional commits', 'good commit', 'feat fix chore', 'commit message format', 'commit style'],
    whenToUse: [
      'You want history that your team (and future you) can understand.',
      'Your project generates changelogs or version numbers from commits.',
      'A reviewer asked you to write better messages.',
    ],
    explain: [
      'A message has a **subject** (one line, about 50 characters, imperative mood: "Add", not "Added") and an optional **body** after a blank line that explains why the change was made.',
      '**Conventional Commits** adds a type prefix: `type(scope): description`. Common types: `feat` (new feature), `fix` (bug fix), `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`. A `!` after the type or a `BREAKING CHANGE:` footer marks a breaking change.',
    ],
    steps: [
      { text: 'Write a one-line message for a small change.', code: 'git commit -m "fix(login): show error when password is empty"' },
      {
        text: 'For a bigger change, run `git commit` without `-m` and write a subject, a blank line, and a body in your editor.',
        code: 'feat(cart): save cart to localStorage\n\nUsers lost their cart on refresh. The cart is now stored\nin localStorage and restored on page load.\n\nCloses #42',
      },
      { text: 'Or pass several `-m` flags; each becomes a paragraph.', code: 'git commit -m "feat(api): add pagination" -m "Adds page and limit query params."' },
      { text: 'Mark a breaking change.', code: 'git commit -m "feat(api)!: remove v1 endpoints"' },
    ],
    tips: [
      'Good: `fix: handle empty search query`. Bad: `fixed stuff`, `wip`, `asdf`.',
      'Explain **why** in the body; the diff already shows **what**.',
      'Fix a message you just made with `git commit --amend` (only if not pushed yet).',
    ],
    related: ['staging-and-committing', 'amend-last-commit', 'squash-commits', 'open-a-pull-request'],
  },
  {
    id: 'gitignore',
    title: 'Ignore files with .gitignore',
    path: 'beginner',
    order: 6,
    level: 'beginner',
    summary: 'Keep build output, dependencies and secrets out of your repository with a .gitignore file.',
    keywords: ['gitignore', 'ignore files', 'node_modules', '.env', 'ignore folder', 'exclude files', 'untracked files'],
    whenToUse: [
      'Folders like `node_modules/`, `dist/` or `__pycache__/` show up in `git status`.',
      'You have a `.env` file with secrets that must never be committed.',
      'Your editor or OS creates files like `.DS_Store` or `.vscode/`.',
    ],
    explain: [
      '`.gitignore` is a plain text file in the repository root. Each line is a pattern; matching **untracked** files are hidden from `git status` and skipped by `git add`.',
      'It does not affect files that are already tracked. To stop tracking one, remove it from the index with `git rm --cached` and commit.',
    ],
    steps: [
      {
        text: 'Create `.gitignore` in the project root with your patterns.',
        code: '# dependencies\nnode_modules/\n# build output\ndist/\n# secrets\n.env\n.env.*\n!.env.example\n# logs and OS files\n*.log\n.DS_Store',
        note: '`/` at the end matches a folder, `*` is a wildcard, and `!` re-includes a file.',
      },
      { text: 'Commit it so everyone on the project shares the rules.', code: 'git add .gitignore\ngit commit -m "chore: add .gitignore"' },
      { text: 'Check why a file is ignored.', code: 'git check-ignore -v .env' },
      { text: 'Stop tracking a file that was committed before you ignored it.', code: 'git rm --cached .env\ngit commit -m "chore: stop tracking .env"' },
    ],
    risks: ['Ignoring a secret that was already committed does not remove it from history. Rotate the secret and clean history.'],
    tips: [
      'Start from a template at github.com/github/gitignore, or pick one when creating a repo on GitHub.',
      'Put personal editor/OS patterns in a global ignore file: `git config --global core.excludesFile ~/.gitignore_global`.',
    ],
    related: ['untrack-committed-file', 'remove-secrets-from-history', 'first-repo', 'github-security-basics'],
    sandbox: {
      setup: ['git init', 'echo "app" > app.js', 'echo "SECRET=123" > .env', 'echo "log" > debug.log'],
      commands: ['git status', 'echo ".env" > .gitignore', 'echo "*.log" >> .gitignore', 'git status', 'git add .', 'git commit -m "Add app and gitignore"', 'ls'],
    },
  },
  {
    id: 'viewing-history',
    title: 'View commit history',
    path: 'beginner',
    order: 7,
    level: 'beginner',
    summary: 'Explore past commits with git log and inspect any single commit with git show.',
    keywords: ['git log', 'commit history', 'git show', 'see commits', 'log oneline', 'log graph', 'who changed this', 'git blame'],
    whenToUse: [
      'You want to know what changed recently and who changed it.',
      'You need a commit hash to revert, cherry-pick or reset to.',
      'You want to see how branches split and merged.',
    ],
    explain: [
      'Every commit has a unique hash (like `a1b2c3d`), an author, a date, a message, and a pointer to its parent commit. `git log` walks these pointers backwards from `HEAD`.',
      '`HEAD` is the commit you are on now. `HEAD~1` is its parent, `HEAD~2` the one before.',
    ],
    steps: [
      { text: 'Show the full history (press `q` to quit the pager).', code: 'git log' },
      { text: 'Compact view, one line per commit.', code: 'git log --oneline' },
      { text: 'Show all branches as a graph.', code: 'git log --oneline --graph --all' },
      { text: 'Filter history.', code: 'git log -5                       # last 5 commits\ngit log --author="Ana"\ngit log --since="2 weeks ago"\ngit log -- src/app.js            # commits touching one file\ngit log -S "apiKey"              # commits that added/removed a text' },
      { text: 'Inspect one commit: message plus the full diff.', code: 'git show HEAD\ngit show a1b2c3d' },
      { text: 'See who last changed each line of a file.', code: 'git blame src/app.js' },
    ],
    tips: [
      'Create a handy alias: `git config --global alias.lg "log --oneline --graph --all"`, then run `git lg`.',
      'On GitHub, the "History" button on any file shows the same information.',
    ],
    related: ['diff-changes', 'staging-and-committing', 'bisect-find-bug', 'recover-with-reflog'],
    sandbox: {
      setup: ['git init', 'echo "a" > a.txt', 'git add .', 'git commit -m "Add a"', 'echo "b" > b.txt', 'git add .', 'git commit -m "Add b"', 'echo "a2" >> a.txt', 'git commit -am "Update a"'],
      commands: ['git log', 'git log --oneline', 'git show HEAD', 'git show HEAD~1'],
    },
  },
  {
    id: 'diff-changes',
    title: 'See changes with git diff',
    path: 'beginner',
    order: 8,
    level: 'beginner',
    summary: 'Compare your working files, staged changes, commits and branches with git diff.',
    keywords: ['git diff', 'see changes', 'compare files', 'diff staged', 'compare branches', 'what did I change', 'diff commits'],
    whenToUse: [
      'You want to review your edits before staging or committing.',
      'You want to compare two commits or two branches.',
    ],
    explain: [
      '`git diff` with no arguments shows changes in your working directory that are **not staged** yet. `git diff --staged` shows what **is staged**, i.e. what the next commit will contain.',
      'Lines starting with `-` were removed, lines with `+` were added. `@@` lines tell you where in the file the change is.',
    ],
    steps: [
      { text: 'Unstaged changes.', code: 'git diff' },
      { text: 'Staged changes (same as `--cached`).', code: 'git diff --staged' },
      { text: 'All changes since the last commit, staged or not.', code: 'git diff HEAD' },
      { text: 'Compare two commits or branches.', code: 'git diff HEAD~2 HEAD\ngit diff main feature/login\ngit diff main...feature/login   # only what the branch added' },
      { text: 'Just list changed files, or show a summary.', code: 'git diff --name-only main\ngit diff --stat' },
    ],
    tips: [
      'Run `git diff --staged` right before every commit. It catches debug prints and secrets.',
      'Use `git diff --word-diff` for prose and long lines.',
    ],
    related: ['staging-and-committing', 'viewing-history', 'discard-local-changes', 'unstage-files'],
    sandbox: {
      setup: ['git init', 'echo "line one" > notes.txt', 'git add .', 'git commit -m "Add notes"', 'echo "line two" >> notes.txt'],
      commands: ['git diff', 'git add notes.txt', 'git diff', 'git diff --staged', 'git commit -m "Add line two"'],
    },
  },
]
