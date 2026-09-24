import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTransactions } from './useTransactions'
import type {
  Account,
  AccountBalance,
  AccountReconciliation,
  NewAccount,
} from '../types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useAddAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (account: NewAccount) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, user_id: userData.user.id })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') throw new Error(`Rekening "${account.name}" sudah ada`)
        throw error
      }
      return data as Account
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NewAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Account
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Income/expense rows survive with account_id nulled by the FK, but a
      // transfer requires both endpoints — nulling one would break the check
      // constraint and abort the delete, so remove those transfers first.
      const { error: transferError } = await supabase
        .from('transactions')
        .delete()
        .eq('type', 'transfer')
        .or(`account_id.eq.${id},to_account_id.eq.${id}`)
      if (transferError) throw transferError

      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useAccountReconciliations(accountId: string | null) {
  return useQuery({
    queryKey: ['account-reconciliations', accountId],
    enabled: Boolean(accountId),
    queryFn: async (): Promise<AccountReconciliation[]> => {
      const { data, error } = await supabase
        .from('account_reconciliations')
        .select('*')
        .eq('account_id', accountId!)
        .order('reconciled_at', { ascending: false })
      if (error) throw error
      return data as AccountReconciliation[]
    },
  })
}

export function useReconcileAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      accountId,
      actualBalance,
    }: {
      accountId: string
      actualBalance: number
    }) => {
      const { data, error } = await supabase.rpc('reconcile_account', {
        p_account_id: accountId,
        p_actual_balance: actualBalance,
      })
      if (error) throw error
      return data as AccountReconciliation
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({
        queryKey: ['account-reconciliations', variables.accountId],
      })
    },
  })
}

/**
 * Live balance per account, over the full history (balances are cumulative,
 * so they can't be scoped to a pay period). Transfers move value between two
 * accounts without touching income or expense.
 */
export function useAccountBalances() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: transactions, isLoading: txLoading } = useTransactions()

  const balances = useMemo<AccountBalance[]>(() => {
    const byId = new Map<string, AccountBalance>()
    for (const account of accounts ?? []) {
      byId.set(account.id, {
        account,
        balance: account.opening_balance,
        totalIn: 0,
        totalOut: 0,
      })
    }

    for (const t of transactions ?? []) {
      if (t.type === 'income') {
        const target = t.account_id ? byId.get(t.account_id) : undefined
        if (target) {
          target.balance += t.amount
          target.totalIn += t.amount
        }
      } else if (t.type === 'expense') {
        const source = t.account_id ? byId.get(t.account_id) : undefined
        if (source) {
          source.balance -= t.amount
          source.totalOut += t.amount
        }
      } else {
        const source = t.account_id ? byId.get(t.account_id) : undefined
        const target = t.to_account_id ? byId.get(t.to_account_id) : undefined
        if (source) {
          source.balance -= t.amount
          source.totalOut += t.amount
        }
        if (target) {
          target.balance += t.amount
          target.totalIn += t.amount
        }
      }
    }

    return Array.from(byId.values())
  }, [accounts, transactions])

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0)

  return { balances, totalBalance, isLoading: accountsLoading || txLoading }
}
