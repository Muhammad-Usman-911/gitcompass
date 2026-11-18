export interface TourStep {
  /** CSS selector of the element to point at (optional). */
  target?: string
  text: string
}

const tours: { match: (path: string) => boolean; steps: TourStep[] }[] = [
  {
    match: (p) => p === '/',
    steps: [
      { text: "Hi, I'm **Compass** 🧭, your Git guide. Want a 30-second tour? Press Next." },
      { target: '[data-tour="hero-search"]', text: 'Search anything here, like “rewrite git history” or “undo commit”. Shortcut: `Ctrl K` or `/`.' },
      { target: '[data-tour="hero-demo"]', text: 'This is a live git simulator. Every command animates the commit graph.' },
      { target: '[data-tour="paths"]', text: 'Pick where to start: from zero, branching, remotes, fixing mistakes, GitHub, or CI/CD.' },
      { target: '[data-tour="nav"]', text: 'The Playground, Challenges, GitHub settings tour and CI/CD lab live up here. Have fun!' },
    ],
  },
  {
    match: (p) => p.startsWith('/learn'),
    steps: [{ target: '[data-tour="path-tabs"]', text: 'Filter by path. Guides go from easy to advanced, and finished ones get a check mark.' }],
  },
  {
    match: (p) => p.startsWith('/guide/'),
    steps: [
      { text: 'Every guide has the same shape: when to use it, how it works, an animated demo, exact steps, risks and how to undo.' },
      { target: '#demo', text: 'Press **Play** to watch Git change history step by step. “Try it yourself” opens it in the playground.' },
      { target: '#steps', text: 'Copy any command with the button on the right of the code block.' },
    ],
  },
  {
    match: (p) => p.startsWith('/playground'),
    steps: [
      { target: '[data-tour="terminal"]', text: 'Type git commands here. `↑` for history, `Tab` to complete, `help` for the full list.' },
      { target: '[data-tour="graph"]', text: 'Each circle is a commit. Labels show branches, `HEAD` and `origin/…`. Hover a commit for details.' },
    ],
  },
  {
    match: (p) => p.startsWith('/challenges/'),
    steps: [{ target: '[data-tour="goals"]', text: 'Goals tick off live as you type. Stuck? Ask for a hint. Every level has a guide too.' }],
  },
  {
    match: (p) => p === '/challenges',
    steps: [{ text: 'Pick any level. Solve it to earn XP and climb from **Newcomer** to **History Wizard**!' }],
  },
  {
    match: (p) => p.startsWith('/github'),
    steps: [{ target: '[data-tour="settings-nav"]', text: 'This mirrors the Settings sidebar of a GitHub repository. Click any item to learn what it does and how to set it up.' }],
  },
  {
    match: (p) => p.startsWith('/cicd'),
    steps: [{ target: '[data-tour="pipeline"]', text: 'Press **Push & run** to watch a pipeline. Tick “Push a bug” to see CI block a broken deploy.' }],
  },
  {
    match: (p) => p.startsWith('/commands'),
    steps: [{ text: 'Every command with its useful flags. Red cards can destroy work: read the linked guide first.' }],
  },
]

export function tourFor(path: string): TourStep[] {
  return tours.find((t) => t.match(path))?.steps ?? [{ text: 'Lost? Ask me anything below, and I will search for it.' }]
}
