import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { BudgetWithCategory } from '../types'

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: async (): Promise<BudgetWithCategory[]> => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as BudgetWithCategory[]
    },
  })
}

export function useSetBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      categoryId,
      monthlyAmount,
    }: {
      categoryId: string
      monthlyAmount: number
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            user_id: userData.user.id,
            category_id: categoryId,
            monthly_amount: monthlyAmount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,category_id' },
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
