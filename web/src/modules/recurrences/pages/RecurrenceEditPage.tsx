import { useNavigate, useParams } from 'react-router'
import { Repeat } from 'lucide-react'
import { ButtonLink, Card, EmptyState, Page, PageContent, PageHeader, Skeleton } from '@/shared/design-system'
import { RecurrenceForm } from '../forms/RecurrenceForm'
import { useRecurrenceQuery, useUpdateRecurrence } from '../hooks/useRecurrences'

export default function RecurrenceEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const query = useRecurrenceQuery(id)
  const update = useUpdateRecurrence(id ?? '')

  return (
    <Page>
      <PageHeader
        title="Editar recorrência"
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Recorrências', to: '/recurrences' },
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
            <EmptyState icon={Repeat} title="Recorrência não encontrada" action={<ButtonLink to="/recurrences" variant="secondary">Voltar</ButtonLink>} />
          </Card>
        )}

        {query.data && (
          <RecurrenceForm
            mode="edit"
            defaultValues={{
              type: query.data.type as 'payable' | 'receivable',
              description: query.data.description,
              counterparty: query.data.counterparty ?? '',
              cost_center_id: query.data.cost_center_id ?? '',
              category_id: query.data.category_id ?? '',
              value: String(query.data.value),
              frequency: query.data.frequency,
              start_date: query.data.start_date,
              end_date: query.data.end_date ?? '',
              max_occurrences: query.data.max_occurrences ? String(query.data.max_occurrences) : '',
              day_of_month: query.data.day_of_month ? String(query.data.day_of_month) : '',
              scope: 'all',
            }}
            submitting={update.isPending}
            onSubmit={async (payload) => {
              await update.mutateAsync(payload)
              navigate('/recurrences')
            }}
          />
        )}
      </PageContent>
    </Page>
  )
}
