import { useId } from 'react'
import { groupDigits } from '../../lib/format'

interface CurrencyInputProps {
  value: string
  onChange: (rawDigits: string) => void
  placeholder?: string
  autoFocus?: boolean
  required?: boolean
  id?: string
}

/**
 * IDR amount field. Keeps the raw digit string in state but always shows it
 * grouped ("5.000.000"), because unformatted seven-digit rupiah amounts are
 * genuinely hard to read back and easy to fat-finger by a factor of ten.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  required,
  id,
}: CurrencyInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-white/40">
        Rp
      </span>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        required={required}
        value={groupDigits(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-right text-lg font-semibold tabular-nums text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  )
}
