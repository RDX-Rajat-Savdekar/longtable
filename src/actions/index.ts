import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { DEFAULT_CITY, LETTER_FROM, TABLE_CHANNEL_NAME } from '../table/days'
import { readAnthropicText } from '../table/letter-text'
import { isRoughWeather, readCurrentWeather } from '../table/weather'

type UserRow = { role?: string; email?: string; name?: string }
type PlanRow = {
  title?: string
  day?: number
  place?: string
  outdoor?: number
  weatherSummary?: string
  weatherTemp?: number
  calledOff?: number
}
type LetterRow = { body?: string; writtenAt?: string; mailedAt?: string }
type SettingRow = { key?: string; value?: string }
type MessageRow = { content?: string; deleted?: number }
type ChannelRow = { name?: string }

async function requireHost(tools: ActionTools, userId: string): Promise<string | null> {
  const row = await tools.get<UserRow>('users', userId)
  if (!row.success) return 'Sit down at the table once, then try again.'
  if (row.data.record.data.role !== 'admin') return 'Only the host can do that.'
  return null
}

async function tableCity(tools: ActionTools): Promise<string> {
  const settings = await tools.query<SettingRow>('settings', { limit: 20 })
  if (!settings.success) return DEFAULT_CITY
  const city = settings.data.records.find((record) => record.data.key === 'city')?.data.value
  return city?.trim() || DEFAULT_CITY
}

const stampWeather: ActionHandler<Env> = async ({ userId, tools }) => {
  const denied = await requireHost(tools, userId)
  if (denied) return { success: false, error: denied }

  const plans = await tools.query<PlanRow>('plans', { limit: 100 })
  if (!plans.success) return { success: false, error: plans.error }
  const outdoor = plans.data.records.filter((record) => Number(record.data.outdoor) === 1)
  if (outdoor.length === 0) return { success: false, error: 'Set an outdoor plan first.' }

  const city = await tableCity(tools)
  const weather = await tools.integration('openweathermap/current', {
    q: city,
    location: city,
    units: 'imperial',
  })
  if (!weather.success) return { success: false, error: weather.error }
  const current = readCurrentWeather(weather.data)
  if (!current) return { success: false, error: 'The weather came back in a shape the table could not read.' }

  const calledOff = isRoughWeather(current.description) ? 1 : 0
  const stampedAt = new Date().toISOString()
  for (const plan of outdoor) {
    const updated = await tools.update('plans', plan.recordId, {
      weatherSummary: current.description,
      weatherTemp: current.temp,
      stampedAt,
      calledOff,
    })
    if (!updated.success) return { success: false, error: updated.error }
  }

  return {
    success: true,
    data: { city, description: current.description, temp: current.temp, stamped: outdoor.length },
  }
}

const writeLetter: ActionHandler<Env> = async ({ userId, tools }) => {
  const denied = await requireHost(tools, userId)
  if (denied) return { success: false, error: denied }

  const plans = await tools.query<PlanRow>('plans', { limit: 100 })
  if (!plans.success) return { success: false, error: plans.error }
  if (plans.data.records.length === 0) return { success: false, error: 'Set a plan before writing the letter.' }

  const channels = await tools.query<ChannelRow>('channels', { limit: 20 })
  const channelId = channels.success
    ? channels.data.records.find((record) => record.data.name === TABLE_CHANNEL_NAME)?.recordId
    : undefined
  const notes: string[] = []
  if (channelId) {
    const messages = await tools.query<MessageRow>('messages', {
      where: { channelId },
      limit: 30,
    })
    if (messages.success) {
      for (const message of messages.data.records) {
        if (Number(message.data.deleted) === 1) continue
        if (message.data.content) notes.push(message.data.content)
      }
    }
  }

  const lines = plans.data.records
    .slice()
    .sort((a, b) => Number(a.data.day) - Number(b.data.day))
    .map((record) => {
      const plan = record.data
      const weather = plan.weatherSummary
        ? ` Weather: ${plan.weatherSummary}, ${plan.weatherTemp} F.`
        : ''
      const off = Number(plan.calledOff) === 1 ? ' Called off.' : ''
      return `Day ${plan.day}: ${plan.title} at ${plan.place || 'the table'}.${weather}${off}`
    })

  const written = await tools.integration('anthropic/chat-completion', {
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system:
      'You write a short letter from the host of a weekly friend table. Use the plans and notes. Plain sentences. No bullet list. Under 120 words. If a plan was called off for weather, say so.',
    messages: [
      {
        role: 'user',
        content: `Plans:\n${lines.join('\n')}\n\nNotes:\n${notes.join('\n') || 'None.'}`,
      },
    ],
  })
  if (!written.success) return { success: false, error: written.error }
  const body = readAnthropicText(written.data)
  if (!body) return { success: false, error: 'The letter came back empty.' }

  const saved = await tools.create('letters', {
    body,
    writtenAt: new Date().toISOString(),
    mailedAt: '',
  })
  if (!saved.success) return { success: false, error: saved.error }
  return { success: true, data: { recordId: saved.data.recordId, body } }
}

const mailLetter: ActionHandler<Env> = async ({ userId, tools }) => {
  const denied = await requireHost(tools, userId)
  if (denied) return { success: false, error: denied }

  const me = await tools.get<UserRow>('users', userId)
  if (!me.success) return { success: false, error: 'Sit down at the table once, then try again.' }
  const to = me.data.record.data.email
  if (!to) return { success: false, error: 'Your account has no email to send the letter to.' }

  const letters = await tools.query<LetterRow>('letters', { limit: 20 })
  if (!letters.success) return { success: false, error: letters.error }
  const latest = letters.data.records
    .slice()
    .sort((a, b) => (b.data.writtenAt || '').localeCompare(a.data.writtenAt || ''))[0]
  if (!latest?.data.body) return { success: false, error: 'Write the letter first.' }
  if (latest.data.mailedAt) return { success: false, error: 'That letter is already in the mail.' }

  const sent = await tools.integration('email/send', {
    from: LETTER_FROM,
    to,
    subject: 'This week at the table',
    text: latest.data.body,
  })
  if (!sent.success) return { success: false, error: sent.error }

  const marked = await tools.update('letters', latest.recordId, {
    mailedAt: new Date().toISOString(),
  })
  if (!marked.success) return { success: false, error: marked.error }
  return { success: true, data: { recordId: latest.recordId, to } }
}

export const actions: Record<string, ActionHandler<Env>> = {
  stampWeather,
  writeLetter,
  mailLetter,
}
