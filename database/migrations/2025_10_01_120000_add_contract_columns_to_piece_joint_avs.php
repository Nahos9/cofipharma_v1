<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('piece_joint_avs', function (Blueprint $table) {
            $table->string('category')->nullable()->after('type_mime');
            $table->boolean('is_signed')->default(false)->after('category');
            $table->timestamp('signed_at')->nullable()->after('is_signed');
        });
    }

    public function down(): void
    {
        Schema::table('piece_joint_avs', function (Blueprint $table) {
            $table->dropColumn(['category', 'is_signed', 'signed_at']);
        });
    }
};


