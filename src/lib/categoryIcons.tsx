import { createElement } from 'react'
import {
  ArrowLeftRight,
  Banknote,
  Bike,
  Briefcase,
  Car,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Utensils,
  Wallet,
  WashingMachine,
  Wifi,
  Wind,
  type LucideIcon,
} from 'lucide-react'

/**
 * The design uses line icons rather than emoji. Categories are matched on
 * substrings so user-created pots ("Nongkrong", "Kopi susu") still land on a
 * sensible icon instead of the generic fallback.
 */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/gaji|payroll|salary/i, Wallet],
  [/freelance|project|proyek/i, Briefcase],
  [/bonus|thr|hadiah/i, Gift],
  [/tidak tetap|sampingan/i, Sparkles],

  [/kost|kos|sewa|rumah/i, Home],
  [/orang tua|ortu|keluarga/i, HeartPulse],
  [/laundry|cuci/i, WashingMachine],
  [/bbm|bensin|pertamax/i, Fuel],
  [/motor|servis/i, Bike],
  [/makan|minum|kuliner|warteg|food/i, Utensils],
  [/kopi|coffee|cafe|kafe/i, Coffee],
  [/vape|rokok/i, Wind],
  [/olahraga|gym|fitness|sport/i, Dumbbell],
  [/transport|gojek|grab|ojek|taksi|travel/i, Car],
  [/tagihan|listrik|air|pdam/i, Receipt],
  [/internet|wifi|pulsa|kuota/i, Wifi],
  [/belanja|shopping|mart/i, ShoppingBag],
  [/hiburan|nonton|film|game/i, Clapperboard],
  [/kesehatan|dokter|obat|sehat/i, HeartPulse],
  [/pendidikan|kursus|sekolah|buku/i, GraduationCap],
  [/bank|bca|mandiri|bni|bri/i, Landmark],
  [/seabank|dana|ovo|gopay|e-?wallet/i, Smartphone],
  [/tunai|cash/i, Banknote],
  [/kartu|kredit/i, CreditCard],
]

export function iconForCategory(name: string | null | undefined): LucideIcon {
  if (!name) return Ellipsis
  for (const [pattern, icon] of RULES) {
    if (pattern.test(name)) return icon
  }
  return Ellipsis
}

export function iconForAccount(name: string | null | undefined): LucideIcon {
  if (!name) return Wallet
  for (const [pattern, icon] of RULES) {
    if (pattern.test(name)) return icon
  }
  return Landmark
}

export const TransferIcon = ArrowLeftRight

interface IconProps {
  name: string | null | undefined
  size?: number
  className?: string
}

/**
 * Resolves the icon inside its own component so callers don't bind a component
 * to a local during render — the lookup returns a stable reference either way,
 * but this keeps the call sites plain JSX.
 */
export function CategoryIcon({ name, size = 16, className }: IconProps) {
  return createElement(iconForCategory(name), { size, className })
}

export function AccountIcon({ name, size = 16, className }: IconProps) {
  return createElement(iconForAccount(name), { size, className })
}
