<?php

namespace App\Modules\Report\Services;

/**
 * Aplica filtros/ordenação de colunas enviados pelo frontend (column_query JSON).
 * Espelha a lógica de web/src/modules/reports/utils/column-table.ts.
 */
class ReportColumnQuery
{
    /**
     * @return array{filters: array<string, array<string, mixed>>, sort: array{key: string, direction: string}|null}|null
     */
    public static function parse(?string $json): ?array
    {
        if ($json === null || trim($json) === '') {
            return null;
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            return null;
        }

        $filters = [];
        foreach (($decoded['filters'] ?? []) as $key => $filter) {
            if (! is_string($key) || ! is_array($filter)) {
                continue;
            }
            if (! self::isFilterActive($filter)) {
                continue;
            }
            $filters[$key] = $filter;
        }

        $sort = null;
        if (isset($decoded['sort']) && is_array($decoded['sort'])) {
            $key = $decoded['sort']['key'] ?? null;
            $direction = $decoded['sort']['direction'] ?? null;
            if (is_string($key) && in_array($direction, ['asc', 'desc'], true)) {
                $sort = ['key' => $key, 'direction' => $direction];
            }
        }

        if ($filters === [] && $sort === null) {
            return null;
        }

        return ['filters' => $filters, 'sort' => $sort];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array{filters: array<string, array<string, mixed>>, sort: array{key: string, direction: string}|null}|null  $query
     * @param  array<string, callable(array<string, mixed>): (string|int|float|null)>  $accessors
     * @return list<array<string, mixed>>
     */
    public static function applyRows(array $rows, ?array $query, array $accessors): array
    {
        if ($query === null) {
            return array_values($rows);
        }

        $result = $rows;

        foreach ($query['filters'] as $key => $filter) {
            if (! isset($accessors[$key])) {
                continue;
            }

            $getValue = $accessors[$key];
            $result = array_values(array_filter($result, function (array $row) use ($getValue, $filter): bool {
                $value = $getValue($row);
                if (($filter['kind'] ?? '') === 'range') {
                    return self::matchesRangeFilter($value, (string) ($filter['from'] ?? ''), (string) ($filter['to'] ?? ''));
                }

                return self::matchesTextFilter($value, (string) ($filter['value'] ?? ''));
            }));
        }

        $sort = $query['sort'] ?? null;
        if ($sort === null || ! isset($accessors[$sort['key']])) {
            return $result;
        }

        $getValue = $accessors[$sort['key']];
        $direction = $sort['direction'];

        usort($result, function (array $a, array $b) use ($getValue, $direction): int {
            return self::compareValues($getValue($a), $getValue($b), $direction);
        });

        return $result;
    }

    /**
     * @param  array<string, mixed>  $filter
     */
    private static function isFilterActive(array $filter): bool
    {
        if (($filter['kind'] ?? '') === 'text') {
            return trim((string) ($filter['value'] ?? '')) !== '';
        }

        if (($filter['kind'] ?? '') === 'range') {
            return trim((string) ($filter['from'] ?? '')) !== '' || trim((string) ($filter['to'] ?? '')) !== '';
        }

        return false;
    }

    private static function normalizeFilterText(string $value): string
    {
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (is_string($ascii) && $ascii !== '') {
            $value = $ascii;
        }

        return mb_strtolower(trim($value));
    }

    private static function matchesTextFilter(string|int|float|null $value, string $query): bool
    {
        $needle = self::normalizeFilterText($query);
        if ($needle === '') {
            return true;
        }
        if ($value === null) {
            return false;
        }

        $haystack = (string) $value;
        if (str_contains(self::normalizeFilterText($haystack), $needle)) {
            return true;
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $haystack, $matches) === 1) {
            $brDate = "{$matches[3]}/{$matches[2]}/{$matches[1]}";
            if (str_contains(self::normalizeFilterText($brDate), $needle)) {
                return true;
            }
        }

        return false;
    }

    private static function parseFilterNumber(string $value): ?float
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $normalized = preg_replace('/[^\d,.-]/', '', $trimmed) ?? '';
        if ($normalized === '' || $normalized === '-' || $normalized === '.' || $normalized === ',') {
            return null;
        }

        if (str_contains($normalized, ',') && str_contains($normalized, '.')) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        } elseif (str_contains($normalized, ',')) {
            $normalized = str_replace(',', '.', $normalized);
        }

        if (! is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized;
    }

    private static function matchesRangeFilter(string|int|float|null $value, string $from, string $to): bool
    {
        if ($value === null || ! is_numeric($value)) {
            return false;
        }

        $numeric = (float) $value;
        $min = self::parseFilterNumber($from);
        $max = self::parseFilterNumber($to);

        if ($min === null && $max === null) {
            return true;
        }
        if ($min !== null && $numeric < $min) {
            return false;
        }
        if ($max !== null && $numeric > $max) {
            return false;
        }

        return true;
    }

    private static function compareValues(string|int|float|null $left, string|int|float|null $right, string $direction): int
    {
        $factor = $direction === 'asc' ? 1 : -1;

        if (is_numeric($left) && is_numeric($right)) {
            $cmp = (float) $left <=> (float) $right;

            return $cmp * $factor;
        }

        return strcmp(mb_strtolower((string) ($left ?? '')), mb_strtolower((string) ($right ?? ''))) * $factor;
    }
}
