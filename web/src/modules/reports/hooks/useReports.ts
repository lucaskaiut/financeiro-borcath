import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/constants/query-keys'
import { reportsService } from '../services/reports.service'

export function useDailyReport(params: { date?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.daily(params),
    queryFn: () => reportsService.daily(params),
  })
}

export function useWeeklyReport(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.weekly(params),
    queryFn: () => reportsService.weekly(params),
  })
}

export function useProvisionReport(params: { from?: string; to?: string; days?: number; cost_center_id?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.provision(params),
    queryFn: () => reportsService.provision(params),
  })
}

export function useCategoryReport(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.byCategory(params),
    queryFn: () => reportsService.byCategory(params),
  })
}

export function useCostCenterReport() {
  return useQuery({
    queryKey: queryKeys.reports.byCostCenter(),
    queryFn: () => reportsService.byCostCenter(),
  })
}

export function useCashFlowStatement(params: { from?: string; to?: string; days?: number; cost_center_id?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.cashFlow(params),
    queryFn: () => reportsService.cashFlow(params),
  })
}

export function usePayablesReport(params: { from?: string; to?: string; cost_center_id?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.payables(params),
    queryFn: () => reportsService.payables(params),
  })
}
