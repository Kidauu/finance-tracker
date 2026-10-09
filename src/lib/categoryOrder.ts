import type { Category, TransactionType } from '../types'

/**
 * The pots that get used almost every day. The picker pins them above the
 * rest, in this order, instead of burying them in the alphabetical list.
 * Matched on the exact name (case-insensitive) so a one-off "Kopi susu" pot
 * doesn't crowd out the real daily ones.
 */
const PRIORITY_NAMES: Partial<Record<TransactionType, string[]>> = {
  expense: ['Makanan & Minuman', 'Kopi', 'Laundry'],
}

const normalize = (name: string) => name.trim().toLowerCase()

/** The catch-all pot belongs at the very end, not between "Kopi" and "Olahraga". */
const isCatchAll = (c: Category) => normalize(c.name) === 'lainnya'

export interface PickerCategories {
  /** the daily pots, in PRIORITY_NAMES order (only the ones that exist) */
  priority: Category[]
  /** everything else, in the order given, with the catch-all last */
  others: Category[]
}

/** Splits the categories of one type into the pinned daily pots and the rest. */
export function splitCategoriesForPicker(
  categories: Category[],
  type: TransactionType,
): PickerCategories {
  const ofType = categories.filter((c) => c.type === type)

  const priority = (PRIORITY_NAMES[type] ?? []).flatMap((name) => {
    const match = ofType.find((c) => normalize(c.name) === normalize(name))
    return match ? [match] : []
  })

  const rest = ofType.filter((c) => !priority.includes(c))
  const others = [...rest.filter((c) => !isCatchAll(c)), ...rest.filter(isCatchAll)]

  return { priority, others }
}
