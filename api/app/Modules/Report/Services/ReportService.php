<?php

namespace App\Modules\Report\Services;

use App\Modules\Account\Enums\AccountType;
use App\Modules\Account\Models\Settlement;
use App\Modules\CashFlow\Services\CashFlowService;
use App\Modules\CostCenter\Models\CostCenter;
use Carbon\Carbon;

class ReportService
{
    public function __construct(private readonly CashFlowService $cashFlow) {}

    /**
     * Relatório diário (RF023).
     *
     * @return array<string, mixed>
     */
    public function daily(?string $date = null): array
    {
        $date = $date ? Carbon::parse($date) : now();

        $settlements = Settlement::query()
            ->with(['account.costCenter:id,uuid,name', 'account.category:id,uuid,name'])
            ->whereDate('settled_at', $date->toDateString())
            ->orderBy('settled_at')
            ->get();

        $payments = [];
        $receipts = [];
        $totalPaid = 0.0;
        $totalReceived = 0.0;

        foreach ($settlements as $settlement) {
            $account = $settlement->account;

            if ($account === null) {
                continue;
            }

            $entry = [
                'description' => $account->description,
                'cost_center' => $account->costCenter?->name,
                'category' => $account->category?->name,
                'value' => (float) $settlement->value,
            ];

            if ($account->type === AccountType::Receivable) {
                $totalReceived += (float) $settlement->value;
                $receipts[] = $entry;
            } else {
                $totalPaid += (float) $settlement->value;
                $payments[] = $entry;
            }
        }

        return [
            'date' => $date->toDateString(),
            'payments' => $payments,
            'receipts' => $receipts,
            'total_paid' => round($totalPaid, 2),
            'total_received' => round($totalReceived, 2),
            'balance' => round($totalReceived - $totalPaid, 2),
        ];
    }

    /**
     * Relatório semanal (RF024).
     *
     * @return array<string, mixed>
     */
    public function weekly(?string $from = null, ?string $to = null): array
    {
        $from = $from ? Carbon::parse($from)->startOfDay() : now()->startOfWeek();
        $to = $to ? Carbon::parse($to)->endOfDay() : now()->endOfWeek();

        $settlements = Settlement::query()
            ->whereBetween('settled_at', [$from, $to])
            ->get();

        $totalPaid = 0.0;
        $totalReceived = 0.0;

        foreach ($settlements as $settlement) {
            $isReceivable = $settlement->account?->type === AccountType::Receivable;

            if ($isReceivable) {
                $totalReceived += (float) $settlement->value;
            } else {
                $totalPaid += (float) $settlement->value;
            }
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_paid' => round($totalPaid, 2),
            'total_received' => round($totalReceived, 2),
            'net_balance' => round($totalReceived - $totalPaid, 2),
        ];
    }

    /**
     * Relatório de provisão (RF025) — contas, parcelas e recorrências futuras.
     *
     * @return array<string, mixed>
     */
    public function provision(int $days = 30, ?string $costCenterId = null): array
    {
        return $this->cashFlow->projected($days, $costCenterId);
    }

    /**
     * Relatório por categoria (RF026).
     *
     * @return array<string, mixed>
     */
    public function byCategory(?string $from = null, ?string $to = null): array
    {
        $from = $from ? Carbon::parse($from)->startOfDay() : now()->startOfMonth();
        $to = $to ? Carbon::parse($to)->endOfDay() : now()->endOfMonth();

        $settlements = Settlement::query()
            ->with(['account.category:id,uuid,name,type'])
            ->whereBetween('settled_at', [$from, $to])
            ->get();

        $income = [];
        $expense = [];

        foreach ($settlements as $settlement) {
            $category = $settlement->account?->category;

            if ($category === null) {
                continue;
            }

            $key = $category->name;
            $bucket = $category->type === AccountType::Receivable ? 'income' : 'expense';

            if (! isset(${$bucket}[$key])) {
                ${$bucket}[$key] = 0.0;
            }

            ${$bucket}[$key] = round(${$bucket}[$key] + (float) $settlement->value, 2);
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'income' => $this->asList($income),
            'expense' => $this->asList($expense),
        ];
    }

    /**
     * Relatório por centro de custo (RF027).
     *
     * @return array<string, mixed>
     */
    public function byCostCenter(): array
    {
        $costCenters = CostCenter::query()->orderBy('name')->get();

        $rows = [];

        foreach ($costCenters as $costCenter) {
            $income = (float) Settlement::query()
                ->whereHas('account', fn ($q) => $q->where('cost_center_id', $costCenter->uuid)->where('type', AccountType::Receivable->value))
                ->sum('value');

            $expense = (float) Settlement::query()
                ->whereHas('account', fn ($q) => $q->where('cost_center_id', $costCenter->uuid)->where('type', AccountType::Payable->value))
                ->sum('value');

            $rows[] = [
                'cost_center_id' => $costCenter->uuid,
                'cost_center' => $costCenter->name,
                'initial_balance' => (float) $costCenter->initial_balance,
                'income' => round($income, 2),
                'expense' => round($expense, 2),
                'balance' => round((float) $costCenter->initial_balance + $income - $expense, 2),
            ];
        }

        return ['rows' => $rows];
    }

    /**
     * Demonstrativo de fluxo de caixa (RF028): realizado, projetado e comparativo.
     *
     * @return array<string, mixed>
     */
    public function cashFlow(?string $from = null, ?string $to = null, int $days = 30, ?string $costCenterId = null): array
    {
        $realized = $this->cashFlow->realized($from, $to, $costCenterId, null);
        $projected = $this->cashFlow->projected($days, $costCenterId);

        return [
            'realized' => [
                'from' => $realized['from'],
                'to' => $realized['to'],
                'opening_balance' => $realized['opening_balance'],
                'total_in' => $realized['total_in'],
                'total_out' => $realized['total_out'],
                'final_balance' => $realized['final_balance'],
            ],
            'projected' => [
                'days' => $projected['days'],
                'opening_balance' => $projected['opening_balance'],
                'total_in' => $projected['total_in'],
                'total_out' => $projected['total_out'],
            ],
            'comparative' => [
                'realized_net' => round($realized['total_in'] - $realized['total_out'], 2),
                'projected_net' => round($projected['total_in'] - $projected['total_out'], 2),
                'expected_final_balance' => round($realized['final_balance'] + $projected['total_in'] - $projected['total_out'], 2),
            ],
        ];
    }

    /**
     * @param  array<string, float>  $data
     * @return list<array{category: string, total: float}>
     */
    private function asList(array $data): array
    {
        $list = [];

        foreach ($data as $name => $total) {
            $list[] = ['category' => $name, 'total' => $total];
        }

        usort($list, fn ($a, $b) => $b['total'] <=> $a['total']);

        return $list;
    }
}
