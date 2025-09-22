<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ForcePasswordChangeController extends Controller
{
    public function edit()
    {
        return inertia('Auth/ChangePassword'); // Vue React via Inertia
    }

    public function update(Request $request)
    {
        $request->validate([
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $user = $request->user();
        $user->password = Hash::make($request->password);
        $user->password_change_required = false;
        $user->save();

        return redirect()->route('login')->with('success', 'Mot de passe modifié avec succès');
    }
}
