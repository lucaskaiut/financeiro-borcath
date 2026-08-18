<?php

namespace App\Modules\Category\Models;

use App\Modules\Category\Enums\CategoryType;
use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\Tenant\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use BelongsToTenant;
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'color',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'type' => CategoryType::class,
        ];
    }
}
