export interface StatementPeriod {
  start: string
  end: string
}

const FRENCH_MONTH_TO_NUMBER: Record<string, number> = {
  JAN: 1,
  FÉV: 2,
  MAR: 3,
  AVR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AOÛ: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DÉC: 12,
}

const ENGLISH_MONTH_TO_NUMBER: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
}

// Français : "Relevé du 10 NOV au 08 DÉC 2020" (année à la fin uniquement)
//         ou "Relevé du 09 DÉC 2020 au 08 JAN 2021" (année après chaque date)
// Cherche dans la ligne, pas uniquement en début
const FRENCH_PERIOD_REGEX =
  /relevé\s+du\s+(\d{1,2})\s+([A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})(?:\s+(\d{4}))?\s+au\s+(\d{1,2})\s+([A-ZÉÀÈÙÛÂÊÎÔÛ]{2,5})\s+(\d{4})/i

// Anglais : "Statement period: Nov 17, 2024 – Dec 16, 2024"
// Le tiret peut être un trait d'union ou un tiret long (–)
const ENGLISH_PERIOD_REGEX =
  /statement\s+period\s*:\s*([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s*[–-]\s*([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/i

function toIso(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseStatementPeriod(lines: string[]): StatementPeriod | null {
  for (const line of lines) {
    const frenchMatch = line.match(FRENCH_PERIOD_REGEX)
    if (frenchMatch) {
      const [, startDay, startMonthStr, explicitStartYear, endDay, endMonthStr, endYearStr] = frenchMatch
      const startMonth = FRENCH_MONTH_TO_NUMBER[startMonthStr.toUpperCase()]
      const endMonth = FRENCH_MONTH_TO_NUMBER[endMonthStr.toUpperCase()]
      if (startMonth && endMonth) {
        const endYear = parseInt(endYearStr)
        const startYear = explicitStartYear
          ? parseInt(explicitStartYear)
          : startMonth > endMonth ? endYear - 1 : endYear
        return {
          start: toIso(parseInt(startDay), startMonth, startYear),
          end: toIso(parseInt(endDay), endMonth, endYear),
        }
      }
    }

    const englishMatch = line.match(ENGLISH_PERIOD_REGEX)
    if (englishMatch) {
      const [, startMonthStr, startDay, startYear, endMonthStr, endDay, endYear] = englishMatch
      const startMonth = ENGLISH_MONTH_TO_NUMBER[startMonthStr.toUpperCase()]
      const endMonth = ENGLISH_MONTH_TO_NUMBER[endMonthStr.toUpperCase()]
      if (startMonth && endMonth) {
        return {
          start: toIso(parseInt(startDay), startMonth, parseInt(startYear)),
          end: toIso(parseInt(endDay), endMonth, parseInt(endYear)),
        }
      }
    }
  }

  return null
}
