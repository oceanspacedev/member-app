<?php

namespace App\Filament\Pages\Auth;

use App\Models\User;
use App\Services\OtpService;
use App\Support\Phone;
use Apriansyahrs\MekayaTheme\Auth\MekayaLogin;
use DanHarrin\LivewireRateLimiting\Exceptions\TooManyRequestsException;
use Filament\Actions\Action;
use Filament\Auth\Http\Responses\Contracts\LoginResponse;
use Filament\Facades\Filament;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\ToggleButtons;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Validation\ValidationException;

/**
 * Login panel admin dengan dua cara:
 * - Email + password (bawaan Filament), atau
 * - WhatsApp OTP — memakai OtpService & gateway yang sama dengan aplikasi mobile.
 * Keduanya hanya untuk user ber-peran "admin" (User::canAccessPanel).
 */
class OtpLogin extends MekayaLogin
{
    public bool $awaitingOtp = false;

    public function authenticate(): ?LoginResponse
    {
        if (! $this->usingWhatsApp()) {
            return parent::authenticate();
        }

        try {
            $this->rateLimit(10);
        } catch (TooManyRequestsException $exception) {
            $this->getRateLimitedNotification($exception)?->send();

            return null;
        }

        $data = $this->form->getState();
        $phone = Phone::normalize($data['phone'] ?? null);

        if (! $phone) {
            throw ValidationException::withMessages(['data.phone' => 'Nomor WhatsApp tidak valid.']);
        }

        $admin = User::where('phone', $phone)->first();
        $allowed = $admin && $this->isUserAllowedToAccessPanel($admin);

        return $this->awaitingOtp
            ? $this->verifyCode($phone, (string) ($data['code'] ?? ''), $allowed ? $admin : null)
            : $this->sendCode($phone, $allowed);
    }

    private function usingWhatsApp(): bool
    {
        return ($this->data['method'] ?? 'email') === 'whatsapp';
    }

    private function sendCode(string $phone, bool $allowed): null
    {
        // Nomor non-admin tidak dikirimi OTP, tetapi tampilannya sama agar daftar admin tidak bisa ditebak.
        if ($allowed) {
            try {
                app(OtpService::class)->send($phone);
            } catch (ValidationException $e) {
                throw ValidationException::withMessages(['data.phone' => collect($e->errors())->flatten()->first()]);
            }
        }

        $this->awaitingOtp = true;
        $this->form->fill(['method' => 'whatsapp', 'phone' => $phone, 'code' => null]);

        Notification::make()
            ->title('Jika nomor terdaftar sebagai admin, kode OTP sudah dikirim ke WhatsApp.')
            ->success()
            ->send();

        return null;
    }

    private function verifyCode(string $phone, string $code, ?User $admin): ?LoginResponse
    {
        if (! $admin) {
            throw ValidationException::withMessages(['data.code' => 'Kode OTP salah atau sudah kedaluwarsa.']);
        }

        try {
            app(OtpService::class)->verify($phone, $code);
        } catch (ValidationException $e) {
            throw ValidationException::withMessages(['data.code' => collect($e->errors())->flatten()->first()]);
        }

        Filament::auth()->login($admin, remember: true);
        session()->regenerate();

        return app(LoginResponse::class);
    }

    public function changePhone(): void
    {
        $this->awaitingOtp = false;
        $this->form->fill(['method' => 'whatsapp']);
    }

    public function form(Schema $schema): Schema
    {
        $email = fn (Get $get): bool => $get('method') !== 'whatsapp';
        $whatsapp = fn (Get $get): bool => $get('method') === 'whatsapp';

        return $schema->components([
            ToggleButtons::make('method')
                ->hiddenLabel()
                ->options(['email' => 'Email', 'whatsapp' => 'WhatsApp'])
                ->icons(['email' => Heroicon::OutlinedEnvelope, 'whatsapp' => 'lc-whatsapp'])
                ->default('email')
                ->grouped()
                ->live()
                ->afterStateUpdated(fn () => $this->awaitingOtp = false)
                ->disabled(fn (): bool => $this->awaitingOtp)
                ->dehydrated(),
            $this->getEmailFormComponent()->visible($email),
            $this->getPasswordFormComponent()->visible($email),
            $this->getRememberFormComponent()->visible($email),
            $this->getPhoneFormComponent()->visible($whatsapp),
            $this->getCodeFormComponent()->visible(fn (Get $get): bool => $whatsapp($get) && $this->awaitingOtp),
        ]);
    }

    protected function getPhoneFormComponent(): Component
    {
        return TextInput::make('phone')
            ->label('Nomor WhatsApp')
            ->tel()
            ->placeholder('0812 3456 7890')
            ->autocomplete('tel')
            ->required()
            ->maxLength(20)
            ->disabled(fn (): bool => $this->awaitingOtp)
            ->dehydrated();
    }

    protected function getCodeFormComponent(): Component
    {
        return TextInput::make('code')
            ->label('Kode OTP')
            ->helperText('6 digit kode dari WhatsApp.')
            // Bukan ->numeric(): itu mengubah state jadi angka sehingga kode berawalan 0 (mis. 012345) ditolak.
            ->rule('digits:6')
            ->maxLength(6)
            ->inputMode('numeric')
            ->autocomplete('one-time-code')
            ->required();
    }

    protected function getAuthenticateFormAction(): Action
    {
        return parent::getAuthenticateFormAction()
            ->label(fn (): string => match (true) {
                ! $this->usingWhatsApp() => 'Masuk',
                $this->awaitingOtp => 'Verifikasi dan masuk',
                default => 'Kirim kode OTP',
            });
    }

    public function getHeading(): string|Htmlable|null
    {
        return 'Masuk panel admin';
    }

    public function getSubheading(): string|Htmlable|null
    {
        if (! $this->awaitingOtp) {
            return null;
        }

        return Action::make('changePhone')
            ->link()
            ->label('Ganti nomor atau kirim ulang kode')
            ->action('changePhone');
    }
}
