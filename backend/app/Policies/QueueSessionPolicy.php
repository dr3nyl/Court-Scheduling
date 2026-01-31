<?php

namespace App\Policies;

use App\Models\QueueSession;
use App\Models\User;

class QueueSessionPolicy
{
    /**
     * Determine if the user can view any queue sessions.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['owner', 'queue_master', 'superadmin']);
    }

    /**
     * Determine if the user can view the queue session.
     */
    public function view(User $user, QueueSession $session): bool
    {
        return $user->isSuperAdmin() || $session->owner_id === $user->id || $user->role === 'queue_master';
    }

    /**
     * Determine if the user can create queue sessions.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'queue_master', 'superadmin']);
    }

    /**
     * Determine if the user can update the queue session.
     */
    public function update(User $user, QueueSession $session): bool
    {
        return $user->isSuperAdmin() || $session->owner_id === $user->id || $user->role === 'queue_master';
    }

    /**
     * Determine if the user can delete the queue session.
     */
    public function delete(User $user, QueueSession $session): bool
    {
        return $user->isSuperAdmin() || $session->owner_id === $user->id || $user->role === 'queue_master';
    }
}
