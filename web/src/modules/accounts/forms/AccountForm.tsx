import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  Form,
  RadioGroupField,
  Section,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from '@/shared/design-system'
import { isApiError } from '@/shared/api/errors'
import { applyApiErrorsToForm } from '@/shared/utils/forms'
import { useCostCenterOptions } from '@/modules/cost-centers/hooks/useCostCenters'
import { useCategoryOptions } from '@/modules/categories/hooks/useCategories'
import { accountSchema, type AccountFormValues } from '../schemas/account.schema'
import type { AccountPayload } from '../services/accounts.service'

interface AccountFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<AccountFormValues>
  submitting: boolean
  onSubmit: (payload: AccountPayload) => Promise<unknown>
}

export function AccountForm({ mode, defaultValues, submitting, onSubmit }: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'payable',
      description: '',
      counterparty: '',
      cost_center_id: '',
      category_id: '',
      value: '',
      due_date: '',
      expected_date: '',
      observation: '',
      installments: false,
      installment_quantity: '2',
      installment_interval: 'monthly',
      ...defaultValues,
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const installments = useWatch({ control: form.control, name: 'installments' })

  const costCenters = useCostCenterOptions()
  const categories = useCategoryOptions(type === 'receivable' ? 'income' : 'expense')

  const handleSubmit = async (values: AccountFormValues) => {
    const payload: AccountPayload = {
      type: values.type,
      description: values.description,
      counterparty: values.counterparty || null,
      cost_center_id: values.cost_center_id,
      category_id: values.category_id,
      value: Number(values.value),
      due_date: values.due_date,
      expected_date: values.expected_date || null,
      observation: values.observation || null,
      installments:
        mode === 'create' && values.installments
          ? { quantity: Number(values.installment_quantity), interval: values.installment_interval }
          : null,
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        applyApiErrorsToForm(form, error)
      }
    }
  }

  return (
    <Card>
      <CardContent>
        <Form form={form} onSubmit={handleSubmit} className="space-y-8">
          <Section title="Tipo de lançamento">
            <RadioGroupField
              name="type"
              options={[
                { value: 'payable', label: 'Conta a pagar' },
                { value: 'receivable', label: 'Conta a receber' },
              ]}
            />
          </Section>

          <Section title="Informações do lançamento">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="description" label="Descrição" required className="sm:col-span-2" />
              <TextField
                name="counterparty"
                label={type === 'receivable' ? 'Cliente' : 'Fornecedor'}
                className="sm:col-span-2"
              />
              <SelectField
                name="cost_center_id"
                label="Centro de custo"
                options={costCenters.data ?? []}
                placeholder="Selecione"
                required
              />
              <SelectField
                name="category_id"
                label="Categoria"
                options={categories.data ?? []}
                placeholder="Selecione"
                required
              />
              <TextField name="value" label="Valor" type="number" step="0.01" min="0" required />
              <TextField name="due_date" label="Data de vencimento" type="date" required />
              <TextField name="expected_date" label={type === 'receivable' ? 'Data prevista de recebimento' : 'Data prevista de pagamento'} type="date" />
            </div>
          </Section>

          <Section title="Observação">
            <TextareaField name="observation" rows={3} />
          </Section>

          {mode === 'create' && (
            <Section title="Parcelamento" description="Divida o valor em parcelas iguais.">
              <SwitchField name="installments" label="Parcelar este lançamento" />
              {installments && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="installment_quantity" label="Quantidade de parcelas" type="number" min="1" max="120" />
                  <SelectField
                    name="installment_interval"
                    label="Intervalo entre parcelas"
                    options={[
                      { value: 'daily', label: 'Diário' },
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'monthly', label: 'Mensal' },
                    ]}
                  />
                </div>
              )}
            </Section>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ButtonLink to="/accounts" variant="secondary">
              Cancelar
            </ButtonLink>
            <Button type="submit" loading={submitting}>
              {mode === 'create' ? 'Criar lançamento' : 'Salvar alterações'}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}
