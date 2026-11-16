<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Customer;
use App\Models\Product;
use App\Models\SiteSetting;
use Database\Seeders\QaBootstrapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class QaBootstrapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        require_once base_path('../.github/deploy/qa/verify-backend.php');
    }

    public function test_bootstrap_creates_sample_content_and_only_the_supplied_admin(): void
    {
        $seeder = new QaBootstrapFixture;
        $seeder->run();

        $admin = AdminUser::sole();
        $this->assertSame('qa-admin@example.test', $admin->email);
        $this->assertTrue(Hash::check($seeder->password, $admin->password));
        $this->assertSame(0, Customer::count());
        $this->assertDatabaseMissing('admin_users', ['email' => 'admin@midiametal.com']);
        $this->assertDatabaseCount('product_categories', 1);
        $this->assertDatabaseCount('products', 2);
        $this->assertDatabaseCount('services', 1);
        $this->assertDatabaseCount('blog_posts', 1);
        $this->assertDatabaseCount('portfolio_projects', 1);
        $this->assertDatabaseHas('site_settings', ['key' => 'qa_bootstrap_version', 'value' => '1']);
        $this->getJson('/api/v1/settings')->assertOk()->assertJsonMissing(['key' => 'qa_bootstrap_version']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/settings')
            ->assertOk()->assertJsonMissing(['key' => 'qa_bootstrap_version']);
    }

    public function test_repeated_bootstrap_preserves_edits_and_password_without_requiring_secrets(): void
    {
        $seeder = new QaBootstrapFixture;
        $seeder->run();
        $admin = AdminUser::sole();
        $passwordHash = $admin->password;
        Product::where('slug', 'qa-sample-canopy')->update(['name' => 'Edited by QA']);
        SiteSetting::where('key', 'site_name')->update(['value' => 'Edited Site']);

        $seeder->email = '';
        $seeder->password = '';
        $seeder->run();

        $this->assertDatabaseCount('admin_users', 1);
        $this->assertDatabaseCount('products', 2);
        $this->assertSame($passwordHash, $admin->fresh()->password);
        $this->assertDatabaseHas('products', ['slug' => 'qa-sample-canopy', 'name' => 'Edited by QA']);
        $this->assertDatabaseHas('site_settings', ['key' => 'site_name', 'value' => 'Edited Site']);
    }

    public function test_bootstrap_refuses_an_existing_customer_database_without_changing_it(): void
    {
        $customer = Customer::factory()->create();
        try {
            (new QaBootstrapFixture)->run();
            $this->fail('An existing database must not be bootstrapped.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('new empty business database', $exception->getMessage());
        }
        $this->assertDatabaseCount('customers', 1);
        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
        $this->assertDatabaseCount('admin_users', 0);
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseMissing('site_settings', ['key' => 'qa_bootstrap_version']);
    }

    public function test_bootstrap_refuses_missing_credentials_before_any_write(): void
    {
        $seeder = new QaBootstrapFixture;
        $seeder->password = '';
        try {
            $seeder->run();
            $this->fail('Missing bootstrap credentials must not be accepted.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('bootstrap password', $exception->getMessage());
        }
        $this->assertDatabaseCount('admin_users', 0);
        $this->assertDatabaseCount('products', 0);
    }

    public function test_real_seeder_rejects_the_local_test_environment(): void
    {
        $this->expectException(RuntimeException::class);
        (new QaBootstrapSeeder)->run();
    }

    public function test_guard_accepts_matching_qa_environment_and_release_paths(): void
    {
        $target = self::target();
        [$env, $effective] = self::configuration();
        \Midia\QaDeploy\validateEnvironment($env, $effective, $target);
        $path = $target['root'].'/releases/qa-abc123-1/backend';
        \Midia\QaDeploy\validateReleasePath($path, $target, $path);
        $this->addToAssertionCount(1);
    }

    #[DataProvider('unsafeConfigurations')]
    public function test_guard_rejects_mismatched_identity_and_overrides(string $scope, string $key, mixed $value): void
    {
        [$env, $effective] = self::configuration();
        if ($scope === 'env') {
            $env[$key] = $value;
        } else {
            $effective[$key] = $value;
        }

        $this->expectException(RuntimeException::class);
        \Midia\QaDeploy\validateEnvironment($env, $effective, self::target());
    }

    public static function unsafeConfigurations(): array
    {
        return [
            'wrong app environment' => ['env', 'APP_ENV', 'production'],
            'debug enabled' => ['env', 'APP_DEBUG', 'true'],
            'debug unspecified' => ['env', 'APP_DEBUG', null],
            'wrong app URL' => ['env', 'APP_URL', 'https://test.midiawork.com'],
            'wrong frontend URL' => ['env', 'FRONTEND_URL', 'https://example.com'],
            'wrong database' => ['env', 'DB_DATABASE', 'u123456789_production'],
            'wrong database user' => ['env', 'DB_USERNAME', 'u123456789_otherqa'],
            'remote database' => ['env', 'DB_HOST', 'db.example.com'],
            'different database driver' => ['env', 'DB_CONNECTION', 'sqlite'],
            'database URL override' => ['env', 'DB_URL', 'mysql://fixture@example.test/database'],
            'alternative URL override' => ['env', 'DATABASE_URL', 'mysql://fixture@example.test/database'],
            'read override' => ['env', 'DB_READ_HOST', 'db.example.com'],
            'write override' => ['env', 'DB_WRITE_DATABASE', 'other'],
            'socket override' => ['env', 'DB_SOCKET', '/tmp/other.sock'],
            'deploy trigger enabled' => ['env', 'FRONTEND_DEPLOY_TRIGGER_ENABLED', 'true'],
            'cached environment mismatch' => ['config', 'app.env', 'production'],
            'cached debug enabled' => ['config', 'app.debug', true],
            'cached database mismatch' => ['config', 'database.connections.mysql.database', 'u123456789_production'],
            'cached user mismatch' => ['config', 'database.connections.mysql.username', 'u123456789_otherqa'],
            'cached connection mismatch' => ['config', 'database.default', 'sqlite'],
            'cached URL override' => ['config', 'database.connections.mysql.url', 'mysql://fixture@example.test/database'],
            'cached read override' => ['config', 'database.connections.mysql.read', ['host' => 'db.example.com']],
            'cached write override' => ['config', 'database.connections.mysql.write', ['host' => 'db.example.com']],
            'cached socket override' => ['config', 'database.connections.mysql.unix_socket', '/tmp/other.sock'],
            'cached password mismatch' => ['config', 'database.connections.mysql.password', 'different-fixture-value'],
            'cached deploy trigger enabled' => ['config', 'services.frontend_deploy.enabled', true],
        ];
    }

    public function test_guard_rejects_release_paths_outside_the_target_and_symlink_redirection(): void
    {
        $target = self::target();
        foreach ([
            [$target['root'].'/current/backend', $target['root'].'/releases/qa-abc123/backend'],
            [$target['root'].'/releases/qa-abc123/../other/backend', $target['root'].'/releases/other/backend'],
            [$target['root'].'/releases/qa-abc123/backend', '/home/u987654321/other/backend'],
            [$target['root'].'/releases/qa-abc123/backend', false],
        ] as [$path, $resolved]) {
            try {
                \Midia\QaDeploy\validateReleasePath($path, $target, $resolved);
                $this->fail('Unsafe QA release path was accepted.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('exact directory', $exception->getMessage());
            }
        }
    }

    public function test_guard_rejects_an_unapproved_manifest(): void
    {
        foreach ([
            ['branch', 'content'],
            ['repository', 'irfoloji21/midia-metal'],
            ['url', 'https://test.midiawork.com'],
            ['root', '/home/u987654321/domains/test.midiametal.com/.midia-qa'],
        ] as [$key, $value]) {
            $target = self::target();
            $target[$key] = $value;
            try {
                \Midia\QaDeploy\validateTarget($target);
                $this->fail('An unapproved manifest was accepted.');
            } catch (RuntimeException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_guard_rejects_a_different_account_even_with_consistent_paths(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('approved QA account');
        \Midia\QaDeploy\validateTarget(self::target());
    }

    private static function target(): array
    {
        return [
            'repository' => 'Mahmut-Mese/midia-metal', 'branch' => 'qa', 'url' => 'https://test.midiametal.com',
            'ssh' => ['host' => '192.0.2.1', 'port' => 65002, 'user' => 'u123456789'],
            'root' => '/home/u123456789/domains/test.midiametal.com/.midia-qa',
            'web_root' => '/home/u123456789/domains/test.midiametal.com/public_html',
            'database' => ['connection' => 'mysql', 'host' => 'localhost', 'port' => 3306,
                'name' => 'u123456789_midiaqa', 'user' => 'u123456789_midiaqa'],
        ];
    }

    private static function configuration(): array
    {
        $target = self::target();
        $env = [
            'APP_ENV' => 'qa', 'APP_DEBUG' => 'false', 'APP_URL' => $target['url'], 'FRONTEND_URL' => $target['url'],
            'DB_CONNECTION' => 'mysql', 'DB_HOST' => 'localhost', 'DB_PORT' => '3306',
            'DB_DATABASE' => $target['database']['name'], 'DB_USERNAME' => $target['database']['user'],
            'DB_PASSWORD' => 'fixture-only-value', 'FRONTEND_DEPLOY_TRIGGER_ENABLED' => 'false',
        ];
        $effective = [
            'app.env' => 'qa', 'app.debug' => false, 'app.url' => $target['url'], 'app.frontend_url' => $target['url'],
            'database.default' => 'mysql', 'database.connections.mysql.driver' => 'mysql',
            'database.connections.mysql.host' => 'localhost', 'database.connections.mysql.port' => 3306,
            'database.connections.mysql.database' => $target['database']['name'],
            'database.connections.mysql.username' => $target['database']['user'],
            'database.connections.mysql.password' => 'fixture-only-value', 'services.frontend_deploy.enabled' => false,
        ];

        return [$env, $effective];
    }
}

/** Tests exercise seeding on the isolated test database; the real guard is tested separately. */
class QaBootstrapFixture extends QaBootstrapSeeder
{
    public string $email = 'qa-admin@example.test';

    public string $password = 'Unique-Fixture-Admin-87461!';

    protected function verifyQaIdentity(): void {}

    protected function readAdminCredentials(): array
    {
        return ['email' => $this->email, 'password' => $this->password];
    }
}
