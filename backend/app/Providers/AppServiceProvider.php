<?php

namespace App\Providers;

use App\Models\Court;
use App\Models\QueueSession;
use App\Policies\QueueSessionPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        QueueSession::class => QueueSessionPolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-court', function ($user, Court $court) {
            return $user->id === $court->owner_id;
        });
    }
}
