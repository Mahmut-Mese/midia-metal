<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('testimonials')->count() > 0) {
            return;
        }

        DB::table('testimonials')->insert([
            [
                'name' => 'Daniel Harper',
                'company' => 'Riverside Grill, London',
                'content' => 'From design to installation, the team delivered on time and the canopy system has been excellent in daily service.',
                'rating' => 5,
                'active' => true,
                'order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Sophie Bennett',
                'company' => 'Bennett Catering Ltd',
                'content' => 'Great communication and clean workmanship. The custom stainless fabrication matched our exact site requirements.',
                'rating' => 5,
                'active' => true,
                'order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Michael Reed',
                'company' => 'Northfield Kitchens',
                'content' => 'Reliable delivery, practical advice, and strong aftercare. We have used them on multiple kitchen fit-out projects.',
                'rating' => 5,
                'active' => true,
                'order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('testimonials')
            ->whereIn('company', [
                'Riverside Grill, London',
                'Bennett Catering Ltd',
                'Northfield Kitchens',
            ])
            ->delete();
    }
};
