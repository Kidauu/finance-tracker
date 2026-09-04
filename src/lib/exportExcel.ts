import ExcelJS from 'exceljs'
import type { TransactionWithCategory } from '../types'
import { formatDateShort } from './format'

export interface CategoryTotal {
  name: string
  value: number
  color: string
}

export interface MonthlyTotal {
  month: string
  income: number
  expense: number
}

export interface AccountTotal {
  name: string
  balance: number
  color: string
  kind: string
}

export interface ExcelExportInput {
  periodLabel: string
  from: string
  to: string
  totalIncome: number
  totalExpense: number
  expenseByCategory: CategoryTotal[]
  incomeByCategory: CategoryTotal[]
  monthly: MonthlyTotal[]
  accounts: AccountTotal[]
  transactions: TransactionWithCategory[]
}

const IDR_FMT = '"Rp"#,##0;[Red]-"Rp"#,##0'
const HEADER_FILL = 'FF1E1B4B'
const INCOME_FILL = 'FFDCFCE7'
const INCOME_TEXT = 'FF166534'
const EXPENSE_FILL = 'FFFEE2E2'
const EXPENSE_TEXT = 'FF991B1B'
const NET_FILL = 'FFE0E7FF'
const NET_TEXT = 'FF3730A3'
const TRANSFER_TEXT = 'FF0369A1'
const TABLE_HEADER_FILL = 'FFF3F4F6'
const BAND_FILL = 'FFF9FAFB'
const BORDER_COLOR = 'FFE5E7EB'

let cfPriority = 1
function nextPriority() {
  return cfPriority++
}

function toARGB(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase().padStart(6, '0')
}

// exceljs's type defs omit `color` on DataBarRuleType even though the
// renderer reads it (lib/xlsx/xform/sheet/cf/databar-xform.js) — bridge it
// with a local type rather than losing the color entirely.
type DataBarRule = ExcelJS.DataBarRuleType & { color: { argb: string } }

function dataBarRule(colorArgb: string): DataBarRule {
  return {
    type: 'dataBar',
    priority: nextPriority(),
    gradient: false,
    border: false,
    showValue: true,
    minLength: 0,
    maxLength: 100,
    cfvo: [{ type: 'min' }, { type: 'max' }],
    color: { argb: colorArgb },
  }
}

function thinBorder() {
  return {
    top: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
    left: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
    right: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  }
}

function addSummaryRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: number,
  fillArgb: string,
  textArgb: string,
) {
  const swatch = sheet.getCell(row, 1)
  const labelCell = sheet.getCell(row, 2)
  const spacerCell = sheet.getCell(row, 3)
  const valueCell = sheet.getCell(row, 4)

  sheet.mergeCells(row, 2, row, 3)

  for (const cell of [swatch, labelCell, spacerCell, valueCell]) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } }
  }
  swatch.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: textArgb } }

  labelCell.value = label
  labelCell.font = { bold: true, color: { argb: textArgb }, size: 11 }
  labelCell.alignment = { vertical: 'middle' }

  valueCell.value = value
  valueCell.numFmt = IDR_FMT
  valueCell.font = { bold: true, color: { argb: textArgb }, size: 14 }
  valueCell.alignment = { vertical: 'middle', horizontal: 'right' }

  sheet.getRow(row).height = 26
}

function addCategoryTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  categories: CategoryTotal[],
  total: number,
): number {
  let row = startRow

  const titleCell = sheet.getCell(row, 1)
  sheet.mergeCells(row, 1, row, 4)
  titleCell.value = title
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF111827' } }
  row += 1

  const headerRow = row
  const headers = ['', 'Kategori', 'Jumlah', '% dari Total']
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL } }
    cell.border = thinBorder()
    cell.alignment = { vertical: 'middle' }
  })
  row += 1

  const firstDataRow = row
  for (const cat of categories) {
    const swatch = sheet.getCell(row, 1)
    const nameCell = sheet.getCell(row, 2)
    const amountCell = sheet.getCell(row, 3)
    const pctCell = sheet.getCell(row, 4)

    swatch.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(cat.color) } }
    nameCell.value = cat.name
    amountCell.value = cat.value
    amountCell.numFmt = IDR_FMT
    pctCell.value = total > 0 ? cat.value / total : 0
    pctCell.numFmt = '0.0%'

    for (const cell of [swatch, nameCell, amountCell, pctCell]) {
      cell.border = thinBorder()
      cell.alignment = { vertical: 'middle' }
    }
    row += 1
  }
  const lastDataRow = row - 1

  if (categories.length > 0 && lastDataRow >= firstDataRow) {
    sheet.addConditionalFormatting({
      ref: `C${firstDataRow}:C${lastDataRow}`,
      rules: [dataBarRule('FF818CF8')],
    })
  }

  // total row
  const totalLabel = sheet.getCell(row, 2)
  const totalValue = sheet.getCell(row, 3)
  totalLabel.value = 'Total'
  totalLabel.font = { bold: true }
  totalValue.value = total
  totalValue.numFmt = IDR_FMT
  totalValue.font = { bold: true }
  for (const cell of [sheet.getCell(row, 1), totalLabel, totalValue, sheet.getCell(row, 4)]) {
    cell.border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } }
  }
  row += 1

  return row + 1 // blank spacer row
}

function addAccountTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  accounts: AccountTotal[],
): number {
  if (accounts.length === 0) return startRow

  let row = startRow
  const titleCell = sheet.getCell(row, 1)
  sheet.mergeCells(row, 1, row, 4)
  titleCell.value = 'Saldo per Rekening'
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF111827' } }
  row += 1

  const headerRow = row
  ;['', 'Rekening', 'Jenis', 'Saldo'].forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL } }
    cell.border = thinBorder()
  })
  row += 1

  let total = 0
  for (const a of accounts) {
    total += a.balance
    const swatch = sheet.getCell(row, 1)
    const nameCell = sheet.getCell(row, 2)
    const kindCell = sheet.getCell(row, 3)
    const balanceCell = sheet.getCell(row, 4)

    swatch.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(a.color) } }
    nameCell.value = a.name
    kindCell.value = a.kind
    balanceCell.value = a.balance
    balanceCell.numFmt = IDR_FMT
    balanceCell.font = { bold: true, color: { argb: a.balance >= 0 ? NET_TEXT : EXPENSE_TEXT } }

    for (const cell of [swatch, nameCell, kindCell, balanceCell]) {
      cell.border = thinBorder()
    }
    row += 1
  }

  const totalLabel = sheet.getCell(row, 2)
  const totalValue = sheet.getCell(row, 4)
  totalLabel.value = 'Total'
  totalLabel.font = { bold: true }
  totalValue.value = total
  totalValue.numFmt = IDR_FMT
  totalValue.font = { bold: true }
  for (let c = 1; c <= 4; c++) {
    sheet.getCell(row, c).border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } }
  }
  row += 1

  return row + 1
}

function addMonthlyTable(sheet: ExcelJS.Worksheet, startRow: number, monthly: MonthlyTotal[]): number {
  let row = startRow

  const titleCell = sheet.getCell(row, 1)
  sheet.mergeCells(row, 1, row, 4)
  titleCell.value = 'Tren per Periode Gaji'
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF111827' } }
  row += 1

  const headerRow = row
  ;['Periode', 'Pemasukan', 'Pengeluaran', 'Selisih'].forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL } }
    cell.border = thinBorder()
  })
  row += 1

  const firstDataRow = row
  for (const m of monthly) {
    const net = m.income - m.expense
    const monthCell = sheet.getCell(row, 1)
    const incomeCell = sheet.getCell(row, 2)
    const expenseCell = sheet.getCell(row, 3)
    const netCell = sheet.getCell(row, 4)

    monthCell.value = m.month
    incomeCell.value = m.income
    incomeCell.numFmt = IDR_FMT
    expenseCell.value = m.expense
    expenseCell.numFmt = IDR_FMT
    netCell.value = net
    netCell.numFmt = IDR_FMT
    netCell.font = { color: { argb: net >= 0 ? INCOME_TEXT : EXPENSE_TEXT }, bold: true }

    for (const cell of [monthCell, incomeCell, expenseCell, netCell]) {
      cell.border = thinBorder()
    }
    row += 1
  }
  const lastDataRow = row - 1

  if (monthly.length > 0 && lastDataRow >= firstDataRow) {
    sheet.addConditionalFormatting({
      ref: `B${firstDataRow}:B${lastDataRow}`,
      rules: [dataBarRule('FF34D399')],
    })
    sheet.addConditionalFormatting({
      ref: `C${firstDataRow}:C${lastDataRow}`,
      rules: [dataBarRule('FFF87171')],
    })
  }

  return row + 1
}

