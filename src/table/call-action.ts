import { getAuthToken } from 'deepspace'

export type ActionOutcome<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function callAction<T>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<ActionOutcome<T>> {
  const token = await getAuthToken()
  if (!token) return { success: false, error: 'Sign in again to continue.' }

  let response: Response
  try {
    response = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
  } catch {
    return { success: false, error: 'The table could not reach the server.' }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { success: false, error: 'The server sent a response the table could not read.' }
  }

  if (!body || typeof body !== 'object') {
    return { success: false, error: 'The server sent an empty response.' }
  }

  const result = body as { success?: boolean; error?: string; data?: T }
  if (result.success === false || !response.ok) {
    return { success: false, error: result.error || 'That did not work.' }
  }
  if (result.success !== true) {
    return { success: false, error: 'The server sent a response the table could not read.' }
  }
  return { success: true, data: result.data as T }
}
