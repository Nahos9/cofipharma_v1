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

        if($user->role == 'client'){
            return redirect()->intended(route('welcome'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
        elseif($user->role == 'responsable_ritel'){
            return redirect()->intended(route('responsable_ritel.dashboard'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
        elseif($user->role == 'operation'){
            return redirect()->intended(route('operation.dashboard'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
        elseif($user->role == 'charge client'){
            return redirect()->intended(route('caissiere.dashboard'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
        elseif($user->role == 'visiteur'){
            return redirect()->intended(route('visiteur.dashboard'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
        elseif($user->role == 'admin'){
            return redirect()->intended(route('admin.dashboard'))
                ->with('success', 'Mot de passe modifié avec succès');
        }
    }
}
