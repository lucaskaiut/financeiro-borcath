<?php

namespace App\Modules\Report\Services;

use App\Modules\Account\Enums\AccountStatus;
use App\Modules\Account\Enums\AccountType;
use App\Modules\Account\Models\FinancialAccount;
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
    public function provision(?string $from = null, ?string $to = null, int $days = 30, ?string $costCenterId = null): array
    {
        return $this->cashFlow->projected($from, $to, $days, $costCenterId, AccountType::Payable);
    }

    public function provisionExport(?string $from = null, ?string $to = null, int $days = 30, ?string $costCenterId = null): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $data = $this->provision($from, $to, $days, $costCenterId);

        $costCenterLabel = $costCenterId
            ? (CostCenter::query()->where('uuid', $costCenterId)->value('name') ?? 'Centro de custo')
            : 'Todos os centros';

        $items = collect($data['accounts'])
            ->concat($data['installments'])
            ->concat($data['recurrences'])
            ->sortBy('due_date')
            ->values();

        $fromLabel = Carbon::parse($data['from'])->format('d/m/Y');
        $toLabel = Carbon::parse($data['to'])->format('d/m/Y');

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Provisão');

        $sheet->setCellValue('A1', 'Relatório de provisão');
        $sheet->setCellValue('A2', "Período: {$fromLabel} até {$toLabel}");
        $sheet->setCellValue('B2', "Centro de custo: {$costCenterLabel}");

        $sheet->fromArray(
            ['Vencimento', 'Lançamento', 'Parcela', 'Centro de custo', 'Categoria', 'Valor'],
            null,
            'A4',
        );

        $row = 5;

        foreach ($items as $item) {
            $sheet->fromArray([
                Carbon::parse($item['due_date'])->format('d/m/Y'),
                $item['description'],
                $item['installment'] ?? '',
                $item['cost_center'] ?? '',
                $item['category'] ?? '',
                (float) $item['remaining_amount'],
            ], null, "A{$row}");
            $row++;
        }

        $row++;
        $sheet->setCellValue("A{$row}", 'Total a pagar');
        $sheet->setCellValue("F{$row}", (float) $data['total_out']);

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, 'relatorio-provisao.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
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
        $projected = $this->cashFlow->projected(null, null, $days, $costCenterId);

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
     * Relatório de contas a pagar por centro de custo (RF029): contas em aberto
     * (vencidas, do dia e futuras) para planejamento de pagamentos.
     *
     * @return array<string, mixed>
     */
    public function payables(?string $from = null, ?string $to = null, ?string $costCenterId = null): array
    {
        $from = $from ? Carbon::parse($from)->startOfDay() : now()->startOfMonth();
        $to = $to ? Carbon::parse($to)->endOfDay() : now()->endOfDay();
        $today = now()->startOfDay();

        $accounts = FinancialAccount::query()
            ->with(['costCenter:id,uuid,name', 'category:id,uuid,name'])
            ->withSum('settlements', 'value')
            ->where('type', AccountType::Payable)
            ->whereIn('status', [AccountStatus::Open->value, AccountStatus::Partial->value])
            ->when($costCenterId, fn ($q) => $q->where('cost_center_id', $costCenterId))
            ->whereDate('due_date', '<=', $to->toDateString())
            ->orderBy('due_date')
            ->get();

        $rows = [];
        $totalOpen = 0.0;
        $totalOverdue = 0.0;

        foreach ($accounts as $account) {
            $remaining = round((float) $account->value - (float) ($account->settlements_sum_value ?? 0), 2);
            $isOverdue = $account->due_date->lt($today);

            $rows[] = [
                'id' => $account->uuid,
                'description' => $account->description,
                'counterparty' => $account->counterparty,
                'cost_center' => $account->costCenter?->name,
                'category' => $account->category?->name,
                'value' => (float) $account->value,
                'remaining_amount' => $remaining,
                'due_date' => $account->due_date->toDateString(),
                'installment' => $account->installment_total > 1 ? "{$account->installment_number}/{$account->installment_total}" : null,
                'status' => $account->status->value,
                'is_overdue' => $isOverdue,
            ];

            $totalOpen += $remaining;

            if ($isOverdue) {
                $totalOverdue += $remaining;
            }
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'cost_center_id' => $costCenterId,
            'cost_center' => $costCenterId ? CostCenter::query()->where('uuid', $costCenterId)->value('name') : null,
            'accounts' => $rows,
            'total_open' => round($totalOpen, 2),
            'total_overdue' => round($totalOverdue, 2),
            'count' => count($rows),
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
