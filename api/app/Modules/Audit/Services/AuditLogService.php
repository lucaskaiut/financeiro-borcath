<?php

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Enums\AuditAction;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\User\Models\User;
use Illuminate\Http\Request;

class AuditLogService
{
    public function record(
        User $user,
        AuditAction $action,
        ?Tenant $selectedTenant = null,
        ?Request $request = null,
    ): AuditLog {
        $request ??= request();

        return AuditLog::query()->create([
            'user_id' => $user->getKey(),
            'selected_tenant_id' => $selectedTenant?->getKey(),
            'action' => $action->value,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
