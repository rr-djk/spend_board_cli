import type { TextBlock } from './extractTextBlocks'

export interface TextLine {
  y: number
  text: string
}

export function groupTextLines(blocks: TextBlock[], tolerance = 3): TextLine[] {
  const lines: { y: number; items: TextBlock[] }[] = []

  for (const block of blocks) {
    const existingLine = lines.find((line) => Math.abs(line.y - block.y) < tolerance)

    if (existingLine) {
      existingLine.items.push(block)
    } else {
      lines.push({ y: block.y, items: [block] })
    }
  }

  return lines
    .sort((a, b) => a.y - b.y)
    .map((line) => ({
      y: line.y,
      text: line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .trim(),
    }))
}
