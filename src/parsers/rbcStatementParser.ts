import type { TextLine } from '../pdf/groupTextLines'

export interface ParsedTransaction {
  transactionDate: string
  postingDate: string
  description: string
  amount: number
  isPayment?: boolean
}

// Tout sur une ligne : DD MMM DD MMM DESCRIPTION MONTANT $ [texte ignoré après $]
const FULL_LINE_REGEX =
  /^(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(.*)\s+(\()?(\d+,\d{2})\s*\$\)?/

// Deux dates sans description : "31 DÉC 04 JAN"
const TWO_DATES_ONLY_REGEX =
  /^(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})$/

// Deux dates + description sans montant : "31 DÉC 04 JAN DESCRIPTION"
const TWO_DATES_WITH_DESC_REGEX =
  /^(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(.+)$/

// Montant seul : "17,85 $" ou "(138,01 $)"
const STANDALONE_AMOUNT_REGEX = /^\(?\d+,\d{2}\s*\$\)?$/

// Numéro de référence — séquence de 15+ chiffres
const REFERENCE_REGEX = /^\d{15,}$/

// Paiements vers la carte
const PAYMENT_KEYWORDS = /PAYMENT|THANK\s*YOU|PAIEMENT/i

function isPaymentTransaction(description: string): boolean {
  return PAYMENT_KEYWORDS.test(description)
}

type ParserState = 'idle' | 'awaiting_description' | 'awaiting_amount'

interface PendingTransaction {
  transactionDate: string
  postingDate: string
  description: string | null
  isPayment?: boolean
}

function parseAmount(amountStr: string, rawText: string): number {
  const value = parseFloat(amountStr.replace(',', '.'))
  return rawText.trim().startsWith('(') ? -value : value
}

function normalizeTransactionLine(text: string): string {
  return text.replace(/([A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})(\d{1,2}\s+[A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})/g, '$1 $2')
}

export function parseRbcTransactions(lines: TextLine[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  let state: ParserState = 'idle'
  let pending: PendingTransaction | null = null

  for (const line of lines) {
    const text = normalizeTransactionLine(line.text.trim())
    if (!text || REFERENCE_REGEX.test(text)) continue

    // Cas 1 — tout sur une ligne
    const fullMatch = text.match(FULL_LINE_REGEX)
    if (fullMatch) {
      const [, transactionDate, postingDate, description, openParen, amountStr] = fullMatch
      const desc = description.trim()
      transactions.push({
        transactionDate,
        postingDate,
        description: desc,
        amount: parseAmount(amountStr, openParen === '(' ? '(' : ''),
        isPayment: isPaymentTransaction(desc),
      })
      state = 'idle'
      pending = null
      continue
    }

    // Cas 2 — montant seul : complète la transaction en attente
    if (STANDALONE_AMOUNT_REGEX.test(text) && state === 'awaiting_amount' && pending?.description) {
      transactions.push({
        transactionDate: pending.transactionDate,
        postingDate: pending.postingDate,
        description: pending.description,
        amount: parseAmount(text.match(/(\d+,\d{2})/)![1], text),
        isPayment: pending.isPayment ?? isPaymentTransaction(pending.description),
      })
      state = 'idle'
      pending = null
      continue
    }

    // Cas 3 — deux dates seules
    const twoDatesMatch = text.match(TWO_DATES_ONLY_REGEX)
    if (twoDatesMatch) {
      pending = { transactionDate: twoDatesMatch[1], postingDate: twoDatesMatch[2], description: null }
      state = 'awaiting_description'
      continue
    }

    // Cas 4 — deux dates + description (montant sur la ligne suivante)
    const twoDatesDescMatch = text.match(TWO_DATES_WITH_DESC_REGEX)
    if (twoDatesDescMatch) {
      const desc = twoDatesDescMatch[3].trim()
      pending = {
        transactionDate: twoDatesDescMatch[1],
        postingDate: twoDatesDescMatch[2],
        description: desc,
        isPayment: isPaymentTransaction(desc),
      }
      state = 'awaiting_amount'
      continue
    }

    // Cas 5 — description seule (après deux dates seules)
    if (state === 'awaiting_description' && pending) {
      pending.description = text
      pending.isPayment = isPaymentTransaction(text)
      state = 'awaiting_amount'
      continue
    }

    // Ligne non reconnue — réinitialise
    state = 'idle'
    pending = null
  }

  return transactions
}
