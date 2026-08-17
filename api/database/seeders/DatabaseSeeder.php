<?php

namespace Database\Seeders;

use App\Modules\Auth\DTOs\NewTenantData;
use App\Modules\Auth\DTOs\NewUserData;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Tenant\Models\Tenant;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (Tenant::query()->exists()) {
            return;
        }

        app(AuthService::class)->register(
            new NewTenantData(
                name: 'Demo',
                document: '11222333000181',
                email: 'contato@demo.localhost',
                phone: '41999999999',
                domain: 'demo.localhost',
            ),
            new NewUserData(
                name: 'Administrador',
                email: 'admin@demo.localhost',
                phone: '41999999999',
                document: '52998224725',
                password: 'password',
            ),
        );
    }
}
