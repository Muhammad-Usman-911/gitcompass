import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardCopy, Download, Eye, FileCode2, FileText, GitPullRequest, Sparkles, Tag, Trash2 } from 'lucide-react'
import {
  EXAMPLE_LOG,
  SECTIONS,
  nextVersion,
  normaliseRepoUrl,
  parseCommits,
  renderChangelog,
  renderPrDescription,
  renderReleaseNotes,
  suggestBump,
  type SectionId,
} from '@/lib/changelog'
import { CodeBlock } from '@/components/CodeBlock'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Mode = 'changelog' | 'pr' | 'release'

const MODES: { id: Mode; label: string; icon: typeof FileText; hint: string }[] = [
  { id: 'changelog', label: 'CHANGELOG.md', icon: FileText, hint: 'A version section in the Keep a Changelog format. Paste it at the top of CHANGELOG.md.' },
  { id: 'pr', label: 'PR description', icon: GitPullRequest, hint: 'A pull request description: summary, grouped changes, how to test and a checklist.' },
  { id: 'release', label: 'Release notes', icon: Tag, hint: 'Friendly notes for a GitHub release page or an announcement.' },
]

const GET_COMMITS = `# commits since the last tag (for a changelog or release)
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# commits on your branch that are not on main (for a PR)
git log --oneline main..HEAD

# between two versions
git log --oneline v1.4.2..v2.0.0`

const today = () => new Date().toISOString().slice(0, 10)

