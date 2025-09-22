<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && $user->password_change_required) {
            if (!$request->routeIs('password.force.change', 'password.force.update')) {
                return redirect()->route('password.force.change');
            }
        }

        return $next($request);
    }
}
