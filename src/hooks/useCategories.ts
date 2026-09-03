import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_CATEGORIES } from '../lib/defaultCategories'
import type { Category, NewCategory } from '../types'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useAddCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (category: NewCategory) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: userData.user.id })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          throw new Error(`Kategori "${category.name}" (${category.type}) sudah ada`)
        }
        throw error
      }
      return data as Category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

/**
 * Seeds any default categories the user doesn't have yet, matched by
 * (user_id, type, name). Safe to fire more than once — from a second tab,
 * a remount, or React StrictMode's double effect — because it upserts
 * against the DB's own unique(user_id, type, name) constraint with
 * ignoreDuplicates rather than diffing client-side state first, so
 * concurrent calls can never race each other into inserting duplicates.
 */
export function useSeedDefaultCategories(enabled: boolean) {
  const queryClient = useQueryClient()
  const seeded = useRef(false)

  useEffect(() => {
    if (!enabled || seeded.current) return
    seeded.current = true

    supabase.auth.getUser().then(async ({ data: userData }) => {
      if (!userData.user) return
      const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.user!.id }))
      const { error } = await supabase
        .from('categories')
        .upsert(rows, { onConflict: 'user_id,type,name', ignoreDuplicates: true })
      if (!error) queryClient.invalidateQueries({ queryKey: ['categories'] })
    })
  }, [enabled, queryClient])
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
