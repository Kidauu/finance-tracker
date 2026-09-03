export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  name: string
  type: TransactionType
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  transaction_date: string
  created_at: string
}

export interface TransactionWithCategory extends Transaction {
  category: Category | null
}

export type NewCategory = Pick<Category, 'name' | 'type' | 'color'>

export type NewTransaction = Pick<
  Transaction,
  'type' | 'amount' | 'category_id' | 'description' | 'transaction_date'
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
