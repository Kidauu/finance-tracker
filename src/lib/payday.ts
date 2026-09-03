import { toLocalISO } from './format'

const PAYDAY_DOM = 28

/**
 * Gajian tanggal 28. Kalau jatuh di weekend atau ada di daftar hari libur
 * user, mundur ke hari kerja terdekat sebelumnya (dimajukan tanggalnya).
 */
export function computePayday(year: number, month: number, holidayDates: Set<string>): string {
  const date = new Date(year, month, PAYDAY_DOM)
  while (date.getDay() === 0 || date.getDay() === 6 || holidayDates.has(toLocalISO(date))) {
    date.setDate(date.getDate() - 1)
  }
  return toLocalISO(date)
}

export function currentMonthPayday(holidayDates: Set<string>): string {
  const now = new Date()
  return computePayday(now.getFullYear(), now.getMonth(), holidayDates)
}
