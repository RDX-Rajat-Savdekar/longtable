import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import {
  getUserColor,
  useAuth,
  useChannels,
  useMessages,
  useMutations,
  usePresenceRoom,
  useQuery,
  useUser,
  useUsers,
  type RecordData,
} from 'deepspace'
import { SCOPE_ID } from '../../constants'
import { callAction } from '../../table/call-action'
import { DAYS, DEFAULT_CITY, TABLE_CHANNEL_NAME } from '../../table/days'
import './table.css'

type PlanData = {
  title: string
  day: number
  place: string
  outdoor: number
  weatherSummary: string
  weatherTemp: number
  stampedAt: string
  calledOff: number
}

type LetterData = {
  body: string
  writtenAt: string
  mailedAt: string
}

type SettingData = {
  key: string
  value: string
}

const SEAT_COLORS = ['#2f5d45', '#8f2d2d', '#6b4f36', '#1c1915', '#3c2a1e'] as const

function flagged(value: unknown): boolean {
  return value === 1 || value === true || value === '1'
}

export default function WeekTable() {
  const { userId } = useAuth()
  const { user } = useUser()
  const { users, setRole } = useUsers()
  const { peers, connected } = usePresenceRoom(SCOPE_ID)
  const plans = useQuery<PlanData>('plans')
  const letters = useQuery<LetterData>('letters')
  const planWrites = useMutations<Pick<PlanData, 'title' | 'day' | 'place' | 'outdoor'>>('plans')
  const planEdits = useMutations<PlanData>('plans')
  const isHost = user?.role === 'admin'

  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'stamp' | 'letter' | 'mail' | ''>('')

  const latestLetter = useMemo(() => {
    return letters.records
      .slice()
      .sort((a, b) => (b.data.writtenAt || '').localeCompare(a.data.writtenAt || ''))[0]
  }, [letters.records])

  async function run(kind: 'stamp' | 'letter' | 'mail', name: string) {
    setBusy(kind)
    setError('')
    const result = await callAction(name)
    setBusy('')
    if (!result.success) setError(result.error)
  }

  const seats = [
    ...(userId ? [{ userId, userName: user?.name || 'You' }] : []),
    ...peers.map((peer) => ({ userId: peer.userId, userName: peer.userName || 'Friend' })),
  ]

  return (
    <div className="room" data-testid="week-table">
      <section className="surface">
        <div className="toolbar">
          {isHost && <CityField />}
          <PlanForm ready={planWrites.ready} onCreate={planWrites.createConfirmed} onError={setError} />
          {isHost && (
            <>
              <button
                type="button"
                data-testid="stamp-button"
                disabled={busy !== ''}
                onClick={() => run('stamp', 'stampWeather')}
              >
                {busy === 'stamp' ? 'Stamping…' : 'Stamp the outdoors'}
              </button>
              <button
                type="button"
                data-testid="write-letter"
                disabled={busy !== ''}
                onClick={() => run('letter', 'writeLetter')}
              >
                {busy === 'letter' ? 'Writing…' : 'Write the letter'}
              </button>
              <button
                type="button"
                data-testid="mail-letter"
                disabled={busy !== '' || !latestLetter || Boolean(latestLetter.data.mailedAt)}
                onClick={() => run('mail', 'mailLetter')}
              >
                {latestLetter?.data.mailedAt ? 'Mailed' : busy === 'mail' ? 'Mailing…' : 'Mail the letter'}
              </button>
            </>
          )}
        </div>

        <p className="note" data-kind={error ? 'error' : 'quiet'} data-testid="table-error">
          {error || (connected ? 'Everyone here is at the table.' : 'Pulling up a chair…')}
        </p>

        <LetterSheet letter={latestLetter} />

        <div className="runner" data-testid="week-runner">
          {DAYS.map((name, day) => (
            <div key={name} data-testid={`day-${day}`}>
              <h2 className="day-name">{name}</h2>
              {plans.records
                .filter((record) => Number(record.data.day) === day)
                .map((record) => (
                  <PlanCard
                    key={record.recordId}
                    record={record}
                    isHost={isHost}
                    mine={record.createdBy === userId}
                    ready={planEdits.ready}
                    onLeave={async (calledOff) => {
                      setError('')
                      try {
                        await planEdits.putConfirmed(record.recordId, { calledOff })
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'The card stayed where it was.')
                      }
                    }}
                    onLift={async () => {
                      setError('')
                      try {
                        await planEdits.removeConfirmed(record.recordId)
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'The card stayed where it was.')
                      }
                    }}
                  />
                ))}
            </div>
          ))}
        </div>

        <div>
          <div className="seats" data-testid="seats">
            {seats.map((seat) => (
              <div
                key={seat.userId}
                className="seat"
                data-testid="presence-seat"
                style={{ ['--seat' as string]: getUserColor(seat.userId, SEAT_COLORS) }}
              >
                {seat.userName}
                {seat.userId === userId && <small>You</small>}
              </div>
            ))}
          </div>
          {isHost && (
            <div className="people">
              {users.map((person) => (
                <span key={person.id}>
                  {person.name || 'Friend'}
                  {person.id !== userId && (
                    <button
                      type="button"
                      onClick={() => setRole(person.id, person.role === 'admin' ? 'member' : 'admin')}
                    >
                      {person.role === 'admin' ? ' make friend' : ' make host'}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      <Notepad users={users} />
    </div>
  )
}

function CityField() {
  const settings = useQuery<SettingData>('settings')
  const writes = useMutations<SettingData>('settings')
  const row = settings.records.find((record) => record.data.key === 'city')
  const [city, setCity] = useState(row?.data.value || DEFAULT_CITY)

  useEffect(() => {
    if (row?.data.value) setCity(row.data.value)
  }, [row?.data.value])

  return (
    <label>
      City
      <input
        data-testid="city-input"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        onBlur={() => {
          const next = city.trim() || DEFAULT_CITY
          if (!writes.ready) return
          if (row) void writes.putConfirmed(row.recordId, { value: next })
          else void writes.createConfirmed({ key: 'city', value: next })
        }}
      />
    </label>
  )
}

function PlanForm({
  ready,
  onCreate,
  onError,
}: {
  ready: boolean
  onCreate: (data: Pick<PlanData, 'title' | 'day' | 'place' | 'outdoor'>) => Promise<string>
  onError: (message: string) => void
}) {
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [day, setDay] = useState(new Date().getDay())
  const [outdoor, setOutdoor] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <form
      className="toolbar"
      data-testid="plan-form"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!title.trim()) return
        setSaving(true)
        onError('')
        try {
          await onCreate({
            title: title.trim(),
            place: place.trim(),
            day,
            outdoor: outdoor ? 1 : 0,
          })
          setTitle('')
          setPlace('')
          setOutdoor(false)
        } catch (cause) {
          onError(cause instanceof Error ? cause.message : 'The card did not land.')
        } finally {
          setSaving(false)
        }
      }}
    >
      <label>
        Plan
        <input data-testid="plan-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Place
        <input data-testid="plan-place" value={place} onChange={(event) => setPlace(event.target.value)} />
      </label>
      <label>
        Day
        <select data-testid="plan-day" value={day} onChange={(event) => setDay(Number(event.target.value))}>
          {DAYS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="outdoor">
        <input
          type="checkbox"
          data-testid="plan-outdoor"
          checked={outdoor}
          onChange={(event) => setOutdoor(event.target.checked)}
        />
        Outdoors
      </label>
      <button type="submit" data-testid="plan-save" disabled={!ready || saving || !title.trim()}>
        Set it down
      </button>
    </form>
  )
}

function PlanCard({
  record,
  isHost,
  mine,
  ready,
  onLeave,
  onLift,
}: {
  record: RecordData<PlanData>
  isHost: boolean
  mine: boolean
  ready: boolean
  onLeave: (calledOff: number) => Promise<void>
  onLift: () => Promise<void>
}) {
  const stampRef = useRef<HTMLSpanElement>(null)
  const plan = record.data
  const off = flagged(plan.calledOff)
  const stamped = Boolean(plan.stampedAt)

  useEffect(() => {
    const el = stampRef.current
    if (!el || !stamped) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { autoAlpha: 1, scale: 1, rotation: -8 })
      return
    }
    gsap.fromTo(
      el,
      { autoAlpha: 0, scale: 1.35, rotation: -18 },
      { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.45, overwrite: true },
    )
  }, [stamped, plan.stampedAt, plan.weatherSummary])

  return (
    <article className="card" data-testid="plan-card">
      <h3>{plan.title}</h3>
      {plan.place && <p>{plan.place}</p>}
      {stamped && (
        <>
          <span ref={stampRef} className="stamp" data-off={off} data-testid="weather-stamp">
            {off ? 'Leave it' : plan.weatherSummary}
          </span>
          <p data-testid="weather-line">
            {plan.weatherSummary}
            {typeof plan.weatherTemp === 'number' ? `, ${Math.round(plan.weatherTemp)}°` : ''}
          </p>
        </>
      )}
      {isHost && flagged(plan.outdoor) && (
        <button type="button" disabled={!ready} onClick={() => onLeave(off ? 0 : 1)}>
          {off ? 'Keep it' : 'Leave it'}
        </button>
      )}
      {(mine || isHost) && (
        <button type="button" disabled={!ready} onClick={onLift}>
          Lift
        </button>
      )}
    </article>
  )
}

