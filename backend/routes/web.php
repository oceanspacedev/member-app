<?php

use App\Models\ReceiptClaim;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Foto struk klaim poin: disimpan privat, hanya untuk admin yang boleh melihat klaim.
Route::get('receipt-photos/{receiptClaim}', function (ReceiptClaim $receiptClaim) {
    return Storage::disk(ReceiptClaim::DISK)->response($receiptClaim->photo_path, headers: ['Cache-Control' => 'private, max-age=3600']);
})->middleware(['auth', 'can:view,receiptClaim'])->name('receipt-photos.show');
