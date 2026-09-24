/** Categories only ever describe money in or out. */
export type CategoryType = 'income' | 'expense'

/**
 * Transfers move money between the user's own accounts. They are never
 * counted as income or expense — doing so would book the same rupiah twice.
 */
export type TransactionType = CategoryType | 'transfer'

export type AccountKind = 'spending' | 'savings'

export interface Account {
  id: string
  user_id: string
  name: string
  kind: AccountKind
  color: string
  opening_balance: number
  is_payroll: boolean
  created_at: string
}

export type NewAccount = Pick<
  Account,
  'name' | 'kind' | 'color' | 'opening_balance' | 'is_payroll'
>

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  account_id: string | null
  /** destination account — set only on transfers */
  to_account_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  transaction_date: string
  created_at: string
}

export interface TransactionWithCategory extends Transaction {
  category: Category | null
  account: Account | null
  to_account: Account | null
}

export type NewCategory = Pick<Category, 'name' | 'type' | 'color'>

export type NewTransaction = Pick<
  Transaction,
  | 'type'
  | 'amount'
  | 'category_id'
  | 'account_id'
  | 'to_account_id'
  | 'description'
  | 'transaction_date'
>

export interface Holiday {
  id: string
  user_id: string
  holiday_date: string
  name: string | null
  created_at: string
}

export type NewHoliday = Pick<Holiday, 'holiday_date' | 'name'>

export interface Budget {
  id: string
  user_id: string
  category_id: string
  monthly_amount: number
  created_at: string
  updated_at: string
}

export interface BudgetWithCategory extends Budget {
  category: Category
}

export interface AccountBalance {
  account: Account
  balance: number
  totalIn: number
  totalOut: number
}

/** A saved reconciliation between the app's calculated balance and the real one. */
export interface AccountReconciliation {
  id: string
  user_id: string
  account_id: string
  expected_balance: number
  actual_balance: number
  adjustment: number
  reconciled_at: string
}
