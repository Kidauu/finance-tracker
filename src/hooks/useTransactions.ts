import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NewTransaction, Transaction, TransactionWithCategory } from '../types'

export interface DateRange {
  from?: string // ISO date, inclusive
  to?: string // ISO date, inclusive
}

export function useTransactions(range?: DateRange) {
  return useQuery({
    queryKey: ['transactions', range?.from ?? null, range?.to ?? null],
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      let query = supabase
        .from('transactions')
        .select(
          '*, category:categories(*), account:accounts!transactions_account_id_fkey(*), to_account:accounts!transactions_to_account_id_fkey(*)',
        )
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (range?.from) query = query.gte('transaction_date', range.from)
      if (range?.to) query = query.lte('transaction_date', range.to)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as TransactionWithCategory[]
    },
  })
}

export function useAddTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transaction: NewTransaction) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: userData.user.id })
        .select()
        .single()
      if (error) throw error
      return data as Transaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NewTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Transaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
