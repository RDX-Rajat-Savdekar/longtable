import { describe, expect, it } from 'vitest'
import { isRoughWeather, readCurrentWeather } from './weather'
import { readAnthropicText } from './letter-text'

describe('isRoughWeather', () => {
  it('marks rain, snow, and storms as a reason to leave a plan', () => {
    expect(isRoughWeather('light rain')).toBe(true)
    expect(isRoughWeather('Thunderstorm')).toBe(true)
    expect(isRoughWeather('clear sky')).toBe(false)
    expect(isRoughWeather('few clouds')).toBe(false)
  })
})

describe('readCurrentWeather', () => {
  it('reads the flattened current-weather fields', () => {
    expect(readCurrentWeather({ temp: 62, description: 'clear sky' })).toEqual({
      temp: 62,
      description: 'clear sky',
    })
    expect(readCurrentWeather({ temp: '62', description: 'clear sky' })).toBeNull()
    expect(readCurrentWeather(null)).toBeNull()
  })
})

describe('readAnthropicText', () => {
  it('reads the first text blocks from a Messages body', () => {
    expect(
      readAnthropicText({
        content: [{ type: 'text', text: 'Thursday is dinner.' }],
      }),
    ).toBe('Thursday is dinner.')
  })

  it('reads a response string when that is what the proxy returns', () => {
    expect(readAnthropicText({ response: 'See you Saturday.' })).toBe('See you Saturday.')
  })

  it('returns empty text for a shape it does not know', () => {
    expect(readAnthropicText({ choices: [] })).toBe('')
  })
})
