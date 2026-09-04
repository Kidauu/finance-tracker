import { useId } from 'react'
import { groupDigits } from '../../lib/format'

interface CurrencyInputProps {
  value: string
  onChange: (rawDigits: string) => void
  placeholder?: string
  autoFocus?: boolean
  required?: boolean
  id?: string
  /** the design's hero amount field: label above, oversized figure, caret bar */
  hero?: boolean
  heroLabel?: string
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
  hero = false,
  heroLabel = 'Berapa?',
}: CurrencyInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  if (hero) {
    return (
      <label
        htmlFor={inputId}
        className="flex cursor-text flex-col gap-2 rounded-3xl border border-line bg-surface p-5"
      >
        <span className="text-xs font-bold text-muted">{heroLabel}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-muted">Rp</span>
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
            className="nums w-full min-w-0 border-none bg-transparent p-0 text-[34px] font-extrabold text-content outline-none placeholder:text-faint"
          />
        </span>
      </label>
    )
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-muted">
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
        className="nums h-[52px] w-full rounded-2xl border border-line-input bg-surface py-0 pl-11 pr-4 text-right text-lg font-extrabold text-content outline-none transition-colors placeholder:text-faint focus:border-accent"
      />
    </div>
  )
}
