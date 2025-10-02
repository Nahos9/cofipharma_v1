<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('av_salaires', function (Blueprint $table) {
            $table->id();
            $table->string('numero_compte');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('nom');
            $table->string('prenom');
            $table->string('montant');
            $table->string('mode_paiement')->nullable();
            $table->string('public_base')->nullable();
            $table->string('signature_relative_path')->nullable();
            $table->string('bp')->nullable();
            $table->string('employeur')->nullable();
            $table->string('civility')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('piece_identite')->nullable();
            $table->string('numero_piece_identite')->nullable();
            $table->string('date_de_delivrance_piece_identite')->nullable();
            $table->string('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();
            $table->string('nationalite')->nullable();
            $table->string('profession')->nullable();
            $table->text('mention_text')->nullable();
            $table->boolean('mention_accepted')->default(false);
            $table->timestamp('mention_accepted_at')->nullable();
            $table->string('status')->default('en attente');
            $table->string('carte')->nullable();
            $table->string('is_deleted')->default(false);
            $table->string('user_validateur_level')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('av_salaires');
    }
};
