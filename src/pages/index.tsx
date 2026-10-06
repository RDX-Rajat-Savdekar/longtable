/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { DAYS } from '../table/days'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="min-h-screen px-8 py-12 sm:px-14"
        style={{ fontFamily: '"Source Sans 3", sans-serif' }}
      >
        <p className="text-sm text-muted-foreground">Longtable</p>
        <h1
          className="mt-3 max-w-xl text-5xl text-foreground sm:text-6xl"
          style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 560, lineHeight: 1.05 }}
        >
          The week stays on the table.
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">
          One friend group, seven days. Sit down, set a plan, and leave a note. The host stamps the weather and mails the letter.
        </p>
        <Link
          to="/table"
          className="mt-8 inline-block border border-border px-4 py-2 text-foreground"
        >
          Sit down
        </Link>
        <div className="mt-14 grid max-w-3xl grid-cols-7 gap-2 bg-[#e7dcc8] p-3 text-[#1c1915]">
          {DAYS.map((day) => (
            <div key={day} style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              {day.slice(0, 3)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
