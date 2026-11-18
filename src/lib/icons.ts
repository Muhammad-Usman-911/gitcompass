import {
  Asterisk, Blocks, Bot, CirclePlay, Cloud, GitBranch, Github, Globe, KeyRound, LayoutGrid, LifeBuoy, ListChecks,
  Monitor, Server, Settings, ShieldAlert, ShieldCheck, Sprout, Tag, Users, Webhook, Workflow, type LucideIcon,
} from 'lucide-react'

const map: Record<string, LucideIcon> = {
  Asterisk, Blocks, Bot, CirclePlay, PlayCircle: CirclePlay, Cloud, GitBranch, Github, Globe, KeyRound, LayoutGrid,
  LifeBuoy, ListChecks, Monitor, Server, Settings, ShieldAlert, ShieldCheck, Sprout, Tag, Users, Webhook, Workflow,
}

export function iconFor(name: string): LucideIcon {
  return map[name] ?? Settings
}
