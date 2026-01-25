<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureQueueMasterOrOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->user()->role ?? null;
        if (! in_array($role, ['owner', 'queue_master'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
