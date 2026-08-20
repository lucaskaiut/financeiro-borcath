import { http } from '@/shared/api/http'
import type { ApiResponse } from '@/shared/types/api'

export interface DailyReport {
  date: string
  payments: Array<{ description: string; cost_center: string | null; category: string | null; value: number }>
  receipts: Array<{ description: string; cost_center: string | null; category: string | null; value: number }>
  total_paid: number
  total_received: number
  balance: number
}

export interface WeeklyReport {
  from: string
  to: string
  total_paid: number
  total_received: number
  net_balance: number
}

export interface CategoryReport {
  from: string
  to: string
  income: Array<{ category: string; total: number }>
  expense: Array<{ category: string; total: number }>
}

export interface CostCenterReportRow {
  cost_center_id: string
  cost_center: string
  initial_balance: number
  income: number
  expense: number
  balance: number
}

export interface CashFlowStatement {
  realized: { from: string; to: string; opening_balance: number; total_in: number; total_out: number; final_balance: number }
  projected: { days: number; opening_balance: number; total_in: number; total_out: number }
  comparative: { realized_net: number; projected_net: number; expected_final_balance: number }
}

export interface PayableAccount {
  id: string
  description: string
  counterparty: string | null
  cost_center: string | null
  category: string | null
  value: number
  remaining_amount: number
  due_date: string
  installment: string | null
  status: string
  is_overdue: boolean
}

export interface PayablesReport {
  from: string
  to: string
  cost_center_id: string | null
  cost_center: string | null
  accounts: PayableAccount[]
  total_open: number
  total_overdue: number
  count: number
}

export const reportsService = {
  async daily(params: { date?: string }): Promise<DailyReport> {
    const response = await http.get<ApiResponse<DailyReport>>('/reports/daily', { params })
    return response.data.data
  },

  async weekly(params: { from?: string; to?: string }): Promise<WeeklyReport> {
    const response = await http.get<ApiResponse<WeeklyReport>>('/reports/weekly', { params })
    return response.data.data
  },

  async provision(params: { days?: number; cost_center_id?: string }): Promise<import('@/modules/cash-flow/services/cash-flow.service').ProjectedCashFlow> {
    const response = await http.get<ApiResponse<import('@/modules/cash-flow/services/cash-flow.service').ProjectedCashFlow>>('/reports/provision', { params })
    return response.data.data
  },

  async byCategory(params: { from?: string; to?: string }): Promise<CategoryReport> {
    const response = await http.get<ApiResponse<CategoryReport>>('/reports/by-category', { params })
    return response.data.data
  },

  async byCostCenter(): Promise<{ rows: CostCenterReportRow[] }> {
    const response = await http.get<ApiResponse<{ rows: CostCenterReportRow[] }>>('/reports/by-cost-center')
    return response.data.data
  },

  async cashFlow(params: { from?: string; to?: string; days?: number; cost_center_id?: string }): Promise<CashFlowStatement> {
    const response = await http.get<ApiResponse<CashFlowStatement>>('/reports/cash-flow', { params })
    return response.data.data
  },

  async payables(params: { from?: string; to?: string; cost_center_id?: string }): Promise<PayablesReport> {
    const response = await http.get<ApiResponse<PayablesReport>>('/reports/payables', { params })
    return response.data.data
  },
}
