<?php

namespace App\Modules\Reconciliation\Http\Requests;

use App\Modules\Account\Enums\AccountType;
use App\Modules\Tenant\Support\Facades\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateFromTransactionRequest extends FormRequest
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
            'type' => ['required', 'string', Rule::in(AccountType::values())],
            'description' => ['required', 'string', 'max:255'],
            'category_id' => [
                'required',
                'string',
                Rule::exists('categories', 'uuid')->where(fn ($q) => $q->where('tenant_id', TenantContext::tenantId())),
            ],
            'observation' => ['nullable', 'string'],
        ];
    }
}
