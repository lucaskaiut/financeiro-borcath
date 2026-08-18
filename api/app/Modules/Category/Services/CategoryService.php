<?php

namespace App\Modules\Category\Services;

use App\Modules\Category\Models\Category;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CategoryService
{
    public function paginate(int $perPage = 15, ?string $search = null, ?string $type = null): LengthAwarePaginator
    {
        return Category::query()
            ->with('parent:id,uuid,name')
            ->withCount('children')
            ->when(filled($type), fn ($query) => $query->where('type', $type))
            ->when(filled($search), fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(min(max($perPage, 1), 100));
    }

    /**
     * @return list<Category>
     */
    public function all(?string $type = null): array
    {
        return Category::query()
            ->with('parent:id,uuid,name')
            ->when(filled($type), fn ($query) => $query->where('type', $type))
            ->orderBy('name')
            ->get()
            ->all();
    }

    /**
     * @param  array{name: string, type: string, color?: ?string, status?: string}  $data
     */
    public function create(array $data): Category
    {
        return Category::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Category $category, array $data): Category
    {
        $category->fill($data);
        $category->save();

        return $category->refresh();
    }

    public function delete(Category $category): void
    {
        $category->delete();
    }
}