function LetterSheet({ letter }: { letter: RecordData<LetterData> | undefined }) {
  const ref = useRef<HTMLElement>(null)
  const body = letter?.data.body ?? ''

  useEffect(() => {
    const el = ref.current
    if (!el || !body) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { autoAlpha: 1, rotateX: 0 })
      return
    }
    gsap.fromTo(
      el,
      { autoAlpha: 0, rotateX: -70 },
      { autoAlpha: 1, rotateX: 0, duration: 0.6, overwrite: true, transformOrigin: 'top center' },
    )
  }, [body])

  if (!letter) return <div />

  return (
    <article ref={ref} className="letter" data-testid="letter">
      <div className="letter-kicker">{letter.data.mailedAt ? 'Mailed' : 'On the table'}</div>
      <p>{letter.data.body}</p>
    </article>
  )
}

function Notepad({ users }: { users: { id: string; name: string }[] }) {
  const { channels, status, create } = useChannels()
  const started = useRef(false)
  const channel = channels.find((row) => row.data.name === TABLE_CHANNEL_NAME && !row.data.archived)
  const messages = useMessages(channel?.recordId)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (status !== 'ready' || channel || started.current) return
    started.current = true
    void create({ name: TABLE_CHANNEL_NAME, description: 'Notes at the side of the table' }).catch(() => {
      started.current = false
    })
  }, [status, channel, create])

  return (
    <aside className="notepad" data-testid="notepad">
      <h2>Notepad</h2>
      <div className="thread">
        {messages.messages.map((message) => {
          if (flagged(message.data.deleted)) return null
          const author = users.find((person) => person.id === message.data.authorId)
          return (
            <p key={message.recordId}>
              <span>{author?.name || 'Someone'}</span>
              {message.data.content}
            </p>
          )
        })}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          const text = draft.trim()
          if (!text) return
          const sent = messages.send(text)
          if (sent) {
            setDraft('')
            void sent
          }
        }}
      >
        <input
          data-testid="notepad-input"
          value={draft}
          placeholder={channel ? 'A note for the table' : 'Opening the notepad…'}
          disabled={!channel}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" data-testid="notepad-send" disabled={!channel || !draft.trim()}>
          Add
        </button>
      </form>
    </aside>
  )
}
