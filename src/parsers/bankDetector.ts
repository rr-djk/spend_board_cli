export type BankId = 'rbc' | 'td' | 'unknown'

/**
 * Detects the bank from the first page lines of a PDF statement.
 *
 * @param firstPageLines - Array of text lines from page 1 of the statement.
 * @returns The detected bank ID: 'rbc', 'td', or 'unknown'.
 *
 * @note Searches line-by-line (not joined) to avoid false positives from
 * transaction descriptions like "ROYAL BANK PAYMENT" on a TD statement.
 */
export function detectBank(firstPageLines: string[]): BankId {
  const nonEmptyLines = firstPageLines.filter((line) => line.trim() !== '')
  const headerLines = nonEmptyLines.slice(0, 30)

  if (headerLines.some((line) => /Royal Bank|\bRBC\b/i.test(line))) {
    return 'rbc'
  }

  if (headerLines.some((line) => /TD Canada Trust|TD Bank/i.test(line))) {
    return 'td'
  }

  return 'unknown'
}
