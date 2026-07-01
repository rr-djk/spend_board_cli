import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface TextBlock {
  text: string
  x: number
  y: number
  width: number
  height: number
  pageNumber: number
}

export async function extractTextBlocksFromPage(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<TextBlock[]> {
  const page = await pdfDocument.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent()

  return textContent.items
    .filter((item) => 'str' in item && item.str.trim() !== '')
    .map((item) => {
      const typedItem = item as { str: string; transform: number[]; width: number; height: number }
      const [, , , , x, y] = typedItem.transform
      const scaledPoint = viewport.convertToViewportPoint(x, y)

      return {
        text: typedItem.str,
        x: scaledPoint[0],
        y: scaledPoint[1],
        width: typedItem.width * scale,
        height: typedItem.height * scale,
        pageNumber,
      }
    })
}
