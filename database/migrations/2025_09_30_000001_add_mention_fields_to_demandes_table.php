<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandes', function (Blueprint $table) {
            $table->text('mention_text')->nullable();
            $table->boolean('mention_accepted')->default(false);
            $table->timestamp('mention_accepted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('demandes', function (Blueprint $table) {
            $table->dropColumn(['mention_text', 'mention_accepted', 'mention_accepted_at']);
        });
    }
};


