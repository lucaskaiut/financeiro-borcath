import { useNavigate, useParams } from 'react-router'
import { Banknote } from 'lucide-react'
import { ButtonLink, Card, EmptyState, Page, PageContent, PageHeader, Skeleton } from '@/shared/design-system'
import { AccountForm } from '../forms/AccountForm'
import { useAccountQuery, useUpdateAccount } from '../hooks/useAccounts'

export default function AccountEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const query = useAccountQuery(id)
  const update = useUpdateAccount(id ?? '')

  return (
    <Page>
      <PageHeader
        title="Editar lançamento"
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Contas', to: '/accounts' },
          { label: 'Editar' },
        ]}
      />
      <PageContent>
        {query.isPending && (
          <Card>
            <Skeleton className="h-96 w-full" />
          </Card>
        )}

        {query.isError && (
          <Card>
            <EmptyState icon={Banknote} title="Lançamento não encontrado" action={<ButtonLink to="/accounts" variant="secondary">Voltar</ButtonLink>} />
          </Card>
        )}

        {query.data && (
          <AccountForm
            mode="edit"
            defaultValues={{
              type: query.data.type,
              description: query.data.description,
              counterparty: query.data.counterparty ?? '',
              cost_center_id: query.data.cost_center_id ?? '',
              category_id: query.data.category_id ?? '',
              value: String(query.data.value),
              due_date: query.data.due_date ?? '',
              expected_date: query.data.expected_date ?? '',
              observation: query.data.observation ?? '',
              installments: false,
              installment_quantity: '2',
              installment_interval: 'monthly',
            }}
            submitting={update.isPending}
            onSubmit={async (payload) => {
              await update.mutateAsync(payload)
              navigate('/accounts')
            }}
          />
        )}
      </PageContent>
    </Page>
  )
}
