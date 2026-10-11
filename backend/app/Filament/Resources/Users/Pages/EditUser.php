<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\Tables\UsersTable;
use App\Filament\Resources\Users\UserResource;
use App\Models\User;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        // Member tidak dihapus dari panel agar riwayat poin tetap utuh.
        return [
            UsersTable::recordPurchaseAction()->after(fn () => $this->refreshFormData(['points_balance', 'tier'])),
            UsersTable::adjustPointsAction()->after(fn () => $this->refreshFormData(['points_balance'])),
        ];
    }

    /** Peran & outlet tidak mass-assignable di model, jadi diisi eksplisit di sini. */
    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        /** @var User $record */
        $data = Arr::only($data, UserResource::EDITABLE);

        // Kasir/admin yang diturunkan jadi member tidak lagi terikat outlet.
        if (($data['role'] ?? $record->role) === User::ROLE_MEMBER) {
            $data['outlet_id'] = null;
        }

        $record->forceFill($data)->save();

        return $record;
    }
}
