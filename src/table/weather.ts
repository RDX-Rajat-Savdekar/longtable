/** Current conditions that should mark an outdoor plan off. */
export function isRoughWeather(description: string): boolean {
  return /rain|drizzle|thunder|snow|sleet|storm/i.test(description)
}

export type CurrentWeather = {
  temp: number
  description: string
}

export function readCurrentWeather(data: unknown): CurrentWeather | null {
  if (!data || typeof data !== 'object') return null
  const row = data as { temp?: unknown; description?: unknown }
  if (typeof row.temp !== 'number' || typeof row.description !== 'string' || !row.description) {
    return null
  }
  return { temp: row.temp, description: row.description }
}
