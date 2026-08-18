import { useNavigate } from 'react-router'
import { Page, PageContent, PageHeader } from '@/shared/design-system'
import { AccountForm } from '../forms/AccountForm'
import { useCreateAccount } from '../hooks/useAccounts'

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
          onSubmit={async (payload) => {
            await create.mutateAsync(payload)
            navigate('/accounts')
          }}
        />
      </PageContent>
    </Page>
  )
}
