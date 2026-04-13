<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    public static function bootAuditable()
    {
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return;
        }

        static::created(function ($model) {
            self::logAction('created', $model);
        });

        static::updated(function ($model) {
            self::logAction('updated', $model);
        });

        static::deleted(function ($model) {
            self::logAction('deleted', $model);
        });
    }

    protected static function logAction($action, $model)
    {
        $adminUserId = null;

        // Attempt to capture the logged-in admin user via Sanctum or session
        $user = Auth::guard('sanctum')->user() ?? Auth::guard('admin_web')->user();
        if ($user && get_class($user) === 'App\Models\AdminUser') {
            $adminUserId = $user->id;
        }

        $changes = [];
        if ($action === 'updated') {
            $changes = [
                'before' => array_intersect_key($model->getOriginal(), $model->getDirty()),
                'after' => $model->getDirty(),
            ];
        } else {
            $changes = $model->toArray();
        }

        // Hide sensitive fields from audit
        $hidden = ['password', 'remember_token'];
        if (isset($changes['after'])) {
            foreach ($hidden as $field) {
                unset($changes['before'][$field], $changes['after'][$field]);
            }
        } else {
            foreach ($hidden as $field) {
                unset($changes[$field]);
            }
        }

        AuditLog::create([
            'admin_user_id' => $adminUserId,
            'action' => $action,
            'model_type' => get_class($model),
            'model_id' => $model->id ?? null,
            'changes' => empty($changes) ? null : $changes,
            'ip_address' => request()->ip(),
        ]);
    }
}
