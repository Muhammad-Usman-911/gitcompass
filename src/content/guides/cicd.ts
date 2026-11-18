import type { Guide } from '../types'

// CI/CD learning path: from "what is a pipeline?" to deployments and releases.
// Note: YAML lives in template literals, so every GitHub expression is written
// as \${{ ... }} to stop TypeScript from interpolating it.

export const cicdGuides: Guide[] = [
  {
    id: 'what-is-ci-cd',
    title: 'What is CI/CD?',
    path: 'cicd',
    order: 1,
    level: 'beginner',
    summary: 'Understand what a pipeline is and the difference between continuous integration, delivery and deployment.',
    keywords: ['what is ci', 'what is cd', 'pipeline', 'continuous integration', 'continuous delivery', 'continuous deployment', 'ci vs cd', 'devops basics'],
    whenToUse: [
      'You keep hearing "the pipeline failed" and want to know what that means.',
      'You want every push to be tested automatically instead of "it works on my machine".',
      'You want to ship to users without manual copy-and-upload steps.',
    ],
    explain: [
      'A **pipeline** is a script that a server runs for you every time something happens in your repo, usually a push or a pull request. It checks out your code on a fresh machine, installs dependencies, runs lint and tests, builds the app, and maybe deploys it. If any step fails, the pipeline stops and shows a red cross.',
      '**Continuous integration (CI)** means everyone merges small changes often, and every change is built and tested automatically. **Continuous delivery** goes one step further: every change that passes CI produces something ready to release, and a human clicks a button to ship it. **Continuous deployment** removes the button: every green change on `main` goes to production automatically.',
      'On GitHub the pipeline tool is **GitHub Actions**. Pipelines are YAML files in `.github/workflows/`, so they are versioned and reviewed like the rest of your code.',
    ],
    steps: [
      { text: 'Picture the flow: a developer pushes, CI runs checks, CD ships the result.', code: 'push / pull request\n  -> CI: checkout, install, lint, test, build\n  -> CD: deploy to staging -> (approve) -> production' },
      { text: 'Start with CI only. A pipeline that runs your tests on every pull request already catches most mistakes before they reach `main`.' },
      { text: 'Add delivery once CI is stable: build an artifact (a bundle, a Docker image, an installer) on every green `main` commit.' },
      { text: 'Automate deployment last, when your tests are good enough that you trust them to guard production.' },
    ],
    tips: [
      'Keep pipelines fast. Under 10 minutes keeps people waiting for the result instead of ignoring it.',
      'A red pipeline on `main` is everyone\'s problem: fix it or revert before doing anything else.',
      'Pair CI with a protected `main` branch so a pull request cannot merge until checks pass.',
    ],
    related: ['github-actions-basics', 'first-workflow', 'protect-main-branch', 'branching-strategies'],
  },
  {
    id: 'github-actions-basics',
    title: 'GitHub Actions vocabulary',
    path: 'cicd',
    order: 2,
    level: 'beginner',
    summary: 'Learn the words workflow, event, job, step, runner and action, and how they fit together.',
    keywords: ['github actions', 'workflow vs job', 'what is a runner', 'what is an action', 'on trigger', 'workflow_dispatch', 'schedule cron', 'actions yaml'],
    whenToUse: [
      'You are reading a workflow file and the terms are confusing.',
      'You need to choose which events should start your pipeline.',
      'You want to understand why jobs run in parallel but steps run in order.',
    ],
    explain: [
      'A **workflow** is one YAML file in `.github/workflows/`. An **event** (the `on:` key) decides when it runs: `push`, `pull_request`, `workflow_dispatch` (a "Run workflow" button), or `schedule` (cron). A workflow has one or more **jobs**; jobs run **in parallel** by default, each on its own fresh **runner** (a virtual machine such as `ubuntu-latest`).',
      'A job is a list of **steps** that run **in order** on the same runner, so they share files. A step either runs shell commands (`run:`) or uses an **action** (`uses:`), a reusable package like `actions/checkout@v4`. Use `needs:` to make one job wait for another, for example deploy only after test.',
    ],
    steps: [
      { text: 'This skeleton shows every piece. Read it top to bottom.', code: `name: CI                      # workflow name shown in the Actions tab

on:                           # events that start it
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:          # manual "Run workflow" button
  schedule:
    - cron: '0 3 * * 1'       # every Monday 03:00 UTC

jobs:
  test:                       # job id
    runs-on: ubuntu-latest    # runner
    steps:
      - uses: actions/checkout@v4   # an action
      - run: npm ci                 # a shell command
      - run: npm test

  build:
    needs: test               # waits for "test" to succeed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build` },
      { text: 'Filter events to avoid wasted runs, for example only when source files change.', code: `on:
  push:
    branches: [main]
    paths: ['src/**', 'package.json']` },
      { text: 'Pin actions to a major version (`@v4`) or, for third-party actions, a full commit SHA.' },
    ],
    tips: [
      'Each job starts on a clean machine: files from one job are gone in the next unless you upload an artifact.',
      '`schedule` runs only on the default branch and can be delayed when GitHub is busy.',
      'Public repos get free minutes on GitHub-hosted runners; private repos have a monthly quota.',
    ],
    related: ['what-is-ci-cd', 'first-workflow', 'build-matrix'],
  },
  {
    id: 'first-workflow',
    title: 'Your first workflow',
    path: 'cicd',
    order: 3,
    level: 'beginner',
    summary: 'Create a workflow file, push it, and watch it run in the Actions tab.',
    keywords: ['first github action', 'create workflow', 'hello world action', '.github/workflows', 'actions tab', 'setup-node', 'add ci to repo'],
    whenToUse: [
      'Your repo has no CI yet.',
      'You want to see a green check next to your commits.',
    ],
    explain: [
      'GitHub picks up any `.yml` file in `.github/workflows/` on the branch you push. There is nothing to enable: commit the file and the run appears in the **Actions** tab within seconds.',
    ],
    steps: [
      { text: 'Create the folder and the file.', code: 'mkdir -p .github/workflows\ntouch .github/workflows/ci.yml' },
      { text: 'Paste a minimal Node.js workflow. `actions/setup-node@v4` installs Node and, with `cache: npm`, caches downloaded packages.', code: `name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test` },
      { text: 'Using Python instead? Swap the setup step.', code: `      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -r requirements.txt
      - run: pytest` },
      { text: 'Commit and push it.', code: 'git add .github/workflows/ci.yml\ngit commit -m "Add CI workflow"\ngit push' },
      { text: 'Open the repo on GitHub, click **Actions**, then the run, then the job to see each step\'s log. A green check also appears next to the commit.' },
    ],
    risks: [
      '`npm ci` needs a committed `package-lock.json`; without it the step fails.',
      'YAML is indentation-sensitive. Use spaces, never tabs.',
    ],
    tips: [
      'Add a status badge to your README: Actions → the workflow → "..." → Create status badge.',
      'Use `npm ci`, not `npm install`, in CI: it installs exactly what the lockfile says.',
    ],
    related: ['github-actions-basics', 'run-tests-on-pull-requests', 'caching-dependencies', 'push-to-github'],
  },
  {
    id: 'run-tests-on-pull-requests',
    title: 'Run tests on every pull request',
    path: 'cicd',
    order: 4,
    level: 'beginner',
    summary: 'Run lint and tests on pull requests and block merging until they pass.',
    keywords: ['pr checks', 'required status checks', 'test pull request', 'block merge failing tests', 'pull_request trigger', 'ci on pr', 'lint in ci'],
    whenToUse: [
      'Broken code keeps landing on `main`.',
      'You want reviewers to see test results before they review.',
      'You accept contributions from people outside your team.',
    ],
    explain: [
      'The `pull_request` event runs your workflow against the **merge result** of the PR branch and its target, so you test what `main` will look like after merging. Every new push to the PR runs it again.',
      'A workflow only reports results. To actually block merging, make the job a **required status check** in a branch protection rule or ruleset on `main`.',
    ],
    steps: [
      { text: 'Run on PRs into `main` and on pushes to `main`. Split lint and test into separate jobs so they run in parallel and fail independently.', code: `name: PR checks

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test` },
      { text: 'Open a PR and wait for both checks to finish once, so GitHub knows their names.' },
      { text: 'Go to **Settings → Rules → Rulesets** (or Branches → branch protection), target `main`, enable **Require status checks to pass**, and add `lint` and `test`.' },
    ],
    risks: [
      'If you rename a job, the required check with the old name waits forever. Update the rule too.',
      'A workflow skipped by `paths:` filters never reports, which can also leave a required check pending.',
    ],
    tips: [
      'Keep job names short and stable: they become the check names.',
      'Avoid `pull_request_target` unless you know why you need it: it runs with write access and secrets on code from forks.',
    ],
    related: ['open-a-pull-request', 'review-a-pull-request', 'protect-main-branch', 'build-matrix'],
  },
  {
    id: 'build-matrix',
    title: 'Test many versions with a matrix',
    path: 'cicd',
    order: 5,
    level: 'intermediate',
    summary: 'Run the same job across several Node, Python or OS versions with strategy.matrix.',
    keywords: ['matrix build', 'strategy matrix', 'test multiple node versions', 'test on windows and mac', 'fail-fast', 'cross platform ci'],
    whenToUse: [
      'Your library supports several runtime versions.',
      'Your app must work on Linux, Windows and macOS.',
    ],
    explain: [
      'A `strategy.matrix` turns one job definition into many. Every combination of the listed values becomes its own job, running in parallel. Inside steps you read the current value with `${{ matrix.<name> }}`.',
      'By default `fail-fast: true` cancels the other combinations as soon as one fails. Turn it off when you want to see every failure.',
    ],
    steps: [
      { text: 'Two Node versions times three operating systems gives six jobs.', code: `jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test` },
      { text: 'Skip or add single combinations with `exclude` and `include`.', code: `      matrix:
        node: [20, 22]
        os: [ubuntu-latest, windows-latest]
        exclude:
          - os: windows-latest
            node: 20
        include:
          - os: ubuntu-latest
            node: 24
            experimental: true` },
      { text: 'Let an experimental combination fail without failing the run.', code: '    continue-on-error: ${{ matrix.experimental == true }}' },
    ],
    tips: [
      'macOS and Windows runners cost more minutes on private repos. Run the full matrix on `main` and only Linux on PRs if minutes matter.',
      'Required status checks use the full job name, such as `test (22, ubuntu-latest)`.',
    ],
    related: ['run-tests-on-pull-requests', 'caching-dependencies', 'github-actions-basics'],
  },
  {
    id: 'caching-dependencies',
    title: 'Cache dependencies for faster runs',
    path: 'cicd',
    order: 6,
    level: 'intermediate',
    summary: 'Speed up workflows by caching npm, pip or other downloads between runs.',
    keywords: ['actions cache', 'cache node_modules', 'cache pip', 'slow ci', 'speed up github actions', 'setup-node cache', 'cache key hashFiles'],
    whenToUse: [
      'Installing dependencies takes most of your pipeline time.',
      'You download the same packages on every run.',
    ],
    explain: [
      'Each run starts on a clean machine, so without a cache every run downloads every package again. A cache is saved under a **key**. If a later run asks for the same key, the files are restored instead of downloaded.',
      'Good keys include a hash of the lockfile, so the cache refreshes exactly when dependencies change. The easiest option is the built-in `cache:` input of the setup actions; use `actions/cache@v4` for anything else.',
    ],
    steps: [
      { text: 'Easiest: let the setup action cache for you.', code: `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm          # or yarn / pnpm

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip` },
      { text: 'Custom cache with `actions/cache@v4`, for example a build tool cache.', code: `      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ hashFiles('package-lock.json') }}
          restore-keys: |
            playwright-\${{ runner.os }}-` },
      { text: 'Check the step log: "Cache restored from key ..." means a hit; "Cache not found" means a miss and a save at the end of the job.' },
    ],
    risks: [
      'Never cache secrets or build outputs that should be fresh; a stale cache can hide a real bug.',
      'Caching `node_modules` directly can break across Node versions. Cache the npm download folder (what `cache: npm` does) instead.',
    ],
    tips: [
      'Caches unused for 7 days are deleted, and each repo has a total size limit (10 GB by default).',
      'Manage or delete caches under Actions → Caches.',
    ],
    related: ['first-workflow', 'build-matrix', 'debugging-workflows'],
  },
  {
    id: 'secrets-in-actions',
    title: 'Secrets, GITHUB_TOKEN and permissions',
    path: 'cicd',
    order: 7,
    level: 'intermediate',
    summary: 'Store API keys safely, use them in workflows, and give the built-in token only the permissions it needs.',
    keywords: ['github secrets', 'secrets in actions', 'GITHUB_TOKEN', 'workflow permissions', 'api key in ci', 'secrets fork pull request', 'environment variables actions'],
    whenToUse: [
      'A workflow needs an API key, a deploy token or a password.',
      'A step fails with "Resource not accessible by integration".',
      'You want to lock down what your workflows can do.',
    ],
    explain: [
      'Secrets are encrypted values stored in **Settings → Secrets and variables → Actions**. A workflow reads them with `${{ secrets.NAME }}`, and GitHub masks them as `***` in logs. Non-secret settings go in **variables** (`${{ vars.NAME }}`).',
      'Every run also gets a temporary `GITHUB_TOKEN` (`${{ secrets.GITHUB_TOKEN }}`) that can act on this repo and expires when the job ends. The `permissions:` key decides what it may do. Set the minimum, such as `contents: read`, and grant more only to the jobs that need it.',
      'For safety, secrets are **not** passed to workflows triggered by pull requests from **forks**, and the token is read-only there. Otherwise anyone could open a PR that prints your keys.',
    ],
    steps: [
      { text: 'Add a secret on GitHub, or with the GitHub CLI.', code: 'gh secret set DEPLOY_TOKEN\n# paste the value when prompted' },
      { text: 'Pass it to a step through `env:`, not inline in the command.', code: `jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh
        env:
          API_KEY: \${{ secrets.DEPLOY_TOKEN }}` },
      { text: 'Set safe defaults at the top of the workflow and widen per job.', code: `permissions:
  contents: read          # default for every job

jobs:
  release:
    permissions:
      contents: write     # this job may create releases
    runs-on: ubuntu-latest
    steps:
      - run: gh release list
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GH_REPO: \${{ github.repository }}` },
    ],
    risks: [
      'Never `echo` a secret or write it to a file you upload as an artifact. Masking is not perfect (for example base64 of a secret is not masked).',
      'A leaked secret must be rotated at the provider. Deleting it from GitHub does not make it safe again.',
    ],
    undo: [
      'Leaked a key in a log? Revoke it at the provider, create a new one, update the secret, then delete the run logs (run page → "..." → Delete all logs).',
    ],
    tips: [
      'Set the repo default to read-only: Settings → Actions → General → Workflow permissions.',
      'Prefer OIDC (`permissions: id-token: write`) for cloud providers that support it, so there is no long-lived key to leak.',
    ],
    related: ['github-security-basics', 'deploy-with-actions', 'environments-and-approvals'],
  },
  {
    id: 'deploy-with-actions',
    title: 'Deploy with GitHub Actions',
    path: 'cicd',
    order: 8,
    level: 'intermediate',
    summary: 'Deploy a site to GitHub Pages, Vercel or Render automatically after tests pass.',
    keywords: ['deploy github actions', 'github pages action', 'deploy-pages', 'vercel deploy ci', 'render deploy hook', 'continuous deployment', 'auto deploy on push'],
    whenToUse: [
      'You deploy by hand and want it to happen on every push to `main`.',
      'You want deploys to run only after tests pass.',
    ],
    explain: [
      'A deploy job is just another job that `needs:` your test job and runs only on `main`. For **GitHub Pages**, one job builds and uploads the site with `actions/upload-pages-artifact`, and a second job publishes it with `actions/deploy-pages`, which needs `pages: write` and `id-token: write` permissions.',
      'Hosts like **Vercel** and **Render** can deploy by themselves from Git. Use Actions when you want your tests to gate the deploy: call the host\'s **deploy hook** URL or its CLI from a job.',
    ],
    steps: [
      { text: 'GitHub Pages: in Settings → Pages set **Source** to **GitHub Actions**, then add this workflow.', code: `name: Deploy Pages
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4` },
      { text: 'Render: copy the service\'s **Deploy Hook** URL into a secret named `RENDER_DEPLOY_HOOK`, then call it after tests.', code: `  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "\${{ secrets.RENDER_DEPLOY_HOOK }}"` },
      { text: 'Vercel: create a token, add `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets, and deploy with the CLI.', code: `  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    env:
      VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g vercel
      - run: vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
      - run: vercel build --prod --token="$VERCEL_TOKEN"
      - run: vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"` },
    ],
    risks: [
      'If the host also auto-deploys from Git, you deploy twice. Turn off the host\'s Git auto-deploy when Actions deploys.',
      'A Vite site served from `https://<user>.github.io/<repo>/` needs `base: \'/<repo>/\'` in `vite.config`, or assets 404.',
    ],
    undo: [
      'Roll back by reverting the bad commit on `main` (`git revert <sha>` then push): the pipeline redeploys the previous code.',
      'Vercel and Render also let you promote or redeploy an older deployment from their dashboards.',
    ],
    tips: [
      'Deploy hooks are secret URLs: anyone with the URL can trigger a deploy. Keep them in secrets.',
      'Use `concurrency` so two deploys never run at the same time.',
    ],
    related: ['publish-with-github-pages', 'secrets-in-actions', 'environments-and-approvals', 'run-tests-on-pull-requests'],
  },
  {
    id: 'environments-and-approvals',
    title: 'Environments and deployment approvals',
    path: 'cicd',
    order: 9,
    level: 'advanced',
    summary: 'Use environments to separate staging from production and require a human approval before production deploys.',
    keywords: ['github environments', 'required reviewers', 'deployment approval', 'staging production', 'manual approval actions', 'environment secrets', 'deployment protection rules'],
    whenToUse: [
      'Staging and production need different secrets or URLs.',
      'Someone must approve before production changes.',
      'You want a deploy history per environment on GitHub.',
    ],
    explain: [
      'An **environment** (Settings → Environments) is a named target such as `staging` or `production`. It can hold its own secrets and variables, and **protection rules**: required reviewers, a wait timer, and which branches or tags may deploy to it.',
      'A job opts in with `environment: production`. When that job is reached, the run pauses until a required reviewer clicks **Approve**. Environment secrets are only given to the job after the rules pass.',
    ],
    steps: [
      { text: 'Create `staging` and `production` in Settings → Environments. On `production`, add **Required reviewers** and limit **Deployment branches** to `main`.' },
      { text: 'Chain the jobs: staging deploys automatically, production waits for approval.', code: `jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: ./deploy.sh
        env:
          DEPLOY_URL: \${{ vars.DEPLOY_URL }}
          TOKEN: \${{ secrets.DEPLOY_TOKEN }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
        env:
          DEPLOY_URL: \${{ vars.DEPLOY_URL }}
          TOKEN: \${{ secrets.DEPLOY_TOKEN }}` },
      { text: 'Push to `main`. The run shows "Waiting for review"; a reviewer opens it, clicks **Review deployments**, and approves.' },
    ],
    risks: [
      'Required reviewers on environments in private repos need a paid plan (Pro, Team or Enterprise); public repos have them for free.',
      'A pending approval times out after 30 days and the job fails.',
    ],
    tips: [
      'Use the same secret names in each environment (`DEPLOY_TOKEN`) so the workflow stays identical and only the environment changes.',
      'Enable "Prevent self-review" so the person who pushed cannot approve their own deploy.',
    ],
    related: ['deploy-with-actions', 'secrets-in-actions', 'protect-main-branch'],
  },
  {
    id: 'release-automation',
    title: 'Automate releases on tag push',
    path: 'cicd',
    order: 10,
    level: 'advanced',
    summary: 'Build artifacts and publish a GitHub Release automatically when you push a version tag.',
    keywords: ['release on tag', 'automate github release', 'tag push workflow', 'action-gh-release', 'gh release create', 'publish binaries', 'semantic version tag'],
    whenToUse: [
      'You publish installers, binaries or zip files with each version.',
      'You want release notes and assets created the same way every time.',
    ],
    explain: [
      'A workflow with `on: push: tags: [\'v*\']` runs only when you push a tag such as `v1.2.0`. It builds your files, then creates a **GitHub Release** for that tag and attaches them. The job needs `permissions: contents: write`.',
      'You can create the release with the preinstalled `gh` CLI (`gh release create`) or with the popular `softprops/action-gh-release` action. Both can generate notes from the merged PRs since the last tag.',
    ],
    steps: [
      { text: 'Add the release workflow.', code: `name: Release
on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - run: tar -czf app-\${{ github.ref_name }}.tar.gz dist
      - run: gh release create "\${{ github.ref_name }}" app-*.tar.gz --generate-notes
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}` },
      { text: 'Or use the action instead of the `gh` step.', code: `      - uses: softprops/action-gh-release@v2
        with:
          files: app-*.tar.gz
          generate_release_notes: true` },
      { text: 'Tag a commit on `main` and push the tag to trigger it.', code: 'git switch main\ngit pull\ngit tag -a v1.2.0 -m "v1.2.0"\ngit push origin v1.2.0' },
    ],
    risks: [
      'Pushing a tag cannot be "undone" for people who already fetched it. Do not reuse a version number.',
      'Tags pushed with the `GITHUB_TOKEN` from another workflow do not trigger new workflows (to prevent loops).',
    ],
    undo: [
      'Delete a wrong release and tag, then tag the right commit with a new version.',
      'gh release delete v1.2.0 --cleanup-tag  (deletes the release and the remote tag; also run git tag -d v1.2.0 locally)',
    ],
    tips: [
      'Mark versions like `v2.0.0-rc.1` as pre-releases with `--prerelease` (or `prerelease: true`).',
      'Check that the tag matches `package.json` in a step, and fail early if it does not.',
    ],
    related: ['tags-and-releases-git', 'github-releases', 'secrets-in-actions', 'deploy-with-actions'],
  },
  {
    id: 'debugging-workflows',
    title: 'Debug a failing workflow',
    path: 'cicd',
    order: 11,
    level: 'advanced',
    summary: 'Find out why a workflow fails using logs, debug logging, local runs with act, and safer workflow settings.',
    keywords: ['workflow failed', 'debug github actions', 'ACTIONS_STEP_DEBUG', 'act run locally', 're-run failed jobs', 'cancel old runs concurrency', 'workflow not triggering', 'continue-on-error'],
    whenToUse: [
      'A check is red and the error is not obvious.',
      'The workflow does not start at all.',
      'Tests pass locally but fail in CI.',
    ],
    explain: [
      'Most failures are visible in the log of the **first red step**. Open the run, click the failed job, and expand that step. "Works locally, fails in CI" usually means a missing environment variable or secret, a different runtime version, an uncommitted file, or case-sensitive file paths on Linux.',
      'If the workflow never starts, check the trigger: the file must be in `.github/workflows/` on the branch that receives the event, the YAML must be valid (the Actions tab shows syntax errors), and `branches:` or `paths:` filters must match.',
    ],
    steps: [
      { text: 'Re-run with debug logging: on the run page click **Re-run jobs → Enable debug logging**. To make it permanent, add a repository variable or secret `ACTIONS_STEP_DEBUG` set to `true`.' },
      { text: 'Print context to see what the runner sees (never print secrets).', code: `      - run: |
          node --version
          echo "ref=\${{ github.ref }} event=\${{ github.event_name }}"
          ls -la` },
      { text: 'Run the workflow on your machine with `act` (needs Docker).', code: '# install: https://github.com/nektos/act\nact -l                 # list jobs\nact pull_request -j test' },
      { text: 'Let a flaky, non-critical step fail without failing the job.', code: `      - run: npm run e2e
        continue-on-error: true` },
      { text: 'Cancel outdated runs when you push again to the same branch.', code: `concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true` },
      { text: 'Re-run from the terminal with the GitHub CLI.', code: 'gh run list --limit 5\ngh run view <run-id> --log-failed\ngh run rerun <run-id> --failed' },
    ],
    risks: [
      '`continue-on-error` hides real failures if you overuse it. Keep it for genuinely optional steps.',
      'Do not use `cancel-in-progress: true` on deploy workflows: cancelling a deploy halfway can leave a broken site.',
    ],
    tips: [
      'Add `timeout-minutes: 15` to jobs so a hung step does not burn 6 hours of minutes.',
      '`act` is close to GitHub but not identical: some actions and services behave differently locally.',
    ],
    related: ['github-actions-basics', 'caching-dependencies', 'secrets-in-actions', 'first-workflow'],
  },
]
