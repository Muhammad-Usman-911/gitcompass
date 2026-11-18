import type { AnnotatedWorkflow } from './types'

// Complete, annotated GitHub Actions workflows for the CI/CD explorer.
// `yaml` is a template literal, so GitHub expressions are written as \${{ ... }}.
// Annotation line numbers are 1-based and inclusive; keep them in sync with `yaml`.

export const workflows: AnnotatedWorkflow[] = [
  {
    id: 'node-ci',
    title: 'Node.js CI',
    summary: 'Lint, test and build a Node.js project on every push and pull request, on Node 20 and 22, with npm caching.',
    file: '.github/workflows/ci.yml',
    yaml: `name: Node CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Lint, test, build (Node \${{ matrix.node }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build`,
    annotations: [
      { from: 1, to: 1, title: "Workflow name", text: "The name shown in the Actions tab and in the list of checks on a pull request." },
      { from: 3, to: 7, title: "Triggers", text: "Runs on every push to `main` and on every pull request that targets `main`. PR runs test the merge result, so you see what `main` will look like after merging." },
      { from: 9, to: 10, title: "Least privilege", text: "The built-in `GITHUB_TOKEN` can only read the repo. CI never needs to write, so a compromised dependency cannot push code or create releases." },
      { from: 12, to: 14, title: "Cancel outdated runs", text: "One group per workflow and branch. When you push again to the same branch, the older run still in progress is cancelled, saving minutes and giving faster feedback." },
      { from: 16, to: 20, title: "The job", text: "One job called `test` on a fresh Ubuntu runner. `name` sets the check name per matrix entry. `timeout-minutes` stops a hung run long before the 6-hour default." },
      { from: 21, to: 25, title: "Matrix", text: "Runs the whole job twice in parallel, once on Node 20 and once on Node 22. `fail-fast: false` lets both finish so you see every failure, not just the first." },
      { from: 26, to: 27, title: "Check out code", text: "`actions/checkout@v4` clones your repo at the commit that triggered the run. Without it the runner has no code." },
      { from: 29, to: 33, title: "Set up Node with cache", text: "Installs the Node version from the matrix. `cache: npm` saves the npm download cache keyed on `package-lock.json`, so later runs install much faster." },
      { from: 35, to: 36, title: "Install", text: "`npm ci` installs exactly what the lockfile says and fails if `package.json` and the lockfile disagree. Always prefer it over `npm install` in CI." },
      { from: 38, to: 45, title: "Lint, test, build", text: "Each check is its own step, so the log shows exactly which one failed. Steps run in order and the job stops at the first failure." },
    ],
  },
  {
    id: 'python-ci',
    title: 'Python CI',
    summary: 'Check style with ruff and run pytest on Python 3.11 and 3.12, with pip caching.',
    file: '.github/workflows/python-ci.yml',
    yaml: `name: Python CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
          cache: pip

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install ruff pytest

      - name: Lint and format check
        run: |
          ruff check .
          ruff format --check .

      - name: Run tests
        run: pytest -q`,
    annotations: [
      { from: 1, to: 6, title: "Name and triggers", text: "Runs on pushes to `main` and on every pull request, whatever branch it targets." },
      { from: 8, to: 9, title: "Read-only token", text: "The `GITHUB_TOKEN` can only read repository contents. Testing never needs more." },
      { from: 11, to: 17, title: "Job and matrix", text: "One `test` job runs twice in parallel, on Python 3.11 and 3.12. Versions are quoted strings: unquoted `3.10` would be read by YAML as the number 3.1." },
      { from: 18, to: 18, title: "Check out code", text: "Clones the repo at the commit being tested." },
      { from: 20, to: 24, title: "Set up Python with pip cache", text: "`actions/setup-python@v5` installs the matrix version. `cache: pip` caches downloaded wheels keyed on your requirements files." },
      { from: 26, to: 30, title: "Install dependencies", text: "A multi-line `run: |` block. Upgrades pip, installs the project requirements, then the tools CI needs. You can move ruff and pytest into a `requirements-dev.txt` instead." },
      { from: 32, to: 35, title: "Lint and format", text: "`ruff check` finds bugs and style issues; `ruff format --check` fails if any file is not formatted, without changing files." },
      { from: 37, to: 38, title: "Run tests", text: "`pytest -q` runs the test suite quietly. A non-zero exit code fails the step and the check." },
    ],
  },
  {
    id: 'deploy-pages',
    title: 'Deploy a Vite site to GitHub Pages',
    summary: 'Build a Vite app and publish it to GitHub Pages on every push to main, with least-privilege permissions and no overlapping deploys.',
    file: '.github/workflows/deploy-pages.yml',
    yaml: `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

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
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build
        run: npm run build -- --base=/\${{ github.event.repository.name }}/

      - name: Upload site
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`,
    annotations: [
      { from: 1, to: 6, title: "Name and triggers", text: "Deploys on every push to `main`, and `workflow_dispatch` adds a \"Run workflow\" button for manual redeploys." },
      { from: 8, to: 11, title: "Pages permissions", text: "`pages: write` lets the job publish to Pages, and `id-token: write` lets `deploy-pages` prove to GitHub (via OIDC) which workflow is deploying. `contents: read` is all the build needs." },
      { from: 13, to: 15, title: "One deploy at a time", text: "All Pages runs share the `pages` group. `cancel-in-progress: false` lets a running deploy finish and queues the next one, so a deploy is never cut off halfway." },
      { from: 17, to: 26, title: "Build job setup", text: "Checks out the code and installs Node 22 with npm caching on a fresh runner." },
      { from: 28, to: 31, title: "Install and build", text: "Vite sites on GitHub Pages live under `/<repo-name>/`, so the build passes `--base` with the repo name. Drop it for a user site (`<user>.github.io`) or a custom domain." },
      { from: 33, to: 36, title: "Upload the site", text: "`actions/upload-pages-artifact@v3` packs the `dist` folder into the special artifact that Pages expects." },
      { from: 38, to: 43, title: "Deploy job", text: "`needs: build` waits for a successful build. The `github-pages` environment records each deployment and shows the live URL, taken from the deploy step output, on the run page." },
      { from: 44, to: 47, title: "Publish", text: "`actions/deploy-pages@v4` publishes the uploaded artifact. The `id` lets line 43 read its `page_url` output. Pages Source must be set to \"GitHub Actions\" in Settings → Pages." },
    ],
  },
  {
    id: 'release-on-tag',
    title: 'Release on tag push',
    summary: 'When a v* tag is pushed, build release files and publish a GitHub Release with generated notes.',
    file: '.github/workflows/release.yml',
    yaml: `name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run build

      - name: Package
        run: |
          tar -czf app-\${{ github.ref_name }}.tar.gz -C dist .
          sha256sum app-*.tar.gz > checksums.txt

      - uses: actions/upload-artifact@v4
        with:
          name: release-files
          path: |
            app-*.tar.gz
            checksums.txt

  publish:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: release-files

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            app-*.tar.gz
            checksums.txt
          generate_release_notes: true
          prerelease: \${{ contains(github.ref_name, '-') }}`,
    annotations: [
      { from: 1, to: 5, title: "Tag trigger", text: "Runs only when a tag starting with `v` is pushed, for example `git push origin v1.2.0`. Normal commits never start it." },
      { from: 7, to: 8, title: "Default permissions", text: "Read-only by default. Only the job that creates the release gets write access (lines 40-41)." },
      { from: 10, to: 23, title: "Build and test", text: "Checks out the tagged commit, installs dependencies with caching, and runs the tests before building, so a broken version is never released." },
      { from: 25, to: 28, title: "Package", text: "`github.ref_name` is the tag name (`v1.2.0`), so the archive is named `app-v1.2.0.tar.gz`. A checksums file lets users verify their download." },
      { from: 30, to: 35, title: "Hand files to the next job", text: "Jobs run on separate machines. `actions/upload-artifact@v4` stores the files so the `publish` job can fetch them." },
      { from: 37, to: 42, title: "Publish job", text: "Waits for `build` to succeed and gets `contents: write`, the permission needed to create a release and upload assets." },
      { from: 43, to: 45, title: "Download the files", text: "`actions/download-artifact@v4` restores the `release-files` artifact into the working directory." },
      { from: 47, to: 54, title: "Create the release", text: "`softprops/action-gh-release@v2` creates a release for the tag, attaches the files, and writes notes from the PRs merged since the last tag. Tags with a dash, like `v2.0.0-rc.1`, become pre-releases." },
    ],
  },
]
