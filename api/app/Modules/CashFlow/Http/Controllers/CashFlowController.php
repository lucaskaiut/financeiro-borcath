<?php

namespace App\Modules\CashFlow\Http\Controllers;

use App\Modules\CashFlow\Services\CashFlowService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashFlowController extends ApiController
{
    public function __construct(private readonly CashFlowService $service) {}

    public function realized(Request $request): JsonResponse
    {
        $data = $this->service->realized(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $request->string('cost_center_id')->toString() ?: null,
            $request->string('category_id')->toString() ?: null,
        );

        return $this->success($data);
    }

    public function projected(Request $request): JsonResponse
    {
        $days = (int) $request->integer('days', 30);

        $data = $this->service->projected(
            min(max($days, 1), 365),
            $request->string('cost_center_id')->toString() ?: null,
        );

        return $this->success($data);
    }
}
