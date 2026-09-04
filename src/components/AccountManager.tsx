import { useState, type FormEvent } from 'react'
import {
  useAccounts,
  useAccountBalances,
  useAddAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../hooks/useAccounts'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input, Label, Select } from './ui/Input'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { CurrencyInput } from './ui/CurrencyInput'
import { formatIDR } from '../lib/format'
import { SWATCHES } from '../lib/colorSwatches'
import type { Account, AccountKind } from '../types'

export function AccountManager() {
  const { data: accounts } = useAccounts()
  const { balances } = useAccountBalances()
  const addAccount = useAddAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const { showToast } = useToast()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('spending')
  const [color, setColor] = useState(SWATCHES[0])
  const [openingBalance, setOpeningBalance] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null)
  const [reconcilingId, setReconcilingId] = useState<string | null>(null)
  const [reconcileValue, setReconcileValue] = useState('')

  function startReconcile(accountId: string, currentBalance: number) {
    setReconcilingId(accountId)
    setReconcileValue(String(Math.round(currentBalance)))
  }

  /**
   * Reconciles to the real bank balance by shifting the opening balance by the
   * difference, rather than inventing an adjustment transaction — the history
   * of what was actually spent stays untouched.
   */
  async function saveReconcile(account: Account, currentBalance: number) {
    const actual = Number(reconcileValue)
    if (!Number.isFinite(actual)) {
      showToast('Jumlah tidak valid', 'error')
      return
    }
    const delta = actual - currentBalance
    if (delta === 0) {
      setReconcilingId(null)
      return
    }
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        opening_balance: account.opening_balance + delta,
      })
      showToast(`Saldo ${account.name} disesuaikan`)
      setReconcilingId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyesuaikan saldo', 'error')
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama rekening wajib diisi')
      return
    }
    try {
      await addAccount.mutateAsync({
        name: name.trim(),
        kind,
        color,
        opening_balance: Number(openingBalance) || 0,
        is_payroll: false,
      })
      showToast(`Rekening "${name.trim()}" ditambahkan`)
      setName('')
      setOpeningBalance('')
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah rekening')
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteAccount.mutateAsync(pendingDelete.id)
      showToast(`Rekening "${pendingDelete.name}" dihapus`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus rekening', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {(accounts ?? []).map((a) => {
          const balance = balances.find((b) => b.account.id === a.id)?.balance ?? 0
          return (
            <div key={a.id} className="rounded-xl bg-white/5 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{a.name}</p>
                  <p className="text-xs text-white/40">{formatIDR(balance)}</p>
                </div>
                <button
                  onClick={() => startReconcile(a.id, balance)}
                  className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Sesuaikan
                </button>
                <button
                  onClick={() => setPendingDelete(a)}
                  aria-label={`Hapus rekening ${a.name}`}
                  className="shrink-0 text-xs text-white/30 hover:text-red-400"
                >
                  Hapus
                </button>
              </div>

              {reconcilingId === a.id && (
                <div className="mt-3 rounded-lg bg-white/5 p-3">
                  <Label htmlFor={`rec-${a.id}`}>Saldo asli di aplikasi bank</Label>
                  <CurrencyInput
                    id={`rec-${a.id}`}
                    value={reconcileValue}
                    onChange={setReconcileValue}
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-white/40">
                    Selisihnya dicatat sebagai saldo awal, jadi riwayat transaksimu gak berubah.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setReconcilingId(null)}
                      className="flex-1 !py-1.5 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => saveReconcile(a, balance)}
                      disabled={updateAccount.isPending}
                      className="flex-1 !py-1.5 text-xs"
                    >
                      Simpan
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <Select
                  value={a.kind}
                  onChange={(e) =>
                    updateAccount.mutate({ id: a.id, kind: e.target.value as AccountKind })
                  }
                  className="!py-1.5 !text-xs"
                >
                  <option value="spending">Pengeluaran harian</option>
                  <option value="savings">Simpanan / darurat</option>
                </Select>
                <button
                  type="button"
                  onClick={() => updateAccount.mutate({ id: a.id, is_payroll: !a.is_payroll })}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    a.is_payroll ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 text-white/40'
                  }`}
                >
                  Payroll
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-xl bg-white/5 p-3.5">
          <div>
            <Label htmlFor="acc-name">Nama rekening</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Dompet / GoPay"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="acc-kind">Jenis</Label>
            <Select
              id="acc-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
            >
              <option value="spending">Pengeluaran harian</option>
              <option value="savings">Simpanan / darurat</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="acc-balance">Saldo awal</Label>
            <CurrencyInput
              id="acc-balance"
              value={openingBalance}
              onChange={setOpeningBalance}
            />
          </div>
          <div>
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Pilih warna ${s}`}
                  onClick={() => setColor(s)}
                  className={`h-7 w-7 rounded-full ${color === s ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: s }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAdding(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button type="submit" disabled={addAccount.isPending} className="flex-1">
              {addAccount.isPending ? 'Menambah…' : 'Tambah'}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + Rekening baru
        </Button>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus rekening?"
        message={
          pendingDelete
            ? `Rekening "${pendingDelete.name}" akan dihapus. Transaksi lama tetap tersimpan tapi jadi tanpa rekening, dan transfer yang melibatkannya ikut terhapus.`
            : ''
        }
        busy={deleteAccount.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
