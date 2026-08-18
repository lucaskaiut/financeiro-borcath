<?php

namespace App\Modules\Account\Services;

use App\Modules\Account\Enums\AccountStatus;
use App\Modules\Account\Models\FinancialAccount;
use App\Modules\Account\Models\Settlement;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AccountService
{
    /**
     * @param  array{per_page?: int, search?: ?string, type?: ?string, status?: ?string, cost_center_id?: ?string, category_id?: ?string, due_from?: ?string, due_to?: ?string, installment_group_id?: ?string}  $filters
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = FinancialAccount::query()
            ->with(['costCenter:id,uuid,name', 'category:id,uuid,name,color,type'])
            ->withSum('settlements', 'value');

        $query->when(filled($filters['type'] ?? null), fn ($q) => $q->where('type', $filters['type']));
        $query->when(filled($filters['status'] ?? null), fn ($q) => $q->where('status', $filters['status']));
        $query->when(filled($filters['cost_center_id'] ?? null), fn ($q) => $q->where('cost_center_id', $filters['cost_center_id']));
        $query->when(filled($filters['category_id'] ?? null), fn ($q) => $q->where('category_id', $filters['category_id']));
        $query->when(filled($filters['installment_group_id'] ?? null), fn ($q) => $q->where('installment_group_id', $filters['installment_group_id']));
        $query->when(filled($filters['due_from'] ?? null), fn ($q) => $q->whereDate('due_date', '>=', $filters['due_from']));
        $query->when(filled($filters['due_to'] ?? null), fn ($q) => $q->whereDate('due_date', '<=', $filters['due_to']));

        $query->when(filled($filters['search'] ?? null), function ($q) use ($filters): void {
            $search = $filters['search'];

            $q->where(function ($q) use ($search): void {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('counterparty', 'like', "%{$search}%");
            });
        });

        return $query
            ->orderBy('due_date')
            ->orderBy('id')
            ->paginate(min(max($perPage, 1), 100));
    }

    public function find(string $uuid): FinancialAccount
    {
        return FinancialAccount::query()
            ->with(['costCenter:id,uuid,name', 'category:id,uuid,name,color,type', 'settlements' => fn ($q) => $q->orderBy('settled_at')])
            ->withSum('settlements', 'value')
            ->where('uuid', $uuid)
            ->firstOrFail();
    }

    /**
     * @param  array{type: string, description: string, counterparty?: ?string, cost_center_id: string, category_id: string, value: numeric, due_date: string, expected_date?: ?string, observation?: ?string, installments?: ?array{quantity: int, interval?: string}}  $data
     * @return list<FinancialAccount>
     */
    public function create(array $data): array
    {
        $installments = $data['installments'] ?? null;
        unset($data['installments']);

        if ($installments === null || (int) ($installments['quantity'] ?? 1) <= 1) {
            return [FinancialAccount::query()->create($data)];
        }

        return $this->createInstallments($data, (int) $installments['quantity'], $installments['interval'] ?? 'monthly');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<FinancialAccount>
     */
    private function createInstallments(array $data, int $quantity, string $interval): array
    {
        if ($quantity < 1 || $quantity > 120) {
            throw new InvalidArgumentException('A quantidade de parcelas deve estar entre 1 e 120.');
        }

        $group = (string) Str::uuid();
        $total = round((float) $data['value'], 2);
        $installmentValue = round($total / $quantity, 2);
        $firstDueDate = Carbon::parse($data['due_date']);
        $accounts = [];

        $accumulated = 0.0;

        for ($i = 1; $i <= $quantity; $i++) {
            $value = $i === $quantity
                ? round($total - $accumulated, 2)
                : $installmentValue;

            $accumulated = round($accumulated + $value, 2);

            $dueDate = $i === 1
                ? $firstDueDate->copy()
                : $this->nextDueDate($firstDueDate, $interval, $i - 1);

            $accounts[] = FinancialAccount::query()->create([
                ...$data,
                'value' => $value,
                'due_date' => $dueDate->toDateString(),
                'installment_group_id' => $group,
                'installment_number' => $i,
                'installment_total' => $quantity,
            ]);
        }

        return $accounts;
    }

    private function nextDueDate(Carbon $first, string $interval, int $step): Carbon
    {
        return match ($interval) {
            'daily' => $first->copy()->addDays($step),
            'weekly' => $first->copy()->addWeeks($step),
            default => $first->copy()->addMonthsNoOverflow($step),
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(FinancialAccount $account, array $data): FinancialAccount
    {
        $account->fill($data);
        $account->save();

        return $account->refresh();
    }

    public function delete(FinancialAccount $account): void
    {
        $account->delete();
    }

    /**
     * @param  array{value?: ?numeric, settled_at?: ?string, method?: ?string}  $data
     */
    public function settle(FinancialAccount $account, User $user, array $data): Settlement
    {
        $remaining = $account->remaining_amount;

        if ($remaining <= 0) {
            throw new InvalidArgumentException('A conta já está totalmente liquidada.');
        }

        $value = $data['value'] ?? null;
        $value = $value !== null ? round((float) $value, 2) : $remaining;

        if ($value <= 0 || $value > round($remaining + 0.001, 2)) {
            throw new InvalidArgumentException('O valor da baixa é inválido para esta conta.');
        }

        $settlement = Settlement::query()->create([
            'account_id' => $account->getKey(),
            'value' => $value,
            'settled_at' => $data['settled_at'] ?? now()->toDateString(),
            'method' => $data['method'] ?? null,
            'user_id' => $user->getKey(),
        ]);

        $this->recomputeStatus($account);

        return $settlement;
    }

    public function unsettle(FinancialAccount $account, Settlement $settlement): void
    {
        $settlement->delete();

        $this->recomputeStatus($account);
    }

    public function cancel(FinancialAccount $account): FinancialAccount
    {
        $account->status = AccountStatus::Cancelled;
        $account->save();

        return $account->refresh();
    }

    public function recomputeStatus(FinancialAccount $account): void
    {
        if ($account->status === AccountStatus::Cancelled) {
            return;
        }

        $settled = $account->settled_amount;

        $status = match (true) {
            $settled <= 0 => AccountStatus::Open,
            $settled >= (float) $account->value => AccountStatus::Settled,
            default => AccountStatus::Partial,
        };

        $account->status = $status;
        $account->paid_date = $status === AccountStatus::Settled
            ? $account->settlements()->max('settled_at')
            : null;
        $account->save();
    }

    public function markReconciled(FinancialAccount $account): void
    {
        $account->reconciled_at = now();
        $account->save();
    }

    public function markUnreconciled(FinancialAccount $account): void
    {
        $account->reconciled_at = null;
        $account->save();
    }
}
