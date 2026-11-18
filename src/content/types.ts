// Content model for Git Compass. All learning content is plain data in TS files,
// so adding a guide = adding one object. Strings support a tiny inline markup:
// `code` and **bold**.

export type PathId = 'beginner' | 'branching' | 'remote' | 'rescue' | 'github' | 'cicd'
export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface Step {
  /** What to do, one sentence or two. */
  text: string
  /** Shell commands for this step (multi-line allowed). Copy button is shown. */
  code?: string
  /** Optional extra note shown under the step (warning, tip). */
  note?: string
}

export interface Guide {
  /** kebab-case slug, unique across all guides. Used in URLs: /guide/<id> */
  id: string
  title: string
  path: PathId
  /** Position inside its learning path (1 = first). */
  order: number
  level: Level
  /** One sentence: what this guide solves. */
  summary: string
  /** Search synonyms: phrases a user might type ("history rewrite", "remove password from repo"). */
  keywords: string[]
  /** Bullet points: situations where you need this. */
  whenToUse: string[]
  /** Short paragraphs explaining how it works under the hood (mental model). */
  explain?: string[]
  /** Ordered step-by-step instructions. */
  steps: Step[]
  /** What can go wrong. */
  risks?: string[]
  /** How to undo / recover if it goes wrong. */
  undo?: string[]
  /** Best-practice tips. */
  tips?: string[]
  /** ids of related guides. */
  related?: string[]
  /**
   * Optional "Watch it" demo replayed in the in-browser git simulator with an
   * animated commit graph. `setup` runs silently first, then `commands` run one
   * by one with animation. ONLY use commands the simulator supports (see CONTENT_GUIDE.md).
   */
  sandbox?: { setup?: string[]; commands: string[] }
}

export type SettingsGroup =
  | 'General'
  | 'Access'
  | 'Code, planning, and automation'
  | 'Security and quality'
  | 'Integrations'

/** One item of the GitHub repository Settings sidebar. */
export interface SettingsItem {
  id: string
  label: string
  group: SettingsGroup
  /** lucide-react icon name, e.g. 'Settings', 'Users', 'GitBranch'. */
  icon: string
  summary: string
  /** Where it is: e.g. "Repo → Settings → Rules → Rulesets". */
  location: string
  whatItIs: string[]
  whenToUse: string[]
  bestPractices: string[]
  howTo: Step[]
  /** Common mistakes / gotchas. */
  pitfalls?: string[]
  keywords: string[]
  /** ids of related guides. */
  relatedGuides?: string[]
}

export interface CommandRef {
  /** e.g. 'git commit' */
  name: string
  category: 'Setup' | 'Snapshot' | 'Branching' | 'Remote' | 'Inspect' | 'Undo' | 'Rewrite' | 'Advanced'
  summary: string
  syntax: string
  flags: { flag: string; desc: string }[]
  examples: { code: string; desc: string }[]
  /** true if it can destroy work or rewrite shared history. */
  danger?: boolean
  /** id of the guide that explains it best. */
  guide?: string
  keywords?: string[]
}

/** An annotated GitHub Actions workflow file for the CI/CD explorer. */
export interface AnnotatedWorkflow {
  id: string
  title: string
  summary: string
  /** File path in the repo, e.g. '.github/workflows/ci.yml' */
  file: string
  yaml: string
  /** 1-based inclusive line ranges into `yaml` with an explanation. */
  annotations: { from: number; to: number; title: string; text: string }[]
}
