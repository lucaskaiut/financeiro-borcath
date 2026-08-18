import { useNavigate } from 'react-router'
import { Page, PageContent, PageHeader } from '@/shared/design-system'
import { RecurrenceForm } from '../forms/RecurrenceForm'
import { useCreateRecurrence } from '../hooks/useRecurrences'

export default function RecurrenceCreatePage() {
  const navigate = useNavigate()
  const create = useCreateRecurrence()

  return (
    <Page>
      <PageHeader
        title="Nova recorrência"
        description="Crie um lançamento recorrente."
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Recorrências', to: '/recurrences' },
          { label: 'Nova' },
        ]}
      />
      <PageContent>
        <RecurrenceForm
          mode="create"
          submitting={create.isPending}
          onSubmit={async (payload) => {
            await create.mutateAsync(payload)
            navigate('/recurrences')
          }}
        />
      </PageContent>
    </Page>
  )
}
