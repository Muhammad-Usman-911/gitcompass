import { Link } from 'react-router-dom'
import { buttonClass } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="font-mono text-sm text-primary">fatal: ambiguous argument: unknown revision</p>
        <h1 className="mt-3 text-4xl font-bold">404: page not in this history</h1>
        <p className="mt-2 text-muted-foreground">Even <code className="font-mono">git reflog</code> can't find it.</p>
        <Link to="/" className={buttonClass('gradient', 'md', 'mt-6')}>Back home</Link>
      </div>
    </div>
  )
}
