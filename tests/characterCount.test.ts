import { describe, expect, it } from 'vitest'
import { countGraphemes, countMarkdownCharacters } from '../src/characterCount'

describe('character counting', () => {
  it('counts Chinese, Latin letters, and emoji as one character each', () => {
    expect(countGraphemes('中A😀')).toBe(3)
  })

  it('counts a joined family emoji as one character', () => {
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1)
  })

  it('does not count Markdown formatting syntax', () => {
    expect(countMarkdownCharacters('**中A😀**')).toBe(3)
  })
})
