/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="flex min-h-screen flex-col justify-center px-8 py-12 sm:px-14"
        style={{ fontFamily: '"Source Sans 3", sans-serif' }}
      >
        <p className="text-sm text-muted-foreground">The Yard</p>
        <h1
          className="mt-3 max-w-xl text-5xl text-foreground sm:text-6xl"
          style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 560, lineHeight: 1.05 }}
        >
          Jump in and build the pile.
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">
          No account. You get a name, a color, and a little habit. Friends walk the same grass and stack blocks together.
        </p>
        <p className="mt-4 max-w-md text-foreground">
          Walk with W A S D. Click the grass to add a block. Click a block to take the top one off.
        </p>
        <Link to="/yard" className="mt-8 inline-block w-fit border border-border px-4 py-2 text-foreground">
          Jump in
        </Link>
      </div>
    </>
  )
}
