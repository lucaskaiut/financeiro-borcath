import { useNavigate } from 'react-router'
import { Page, PageContent, PageHeader } from '@/shared/design-system'
import { toast } from '@/shared/stores/toast.store'
import { isApiError } from '@/shared/api/errors'
import { AccountForm } from '../forms/AccountForm'
import { useCreateAccount } from '../hooks/useAccounts'
import { accountsService } from '../services/accounts.service'

export default function AccountCreatePage() {
  const navigate = useNavigate()
  const create = useCreateAccount()

  return (
    <Page>
      <PageHeader
        title="Novo lançamento"
        description="Cadastre uma conta a pagar ou a receber."
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Contas', to: '/accounts' },
          { label: 'Novo' },
        ]}
      />
      <PageContent>
        <AccountForm
          mode="create"
          submitting={create.isPending}
          onSubmit={async (payload, documents) => {
            const result = await create.mutateAsync(payload)
            const accountId = result.data[0]?.id

            if (accountId && documents.length > 0) {
              try {
                await accountsService.uploadDocuments(accountId, documents)
                toast.success(
                  'Documentos anexados',
                  documents.length > 1 ? `${documents.length} documentos anexados com sucesso.` : 'Documento anexado com sucesso.',
                )
              } catch (error) {
                toast.error('Falha ao anexar', isApiError(error) ? error.message : 'Os documentos não foram anexados.')
              }
            }

            navigate('/accounts')
          }}
        />
      </PageContent>
    </Page>
  )
}
