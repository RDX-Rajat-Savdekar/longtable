/** Pull the prose out of an Anthropic Messages response body. */
export function readAnthropicText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const body = data as { content?: unknown; response?: unknown }
  if (typeof body.response === 'string' && body.response.trim()) return body.response.trim()
  if (!Array.isArray(body.content)) return ''
  const parts = body.content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
  return parts.join('\n').trim()
}