export default function ChangelogWriter() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<Mode>('changelog')
  const [repo, setRepo] = useState('')
  const [current, setCurrent] = useState('')
  const [version, setVersion] = useState('')
  const [date, setDate] = useState(today)
  const [title, setTitle] = useState('')
  const [includeMerges, setIncludeMerges] = useState(false)
  const [hidden, setHidden] = useState<SectionId[]>([])
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  const commits = useMemo(() => parseCommits(text, { includeMerges }), [text, includeMerges])
  const bump = commits.length ? suggestBump(commits) : null
  const suggested = bump && current ? nextVersion(current, bump) : ''
  const repoUrl = normaliseRepoUrl(repo)
  const guessed = commits.filter((c) => !c.conventional).length

  const output = useMemo(() => {
    if (!commits.length) return ''
    const o = { repoUrl, version: version || suggested || undefined, previousVersion: current || undefined, date, hidden, title: title || undefined }
    if (mode === 'pr') return renderPrDescription(commits, o)
    if (mode === 'release') return renderReleaseNotes(commits, o)
    return renderChangelog(commits, o)
  }, [commits, mode, repoUrl, version, suggested, current, date, hidden, title])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  const download = () => {
    const name = mode === 'changelog' ? 'CHANGELOG-section.md' : mode === 'pr' ? 'pull-request.md' : 'release-notes.md'
    const url = URL.createObjectURL(new Blob([output], { type: 'text/markdown' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSection = (id: SectionId) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))

  return (
    <div className="container py-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tool · runs in your browser</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Changelog & PR writer</h1>
        <p className="mt-2 text-muted-foreground">
          Paste your commit messages and get a tidy <b>CHANGELOG</b> section, a <b>pull request description</b> or <b>release notes</b>, grouped
          into features, fixes and more. Works best with{' '}
          <Link to="/guide/commits-to-changelog" className="text-primary underline-offset-4 hover:underline">Conventional Commits</Link>, but plain
          messages are understood too. Nothing is uploaded.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ---------- input ---------- */}
        <section className="space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="commits" className="text-sm font-semibold">1. Your commits</label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setText(EXAMPLE_LOG)}>
                  <Sparkles className="h-3.5 w-3.5" /> Example
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setText('')} disabled={!text} aria-label="Clear">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <textarea
              id="commits"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={'a1b2c3d feat(auth): add sign in with email code (#42)\nb2c3d4e fix: show an error when the code expired\n…'}
              className="mt-3 h-64 w-full resize-y rounded-xl border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {commits.length ? (
                <>
                  <b className="text-foreground">{commits.length}</b> commits read
                  {guessed > 0 && <> · {guessed} without a type (sorted by their first word)</>}
                  {bump && <> · suggested bump: <b className="text-foreground">{bump}</b></>}
                </>
              ) : (
                <>One commit per line. `git log --oneline` output, hashes, `(#12)` PR numbers and `closes #3` are all understood.</>
              )}
            </p>
          </div>

          <details className="rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold">Where do I get my commits?</summary>
            <CodeBlock code={GET_COMMITS} className="mt-3" />
          </details>

          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm font-semibold">2. Details (optional)</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="GitHub repo" hint="owner/repo or URL: links commits and PRs">
                <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="octocat/hello-world" className={inputCls} />
              </Field>
              {mode === 'pr' ? (
                <Field label="PR title">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sign in with email codes" className={inputCls} />
                </Field>
              ) : (
                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
              )}
              {mode !== 'pr' && (
                <>
                  <Field label="Current version" hint="the last tag, e.g. v1.4.2">
                    <input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="v1.4.2" className={inputCls} />
                  </Field>
                  <Field label="New version" hint={suggested ? `suggested: ${suggested}` : 'empty = Unreleased'}>
                    <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder={suggested || 'Unreleased'} className={inputCls} />
                  </Field>
                </>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Sections (tap to hide)</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    aria-pressed={!hidden.includes(s.id)}
                    className={cn('rounded-full border px-2.5 py-1 text-xs transition', hidden.includes(s.id) ? 'text-muted-foreground line-through opacity-60' : 'border-primary/50 text-foreground')}
                  >
                    {s.changelog}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={includeMerges} onChange={(e) => setIncludeMerges(e.target.checked)} /> Keep merge commits
              </label>
            </div>
          </div>
        </section>

        {/* ---------- output ---------- */}
        <section className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card">
            <div className="flex flex-wrap gap-1 border-b p-2" role="tablist" aria-label="Output">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition', mode === m.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <m.icon className="h-4 w-4" /> {m.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">{MODES.find((m) => m.id === mode)!.hint}</p>
              {output ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={copy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy Markdown'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={download}>
                      <Download className="h-3.5 w-3.5" /> Download .md
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
                      {preview ? <FileCode2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {preview ? 'Markdown' : 'Preview'}
                    </Button>
                  </div>
                  {preview ? (
                    <div className="scrollbar-thin mt-3 max-h-[34rem] overflow-auto rounded-xl border bg-background p-4">
                      <MarkdownPreview md={output} />
                    </div>
                  ) : (
                    <pre className="scrollbar-thin mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-background p-4 font-mono text-xs leading-relaxed">{output}</pre>
                  )}
                </>
              ) : (
                <div className="mt-3 grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  Paste commits on the left, or press <b className="mx-1 text-foreground">Example</b> to try it.
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            New to this? Read <Link to="/guide/write-a-good-pull-request" className="text-primary hover:underline">Write a pull request people want to review</Link> and{' '}
            <Link to="/guide/changelogs-and-release-notes" className="text-primary hover:underline">Keep a changelog and release notes</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}

const inputCls = 'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

/* A tiny Markdown preview for exactly what the generator writes: headings, lists, task lists,
   paragraphs, **bold**, `code` and [links](https://…). Built from React elements, no HTML injection. */
function MarkdownPreview({ md }: { md: string }) {
  const blocks: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => {
    if (list.length) blocks.push(<ul key={`ul${blocks.length}`} className="my-2 space-y-1 pl-5">{list}</ul>)
    list = []
  }
  md.split('\n').forEach((line, i) => {
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    const task = line.match(/^- \[( |x)\] (.*)$/)
    const li = line.match(/^(?:- |\d+\. )(.*)$/)
    if (h) {
      flush()
      const cls = h[1].length === 1 ? 'text-xl font-bold' : h[1].length === 2 ? 'mt-4 text-lg font-semibold' : 'mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'
      blocks.push(<p key={i} className={cls}>{inline(h[2])}</p>)
    } else if (task) {
      list.push(<li key={i} className="list-none -ml-5 flex gap-2"><input type="checkbox" disabled checked={task[1] === 'x'} className="mt-1" />{inline(task[2])}</li>)
    } else if (li) {
      list.push(<li key={i} className="list-disc">{inline(li[1])}</li>)
    } else if (line.trim()) {
      flush()
      blocks.push(<p key={i} className="my-2 text-sm">{inline(line)}</p>)
    } else flush()
  })
  flush()
  return <div className="text-sm leading-relaxed">{blocks}</div>
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[(`?)([^\]`]+)\1\]\((https:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[3]) out.push(<a key={m.index} href={m[3]} target="_blank" rel="noreferrer" className={cn('text-primary hover:underline', m[1] && 'font-mono text-xs')}>{m[2]}</a>)
    else if (m[4]) out.push(<b key={m.index}>{m[4]}</b>)
    else out.push(<code key={m.index} className="rounded bg-secondary px-1 font-mono text-xs">{m[5]}</code>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}
