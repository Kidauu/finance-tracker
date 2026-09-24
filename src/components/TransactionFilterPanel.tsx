import { Check } from 'lucide-react'
import { Button } from './ui/Button'
import { CategoryIcon, AccountIcon } from '../lib/categoryIcons'
import type { Account, Category, CategoryType } from '../types'

interface TransactionFilterPanelProps {
  /** categories available to pick from — already narrowed to the active type filter */
  categories: Category[]
  /** when the type filter is 'all', categories are grouped by this */
  groupByType: boolean
  accounts: Account[]
  selectedCategoryIds: Set<string>
  selectedAccountIds: Set<string>
  onToggleCategory: (id: string) => void
  onToggleAccount: (id: string) => void
  onReset: () => void
  onClose: () => void
}

const TYPE_GROUP_LABEL: Record<CategoryType, string> = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
}

function CategoryChip({
  category,
  selected,
  onClick,
}: {
  category: Category
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={selected ? { borderColor: category.color, color: category.color } : undefined}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
        selected ? 'border-[1.5px] bg-surface-alt' : 'border border-line-input bg-surface text-label'
      }`}
    >
      <CategoryIcon name={category.name} size={13} />
      {category.name}
      {selected && <Check size={12} strokeWidth={3} />}
    </button>
  )
}

function AccountChip({
  account,
  selected,
  onClick,
}: {
  account: Account
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={selected ? { borderColor: account.color, color: account.color } : undefined}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
        selected ? 'border-[1.5px] bg-surface-alt' : 'border border-line-input bg-surface text-label'
      }`}
    >
      <AccountIcon name={account.name} size={13} />
      {account.name}
      {selected && <Check size={12} strokeWidth={3} />}
    </button>
  )
}

export function TransactionFilterPanel({
  categories,
  groupByType,
  accounts,
  selectedCategoryIds,
  selectedAccountIds,
  onToggleCategory,
  onToggleAccount,
  onReset,
  onClose,
}: TransactionFilterPanelProps) {
  const hasSelection = selectedCategoryIds.size > 0 || selectedAccountIds.size > 0

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <div className="flex flex-col gap-5">
      {categories.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-label">Kategori</span>

          {groupByType ? (
            <>
              {expenseCategories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-subtle">
                    {TYPE_GROUP_LABEL.expense}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {expenseCategories.map((c) => (
                      <CategoryChip
                        key={c.id}
                        category={c}
                        selected={selectedCategoryIds.has(c.id)}
                        onClick={() => onToggleCategory(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {incomeCategories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-subtle">
                    {TYPE_GROUP_LABEL.income}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {incomeCategories.map((c) => (
                      <CategoryChip
                        key={c.id}
                        category={c}
                        selected={selectedCategoryIds.has(c.id)}
                        onClick={() => onToggleCategory(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  category={c}
                  selected={selectedCategoryIds.has(c.id)}
                  onClick={() => onToggleCategory(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Transfer gak punya kategori.</p>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-label">Rekening</span>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <AccountChip
              key={a.id}
              account={a}
              selected={selectedAccountIds.has(a.id)}
              onClick={() => onToggleAccount(a.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2.5 border-t border-line pt-5">
        <Button
          type="button"
          variant="secondary"
          onClick={onReset}
          disabled={!hasSelection}
          className="flex-1"
        >
          Reset
        </Button>
        <Button type="button" onClick={onClose} className="flex-1">
          Terapkan
        </Button>
      </div>
    </div>
  )
}
