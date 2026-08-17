import { markdownToText } from './markdown'

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' }
) => { segment(input: string): Iterable<unknown> }

const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter
const graphemeSegmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : undefined

export function countWujieeGraphemes(value: string): number {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value)).length
    : Array.from(value).length
}

export function countWujieeMarkdownCharacters(markdown: string): number {
  return countWujieeGraphemes(markdownToText(markdown))
}

export const countGraphemes = countWujieeGraphemes
export const countMarkdownCharacters = countWujieeMarkdownCharacters
