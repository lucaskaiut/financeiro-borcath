<?php

namespace App\Modules\Account\Http\Requests;

use App\Modules\Account\Enums\AccountType;
use App\Modules\Tenant\Support\Facades\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'required', 'string', Rule::in(AccountType::values())],
            'description' => ['sometimes', 'required', 'string', 'max:255'],
            'counterparty' => ['nullable', 'string', 'max:255'],
            'cost_center_id' => [
                'sometimes',
                'required',
                'string',
                Rule::exists('cost_centers', 'uuid')->where(fn ($q) => $q->where('tenant_id', TenantContext::tenantId())),
            ],
            'category_id' => [
                'sometimes',
                'required',
                'string',
                Rule::exists('categories', 'uuid')->where(fn ($q) => $q->where('tenant_id', TenantContext::tenantId())),
            ],
            'value' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'due_date' => ['sometimes', 'required', 'date'],
            'expected_date' => ['nullable', 'date'],
            'observation' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('value')) {
            $this->merge(['value' => (float) $this->input('value')]);
        }
    }
}
