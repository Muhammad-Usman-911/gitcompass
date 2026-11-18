// Game levels: each challenge sets up a repo, gives a goal, and checks the
// resulting state. Solutions are verified by tests (challenges.test.ts).

import { inspect } from './git'
import type { RepoState } from './types'

export interface Goal {
  text: string
  check: (s: RepoState) => boolean
}

export interface Challenge {
  id: string
  world: 'Basics' | 'Branches' | 'Undo' | 'Teamwork' | 'Rewrite'
  title: string
  difficulty: 1 | 2 | 3
  xp: number
  story: string
  setup: string[]
  goals: Goal[]
  hints: string[]
  solution: string[]
  /** guide to read if stuck */
  guide?: string
}

const repo = inspect
const head = (s: RepoState) => repo(s).headId()
const msgs = (s: RepoState) => {
  const r = repo(s)
  const h = r.headId()
  return h ? r.reachable([h]).map((c) => c.message) : []
}
const clean = (s: RepoState) => !repo(s).isDirty() && repo(s).untracked().length === 0
const URL = 'https://github.com/you/shop.git'

export const challenges: Challenge[] = [
  {
    id: 'first-commit',
    world: 'Basics',
    title: 'Your first commit',
    difficulty: 1,
    xp: 50,
    story: 'You just started a new project. Turn this folder into a Git repo and save your first snapshot.',
    setup: [],
    goals: [
      { text: 'Create a repository', check: (s) => s.initialized },
      { text: 'Create a file called index.html', check: (s) => 'index.html' in s.work },
      { text: 'Make at least one commit containing index.html', check: (s) => !!head(s) && 'index.html' in repo(s).headTree() },
    ],
    hints: ['Start with `git init`.', 'Create a file: `echo "<h1>Hi</h1>" > index.html`', '`git add index.html` then `git commit -m "Add homepage"`'],
    solution: ['git init', 'echo "<h1>Hi</h1>" > index.html', 'git add index.html', 'git commit -m "Add homepage"'],
    guide: 'first-repo',
  },
  {
    id: 'stage-carefully',
    world: 'Basics',
    title: 'Stage only what matters',
    difficulty: 1,
    xp: 60,
    story: 'You changed two files, but only the bug fix in app.js is ready. notes.txt is private scribbles: commit app.js only.',
    setup: ['git init', 'echo "let total = 0" > app.js', 'git add .', 'git commit -m "Initial"', 'echo "let total = 1" > app.js', 'echo "todo: call bank" > notes.txt'],
    goals: [
      { text: 'Commit the change to app.js', check: (s) => repo(s).headTree()['app.js'] === 'let total = 1' },
      { text: 'notes.txt is NOT in any commit', check: (s) => !('notes.txt' in repo(s).headTree()) },
      { text: 'notes.txt still exists on disk', check: (s) => 'notes.txt' in s.work },
    ],
    hints: ['`git status` shows what changed.', '`git add app.js` stages only that file.'],
    solution: ['git add app.js', 'git commit -m "Fix total"'],
    guide: 'staging-and-committing',
  },
  {
    id: 'ignore-env',
    world: 'Basics',
    title: 'Keep secrets out',
    difficulty: 1,
    xp: 70,
    story: 'Your .env file holds a database password. Make sure Git ignores it, and commit the .gitignore.',
    setup: ['git init', 'echo "# shop" > README.md', 'git add .', 'git commit -m "Initial"', 'echo "DB_PASSWORD=hunter2" > .env'],
    goals: [
      { text: '.gitignore lists .env', check: (s) => (s.work['.gitignore'] ?? '').split('\n').includes('.env') },
      { text: '.gitignore is committed', check: (s) => (repo(s).headTree()['.gitignore'] ?? '').includes('.env') },
      { text: '.env is never committed', check: (s) => !Object.values(s.commits).some((c) => '.env' in c.tree) },
    ],
    hints: ['`echo ".env" > .gitignore`', 'Then add and commit only `.gitignore`.'],
    solution: ['echo ".env" > .gitignore', 'git add .gitignore', 'git commit -m "Ignore .env"'],
    guide: 'gitignore',
  },
  {
    id: 'feature-branch',
    world: 'Branches',
    title: 'Work on a feature branch',
    difficulty: 1,
    xp: 80,
    story: 'Never build features directly on main. Create a branch called feature/cart, commit cart.js on it, and keep main untouched.',
    setup: ['git init', 'echo "shop" > index.html', 'git add .', 'git commit -m "Initial"'],
    goals: [
      { text: 'Branch feature/cart exists', check: (s) => 'feature/cart' in s.branches },
      { text: 'feature/cart has a commit with cart.js', check: (s) => !!s.branches['feature/cart'] && 'cart.js' in s.commits[s.branches['feature/cart']].tree },
      { text: 'main does NOT have cart.js', check: (s) => !!s.branches.main && !('cart.js' in s.commits[s.branches.main].tree) },
    ],
    hints: ['`git switch -c feature/cart` creates and switches.', 'Then create cart.js, add and commit.'],
    solution: ['git switch -c feature/cart', 'echo "cart" > cart.js', 'git add .', 'git commit -m "Add cart"'],
    guide: 'create-and-switch-branches',
  },
  {
    id: 'merge-feature',
    world: 'Branches',
    title: 'Ship the feature',
    difficulty: 2,
    xp: 100,
    story: 'feature/login is done and main moved on too. Merge feature/login into main with a real merge commit.',
    setup: [
      'git init',
      'echo "app" > app.js',
      'git add .',
      'git commit -m "Initial"',
      'git switch -c feature/login',
      'echo "login" > login.js',
      'git add .',
      'git commit -m "Add login"',
      'git switch main',
      'echo "footer" > footer.html',
      'git add .',
      'git commit -m "Add footer"',
    ],
    goals: [
      { text: 'You are on main', check: (s) => s.head.type === 'branch' && s.head.name === 'main' },
      { text: 'main contains login.js', check: (s) => !!s.branches.main && 'login.js' in s.commits[s.branches.main].tree },
      { text: 'main tip is a merge commit (2 parents)', check: (s) => !!s.branches.main && s.commits[s.branches.main].parents.length === 2 },
    ],
    hints: ['You are already on main.', '`git merge feature/login`'],
    solution: ['git merge feature/login'],
    guide: 'merge-branches',
  },
  {
    id: 'conflict',
    world: 'Branches',
    title: 'Conflict!',
    difficulty: 2,
    xp: 140,
    story: 'You and a teammate both changed the price in price.txt. Merge feature/sale into main, resolve the conflict so price.txt says exactly "price=15", and finish the merge.',
    setup: [
      'git init',
      'echo "price=20" > price.txt',
      'git add .',
      'git commit -m "Initial price"',
      'git switch -c feature/sale',
      'echo "price=15" > price.txt',
      'git commit -am "Sale price"',
      'git switch main',
      'echo "price=25" > price.txt',
      'git commit -am "Raise price"',
    ],
    goals: [
      { text: 'No merge in progress', check: (s) => !s.merging },
      { text: 'main has a merge commit', check: (s) => !!s.branches.main && s.commits[s.branches.main].parents.length === 2 },
      { text: 'price.txt is exactly price=15 (no conflict markers)', check: (s) => !!s.branches.main && s.commits[s.branches.main].tree['price.txt'] === 'price=15' },
    ],
    hints: ['`git merge feature/sale` will report a conflict.', '`cat price.txt` shows the markers. Overwrite it: `echo "price=15" > price.txt`', '`git add price.txt` then `git commit -m "Merge sale"`'],
    solution: ['git merge feature/sale', 'echo "price=15" > price.txt', 'git add price.txt', 'git commit -m "Merge feature/sale"'],
    guide: 'resolve-merge-conflicts',
  },
  {
    id: 'rebase-linear',
    world: 'Branches',
    title: 'Straight line history',
    difficulty: 2,
    xp: 130,
    story: 'Your team wants a linear history. Put the commits of feature/search on top of the latest main using rebase (no merge commits).',
    setup: [
      'git init',
      'echo "home" > home.html',
      'git add .',
      'git commit -m "Initial"',
      'git switch -c feature/search',
      'echo "search" > search.js',
      'git add .',
      'git commit -m "Add search"',
      'git switch main',
      'echo "about" > about.html',
      'git add .',
      'git commit -m "Add about page"',
      'git switch feature/search',
    ],
    goals: [
      { text: 'feature/search contains the latest main', check: (s) => !!s.branches['feature/search'] && repo(s).isAncestor(s.branches.main, s.branches['feature/search']) },
      { text: 'No merge commits on feature/search', check: (s) => !!s.branches['feature/search'] && repo(s).reachable([s.branches['feature/search']]).every((c) => c.parents.length < 2) },
    ],
    hints: ['You are on feature/search.', '`git rebase main`'],
    solution: ['git rebase main'],
    guide: 'rebase-basics',
  },
  {
    id: 'undo-commit',
    world: 'Undo',
    title: 'Oops, wrong commit',
    difficulty: 1,
    xp: 90,
    story: 'You committed too early: the last commit "WIP" should not exist. Remove it, but KEEP the changes so you can keep working.',
    setup: ['git init', 'echo "v1" > app.js', 'git add .', 'git commit -m "Initial"', 'echo "half done" >> app.js', 'git commit -am "WIP"'],
    goals: [
      { text: 'The WIP commit is gone from main', check: (s) => !msgs(s).includes('WIP') },
      { text: 'Your change is still in app.js', check: (s) => s.work['app.js'] === 'v1\nhalf done' },
    ],
    hints: ['`git reset` moves the branch back.', '`--soft` or the default `--mixed` keeps changes. `--hard` would delete them!', '`git reset --soft HEAD~1`'],
    solution: ['git reset --soft HEAD~1'],
    guide: 'undo-last-commit',
  },
  {
    id: 'amend-message',
    world: 'Undo',
    title: 'Typo in the message',
    difficulty: 1,
    xp: 70,
    story: 'The last commit message says "Fix lgoin bug". Change it to exactly "Fix login bug" (it has not been pushed yet).',
    setup: ['git init', 'echo "a" > login.js', 'git add .', 'git commit -m "Initial"', 'echo "b" > login.js', 'git commit -am "Fix lgoin bug"'],
    goals: [
      { text: 'Latest commit message is "Fix login bug"', check: (s) => !!head(s) && s.commits[head(s)!].message === 'Fix login bug' },
      { text: 'Still only 2 commits on main', check: (s) => msgs(s).length === 2 },
    ],
    hints: ['`git commit --amend -m "..."` replaces the last commit.'],
    solution: ['git commit --amend -m "Fix login bug"'],
    guide: 'amend-last-commit',
  },
  {
    id: 'revert-pushed',
    world: 'Undo',
    title: 'Undo a pushed commit safely',
    difficulty: 2,
    xp: 120,
    story: 'A bad commit "Break checkout" is already on GitHub and teammates pulled it. Undo it WITHOUT rewriting history, then push.',
    setup: [
      `git clone ${URL}`,
      'echo "checkout ok" > checkout.js',
      'git add .',
      'git commit -m "Add checkout"',
      'echo "checkout broken" > checkout.js',
      'git commit -am "Break checkout"',
      'git push',
    ],
    goals: [
      { text: 'checkout.js says "checkout ok" again', check: (s) => repo(s).headTree()['checkout.js'] === 'checkout ok' },
      { text: '"Break checkout" is still in history (no rewrite)', check: (s) => msgs(s).includes('Break checkout') },
      { text: 'The fix is pushed to origin/main', check: (s) => !!s.servers[URL] && s.servers[URL].branches.main === head(s) },
    ],
    hints: ['`git revert` creates a new commit that undoes another.', '`git revert HEAD --no-edit` then `git push`'],
    solution: ['git revert HEAD --no-edit', 'git push'],
    guide: 'revert-a-pushed-commit',
  },
  {
    id: 'reflog-rescue',
    world: 'Undo',
    title: 'Lost and found',
    difficulty: 3,
    xp: 180,
    story: 'Someone ran `git reset --hard HEAD~2` and the commits "Add payments" and "Add invoices" vanished. Bring them back onto main.',
    setup: [
      'git init',
      'echo "shop" > app.js',
      'git add .',
      'git commit -m "Initial"',
      'echo "pay" > payments.js',
      'git add .',
      'git commit -m "Add payments"',
      'echo "inv" > invoices.js',
      'git add .',
      'git commit -m "Add invoices"',
      'git reset --hard HEAD~2',
    ],
    goals: [
      { text: 'main contains "Add invoices" again', check: (s) => msgs(s).includes('Add invoices') },
      { text: 'invoices.js is back on disk', check: (s) => 'invoices.js' in s.work },
    ],
    hints: ['`git reflog` lists where HEAD has been.', 'Find the line with "commit: Add invoices" and copy its id.', '`git reset --hard <id>`, or `git reset --hard HEAD@{1}` style refs (use the id here).'],
    solution: ['__REFLOG_INVOICES__'],
    guide: 'recover-with-reflog',
  },
  {
    id: 'stash-hotfix',
    world: 'Undo',
    title: 'Hotfix interrupt',
    difficulty: 2,
    xp: 130,
    story: 'You are halfway through search.js on main when production breaks. Park your work, commit the hotfix "price=10" to price.txt, then bring your work back.',
    setup: ['git init', 'echo "price=0" > price.txt', 'echo "search v1" > search.js', 'git add .', 'git commit -m "Initial"', 'echo "search v2 half done" > search.js'],
    goals: [
      { text: 'A commit fixes price.txt to "price=10"', check: (s) => repo(s).headTree()['price.txt'] === 'price=10' },
      { text: 'The hotfix commit does NOT include your half-done search.js', check: (s) => repo(s).headTree()['search.js'] === 'search v1' },
      { text: 'Your work is back in search.js', check: (s) => s.work['search.js'] === 'search v2 half done' },
      { text: 'Stash is empty', check: (s) => s.stash.length === 0 },
    ],
    hints: ['`git stash` parks your changes.', 'Fix, `git commit -am "Hotfix price"`.', '`git stash pop` brings work back.'],
    solution: ['git stash', 'echo "price=10" > price.txt', 'git commit -am "Hotfix price"', 'git stash pop'],
    guide: 'stash-work-in-progress',
  },
  {
    id: 'first-push',
    world: 'Teamwork',
    title: 'Publish to GitHub',
    difficulty: 1,
    xp: 90,
    story: `You created an empty GitHub repo at ${URL}. Connect it as origin and push main so future \`git push\` just works.`,
    setup: ['git init', 'echo "# shop" > README.md', 'git add .', 'git commit -m "Initial"'],
    goals: [
      { text: 'origin points to the GitHub repo', check: (s) => s.remotes.origin === URL },
      { text: 'main is on GitHub', check: (s) => !!s.servers[URL]?.branches.main && s.servers[URL].branches.main === s.branches.main },
      { text: 'main tracks origin/main', check: (s) => s.upstream.main === 'origin/main' },
    ],
    hints: [`\`git remote add origin ${URL}\``, '`git push -u origin main` (the -u sets tracking)'],
    solution: [`git remote add origin ${URL}`, 'git push -u origin main'],
    guide: 'push-to-github',
  },
  {
    id: 'rejected-push',
    world: 'Teamwork',
    title: 'Rejected!',
    difficulty: 2,
    xp: 150,
    story: 'A teammate pushed while you were working, so your push gets rejected. Get their work, keep yours, and push both. (Do not force-push.)',
    setup: [`git clone ${URL}`, 'teammate push "Teammate: add tests" tests.js', 'echo "mine" > feature.js', 'git add .', 'git commit -m "My feature"'],
    goals: [
      { text: 'Teammate commit is still on origin/main', check: (s) => !!s.servers[URL] && repo(s).reachable([s.servers[URL].branches.main]).some((c) => c.message === 'Teammate: add tests') },
      { text: 'Your commit is on origin/main', check: (s) => !!s.servers[URL] && repo(s).reachable([s.servers[URL].branches.main]).some((c) => c.message === 'My feature') },
      { text: 'Local main equals origin/main', check: (s) => !!s.servers[URL] && s.servers[URL].branches.main === s.branches.main },
    ],
    hints: ['Try `git push` to see the rejection.', '`git pull` (or `git pull --rebase` for a straight line).', 'Then `git push`.'],
    solution: ['git pull --rebase', 'git push'],
    guide: 'fetch-vs-pull',
  },
  {
    id: 'squash',
    world: 'Rewrite',
    title: 'Squash the noise',
    difficulty: 2,
    xp: 150,
    story: 'Your branch has 3 messy commits ("wip", "wip 2", "fix typo"). Before opening a PR, turn them into ONE commit called "Add newsletter form".',
    setup: [
      'git init',
      'echo "home" > index.html',
      'git add .',
      'git commit -m "Initial"',
      'git switch -c feature/newsletter',
      'echo "form" > form.html',
      'git add .',
      'git commit -m "wip"',
      'echo "form v2" > form.html',
      'git commit -am "wip 2"',
      'echo "form v3" > form.html',
      'git commit -am "fix typo"',
    ],
    goals: [
      { text: 'Exactly 2 commits on the branch (Initial + yours)', check: (s) => msgs(s).length === 2 },
      { text: 'Your commit is called "Add newsletter form"', check: (s) => !!head(s) && s.commits[head(s)!].message === 'Add newsletter form' },
      { text: 'form.html has the final content', check: (s) => repo(s).headTree()['form.html'] === 'form v3' },
    ],
    hints: ['Interactive rebase works, but the simplest squash is a soft reset.', '`git reset --soft HEAD~3` keeps all changes staged.', 'Then `git commit -m "Add newsletter form"`'],
    solution: ['git reset --soft HEAD~3', 'git commit -m "Add newsletter form"'],
    guide: 'squash-commits',
  },
  {
    id: 'remove-secret',
    world: 'Rewrite',
    title: 'Scrub the leaked key',
    difficulty: 3,
    xp: 250,
    story: `secret.txt with an API key was committed and pushed to ${URL} weeks ago. (You already rotated the key!) Remove secret.txt from EVERY commit and update GitHub.`,
    setup: [
      `git clone ${URL}`,
      'echo "API_KEY=sk_live_123" > secret.txt',
      'echo "config" > config.js',
      'git add .',
      'git commit -m "Add config"',
      'echo "more" >> README.md',
      'git commit -am "Docs"',
      'git push',
    ],
    goals: [
      { text: 'No commit on main contains secret.txt', check: (s) => !!head(s) && repo(s).reachable([head(s)!]).every((c) => !('secret.txt' in c.tree)) },
      { text: 'GitHub main has no secret.txt anywhere', check: (s) => !!s.servers[URL] && repo(s).reachable([s.servers[URL].branches.main]).every((c) => !('secret.txt' in c.tree)) },
      { text: 'config.js survived', check: (s) => 'config.js' in repo(s).headTree() },
      { text: 'secret.txt is in .gitignore', check: (s) => (repo(s).headTree()['.gitignore'] ?? '').includes('secret.txt') },
    ],
    hints: [
      '`git filter-repo --invert-paths --path secret.txt --force` rewrites every commit.',
      'filter-repo removes origin on purpose: `git remote add origin ' + URL + '`',
      'Add `secret.txt` to .gitignore and commit it.',
      '`git push --force --all` replaces GitHub history.',
    ],
    solution: [
      'git filter-repo --invert-paths --path secret.txt --force',
      'echo "secret.txt" > .gitignore',
      'git add .gitignore',
      'git commit -m "Ignore secret files"',
      `git remote add origin ${URL}`,
      'git push --force --all',
    ],
    guide: 'remove-secrets-from-history',
  },
]

export const worlds = ['Basics', 'Branches', 'Undo', 'Teamwork', 'Rewrite'] as const

export function goalStatus(c: Challenge, s: RepoState) {
  return c.goals.map((g) => {
    try {
      return g.check(s)
    } catch {
      return false
    }
  })
}

export { clean }
