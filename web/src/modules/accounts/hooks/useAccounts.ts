import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type AccountListParams } from '@/shared/constants/query-keys'
import { toast } from '@/shared/stores/toast.store'
import { accountsService, type AccountPayload, type SettlePayload } from '../services/accounts.service'

export function useAccountsQuery(params: AccountListParams) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: () => accountsService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useAccountQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id ?? ''),
    queryFn: () => accountsService.get(id!),
    enabled: !!id,
  })
}

function invalidateAccounts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
  queryClient.invalidateQueries({ queryKey: ['cash-flow'] })
  queryClient.invalidateQueries({ queryKey: ['reports'] })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AccountPayload) => accountsService.create(payload),
    onSuccess: (data) => {
      invalidateAccounts(queryClient)
      const count = data.data.length
      toast.success('Conta criada', count > 1 ? `${count} parcelas geradas com sucesso.` : 'A conta foi criada com sucesso.')
    },
  })
}

export function useImportAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, costCenterId }: { file: File; costCenterId: string }) =>
      accountsService.importXlsx(file, costCenterId),
    onSuccess: (result) => {
      invalidateAccounts(queryClient)
      toast.success('Importação concluída', `${result.imported} contas importadas, ${result.skipped} ignoradas.`)
    },
  })
}

export function useUpdateAccount(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<AccountPayload>) => accountsService.update(id, payload),
    onSuccess: () => {
      invalidateAccounts(queryClient)
      toast.success('Conta atualizada', 'As alterações foram salvas.')
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountsService.remove(id),
    onSuccess: () => {
      invalidateAccounts(queryClient)
      toast.success('Conta removida', 'A conta foi excluída.')
    },
  })
}

export function useSettleAccount(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SettlePayload) => accountsService.settle(id, payload),
    onSuccess: () => {
      invalidateAccounts(queryClient)
      toast.success('Baixa registrada', 'A baixa foi registrada com sucesso.')
    },
  })
}

export function useUnsettleAccount(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settlementId: string) => accountsService.unsettle(id, settlementId),
    onSuccess: () => {
      invalidateAccounts(queryClient)
      toast.success('Baixa removida', 'A baixa foi removida.')
    },
  })
}

export function useCancelAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountsService.cancel(id),
    onSuccess: () => {
      invalidateAccounts(queryClient)
      toast.success('Conta cancelada', 'A conta foi cancelada.')
    },
  })
}
