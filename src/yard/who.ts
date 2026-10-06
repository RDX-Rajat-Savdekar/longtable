const ADJECTIVES = ['Quiet', 'Bright', 'Small', 'Lucky', 'Swift', 'Calm', 'Sunny', 'Bold']
const NOUNS = ['Moth', 'Pebble', 'Otter', 'Spoon', 'Clover', 'Pip', 'Marble', 'Finch']
const QUIRKS = ['hums', 'tiptoes', 'waves', 'spins once', 'looks up']
const COLORS = ['#e07a5f', '#3d8b6e', '#e9c46a', '#3d5a80', '#c06c84', '#f4a261']

export type Who = {
  id: string
  name: string
  color: string
  quirk: string
}

const KEY = 'yard-who'

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function makeWho(): Who {
  return {
    id: crypto.randomUUID(),
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    color: pick(COLORS),
    quirk: pick(QUIRKS),
  }
}

export function loadWho(): Who {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const who = makeWho()
      localStorage.setItem(KEY, JSON.stringify(who))
      return who
    }
    const parsed = JSON.parse(raw) as Who
    if (!parsed.id || !parsed.name || !parsed.color || !parsed.quirk) return makeWho()
    return parsed
  } catch {
    return makeWho()
  }
}

export function saveWho(who: Who) {
  localStorage.setItem(KEY, JSON.stringify(who))
}
