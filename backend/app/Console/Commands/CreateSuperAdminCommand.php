<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class CreateSuperAdminCommand extends Command
{
    protected $signature = 'app:create-superadmin {email : The superadmin email} {--password= : The password (will prompt if not provided)}';

    protected $description = 'Create a superadmin user';

    public function handle(): int
    {
        $email = $this->argument('email');

        $password = $this->option('password');
        if (! $password) {
            $password = $this->secret('Enter password');
            $confirm = $this->secret('Confirm password');
            if ($password !== $confirm) {
                $this->error('Passwords do not match.');
                return 1;
            }
        }

        $validator = \Illuminate\Support\Facades\Validator::make(
            ['email' => $email, 'password' => $password],
            [
                'email' => 'required|email',
                'password' => ['required', Password::min(8)->letters()->numbers()],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return 1;
        }

        if (User::where('email', $email)->exists()) {
            $user = User::where('email', $email)->first();
            if ($user->role === 'superadmin') {
                $this->warn('A superadmin with this email already exists.');
                return 0;
            }
            $user->update([
                'role' => 'superadmin',
                'password' => Hash::make($password),
            ]);
            $this->info('Existing user promoted to superadmin.');
            return 0;
        }

        User::create([
            'name' => 'Super Admin',
            'email' => $email,
            'role' => 'superadmin',
            'password' => Hash::make($password),
        ]);

        $this->info('Superadmin created successfully.');
        return 0;
    }
}
