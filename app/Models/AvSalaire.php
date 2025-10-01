<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AvSalaire extends Model
{
    protected $fillable =
    ['nom',
    'prenom',
    'email',
    'phone',
    'numero_compte',
    'status',
    'montant',
    'user_validateur_level',
    'is_deleted',
    'mode_paiement',
    'public_base',
    'signature_relative_path',
    'bp',
    'employeur',
    'civility',
    'address',
    'city',
    'piece_identite',
    'numero_piece_identite',
    'date_de_delivrance_piece_identite',
    'date_naissance',
    'lieu_naissance',
    'nationalite',
    'profession',
    'carte',
    ];

    public function pieceJointsAv()
    {
        return $this->hasMany(PieceJointAv::class);
    }
}