export async function exportReportToExcel(input: ExcelExportInput): Promise<void> {
  cfPriority = 1
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Finance Tracker'
  workbook.created = new Date()

  const dash = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] })
  dash.columns = [{ width: 3 }, { width: 24 }, { width: 16 }, { width: 14 }]

  const titleCell = dash.getCell(1, 1)
  dash.mergeCells(1, 1, 1, 4)
  titleCell.value = 'FINANCE TRACKER — LAPORAN KEUANGAN'
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  titleCell.alignment = { vertical: 'middle' }
  dash.getRow(1).height = 28

  const subtitleCell = dash.getCell(2, 1)
  dash.mergeCells(2, 1, 2, 4)
  subtitleCell.value = `${input.periodLabel} · ${formatDateShort(input.from)} – ${formatDateShort(input.to)}`
  subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
  dash.getRow(2).height = 20

  addSummaryRow(dash, 4, 'Total Pemasukan', input.totalIncome, INCOME_FILL, INCOME_TEXT)
  addSummaryRow(dash, 5, 'Total Pengeluaran', input.totalExpense, EXPENSE_FILL, EXPENSE_TEXT)
  addSummaryRow(dash, 6, 'Saldo Bersih', input.totalIncome - input.totalExpense, NET_FILL, NET_TEXT)

  let row = 8
  row = addAccountTable(dash, row, input.accounts)
  row = addCategoryTable(dash, row, 'Rincian Pengeluaran per Kategori', input.expenseByCategory, input.totalExpense)
  row = addCategoryTable(dash, row, 'Rincian Pemasukan per Kategori', input.incomeByCategory, input.totalIncome)
  addMonthlyTable(dash, row, input.monthly)

  const txSheet = workbook.addWorksheet('Transaksi', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  txSheet.columns = [
    { width: 14 },
    { width: 12 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 34 },
  ]

  const txHeader = ['Tanggal', 'Tipe', 'Kategori', 'Rekening', 'Jumlah', 'Catatan']
  txHeader.forEach((h, i) => {
    const cell = txSheet.getCell(1, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.alignment = { vertical: 'middle' }
  })
  txSheet.getRow(1).height = 22

  const sorted = [...input.transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date),
  )

  sorted.forEach((t, idx) => {
    const r = idx + 2
    const dateCell = txSheet.getCell(r, 1)
    const typeCell = txSheet.getCell(r, 2)
    const catCell = txSheet.getCell(r, 3)
    const accountCell = txSheet.getCell(r, 4)
    const amountCell = txSheet.getCell(r, 5)
    const noteCell = txSheet.getCell(r, 6)

    const isTransfer = t.type === 'transfer'

    dateCell.value = formatDateShort(t.transaction_date)
    typeCell.value = isTransfer ? 'Transfer' : t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
    typeCell.font = {
      color: {
        argb: isTransfer ? TRANSFER_TEXT : t.type === 'income' ? INCOME_TEXT : EXPENSE_TEXT,
      },
    }
    catCell.value = isTransfer ? '—' : (t.category?.name ?? 'Tanpa kategori')
    accountCell.value = isTransfer
      ? `${t.account?.name ?? '?'} → ${t.to_account?.name ?? '?'}`
      : (t.account?.name ?? 'Tanpa rekening')
    amountCell.value = t.amount
    amountCell.numFmt = IDR_FMT
    noteCell.value = t.description ?? ''

    const bandFill = idx % 2 === 1 ? BAND_FILL : 'FFFFFFFF'
    for (const cell of [dateCell, typeCell, catCell, accountCell, amountCell, noteCell]) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFill } }
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER_COLOR } } }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const filename = `finance-tracker_${input.periodLabel.toLowerCase().replace(/\s+/g, '-')}_${input.to}.xlsx`
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
