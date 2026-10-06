export function skyColor(description: string): string {
  const text = description.toLowerCase()
  if (/rain|drizzle|thunder|storm/.test(text)) return '#6d7c86'
  if (/snow|sleet/.test(text)) return '#d5dee6'
  if (/cloud|overcast|mist|fog/.test(text)) return '#aeb8c2'
  return '#8ecae6'
}

export function skyLabel(description: string): string {
  const text = description.trim()
  return text || 'Clear'
}
