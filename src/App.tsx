import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SearchProvider } from './components/SearchPalette'
import { ProgressProvider } from './lib/progress'
import Home from './pages/Home'

const Learn = lazy(() => import('./pages/Learn'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const Playground = lazy(() => import('./pages/Playground'))
const Challenges = lazy(() => import('./pages/Challenges'))
const ChallengePage = lazy(() => import('./pages/ChallengePage'))
const GitHubTour = lazy(() => import('./pages/GitHubTour'))
const Cicd = lazy(() => import('./pages/Cicd'))
const Commands = lazy(() => import('./pages/Commands'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Loading() {
  return <div className="container py-24 text-center text-sm text-muted-foreground">Loading…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <ProgressProvider>
        <SearchProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="learn" element={<Learn />} />
                <Route path="learn/:path" element={<Learn />} />
                <Route path="guide/:id" element={<GuidePage />} />
                <Route path="playground" element={<Playground />} />
                <Route path="challenges" element={<Challenges />} />
                <Route path="challenges/:id" element={<ChallengePage />} />
                <Route path="github" element={<GitHubTour />} />
                <Route path="github/:id" element={<GitHubTour />} />
                <Route path="cicd" element={<Cicd />} />
                <Route path="commands" element={<Commands />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </SearchProvider>
      </ProgressProvider>
    </BrowserRouter>
  )
}
