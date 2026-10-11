<?php

use App\Http\Controllers\Api\Admin\MediaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DirectoryController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\VoucherOrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Autentikasi
    Route::prefix('auth')->middleware('throttle:auth')->group(function () {
        Route::post('otp/request', [AuthController::class, 'requestOtp']);
        Route::post('otp/verify', [AuthController::class, 'verifyOtp']);
        Route::post('google', [AuthController::class, 'google']);
    });

    // Katalog publik
    Route::get('brands', [DirectoryController::class, 'brands']);
    Route::get('outlets', [DirectoryController::class, 'outlets']);
    Route::get('outlets/{outlet}', [DirectoryController::class, 'outlet']);
    Route::get('promos', [DirectoryController::class, 'promos']);
    Route::get('tiers', [ProfileController::class, 'tiers']);

    // Webhook payment gateway (diverifikasi dengan token di header, bukan login).
    Route::post('payments/xendit/webhook', [VoucherOrderController::class, 'webhook']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('me', [ProfileController::class, 'show']);
        Route::patch('me', [ProfileController::class, 'update']);
        Route::post('me/avatar', [ProfileController::class, 'uploadAvatar'])->middleware('throttle:10,1');
        Route::delete('me/avatar', [ProfileController::class, 'deleteAvatar']);
        Route::get('me/qr', [ProfileController::class, 'qr']);
        Route::get('me/points', [ProfileController::class, 'points']);

        // Voucher Saya
        Route::get('me/vouchers', [VoucherController::class, 'index']);
        Route::get('me/vouchers/{voucher}', [VoucherController::class, 'show']);
        Route::get('me/vouchers/{voucher}/qr', [VoucherController::class, 'qr']);
        Route::post('promos/{promo}/vouchers', [VoucherController::class, 'store'])->middleware('throttle:20,1');

        // Beli voucher dengan uang (payment gateway)
        Route::post('promos/{promo}/orders', [VoucherOrderController::class, 'store'])->middleware('throttle:10,1');
        Route::get('me/orders/{order}', [VoucherOrderController::class, 'show'])->middleware('throttle:60,1');

        // Admin: unggah gambar
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::post('brands/{brand}/logo', [MediaController::class, 'brandLogo']);
            Route::post('outlets/{outlet}/photo', [MediaController::class, 'outletPhoto']);
            Route::post('promos/{promo}/image', [MediaController::class, 'promoImage']);
        });

        // Kasir / POS
        Route::prefix('pos')->middleware(['role:cashier,admin', 'abilities:pos', 'throttle:pos'])->group(function () {
            Route::post('scan', [PosController::class, 'scan']);
            Route::post('earn', [PosController::class, 'earn']);
            Route::post('redeem', [PosController::class, 'redeem']);
            Route::post('vouchers/check', [PosController::class, 'voucherCheck']);
            Route::post('vouchers/redeem', [PosController::class, 'voucherRedeem']);
        });
    });
});
