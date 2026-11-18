import type { Guide, PathId } from './types'
import { beginnerGuides } from './guides/beginner'
import { branchingGuides } from './guides/branching'
import { remoteGuides } from './guides/remote'
import { rescueGuides } from './guides/rescue'
import { githubGuides } from './guides/github'
import { cicdGuides } from './guides/cicd'

export { settingsItems } from './githubSettings'
export { commands } from './commands'
export { workflows } from './workflows'

export const guides: Guide[] = [...beginnerGuides, ...branchingGuides, ...remoteGuides, ...rescueGuides, ...githubGuides, ...cicdGuides]

export const guideById = Object.fromEntries(guides.map((g) => [g.id, g])) as Record<string, Guide>

export interface PathInfo {
  id: PathId
  title: string
  tagline: string
  /** Who should start here. */
  forWho: string
  color: string
  icon: string
}

export const paths: PathInfo[] = [
  { id: 'beginner', title: 'Git from zero', tagline: 'What Git is, your first repo, commits and history.', forWho: 'Never used Git', color: '#34d399', icon: 'Sprout' },
  { id: 'branching', title: 'Branching & merging', tagline: 'Branches, merges, conflicts, rebase and team strategies.', forWho: 'Can commit, want to work in parallel', color: '#60a5fa', icon: 'GitBranch' },
  { id: 'remote', title: 'Remotes & GitHub sync', tagline: 'Clone, push, pull, SSH keys, forks and multiple accounts.', forWho: 'Ready to share code', color: '#a78bfa', icon: 'Cloud' },
  { id: 'rescue', title: 'Fix mistakes & rewrite history', tagline: 'Undo, recover, squash, remove secrets, force-push safely.', forWho: 'Something went wrong', color: '#f87171', icon: 'LifeBuoy' },
  { id: 'github', title: 'GitHub features', tagline: 'Pull requests, reviews, issues, releases, Pages, security.', forWho: 'Working on GitHub with others', color: '#fbbf24', icon: 'Github' },
  { id: 'cicd', title: 'CI/CD with GitHub Actions', tagline: 'From “what is a pipeline?” to automated deploys.', forWho: 'Want tests and deploys on autopilot', color: '#f472b6', icon: 'Workflow' },
]

export const pathById = Object.fromEntries(paths.map((p) => [p.id, p])) as Record<PathId, PathInfo>

export const guidesForPath = (id: PathId) => guides.filter((g) => g.path === id).sort((a, b) => a.order - b.order)
