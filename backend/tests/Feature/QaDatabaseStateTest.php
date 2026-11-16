<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\SQLiteConnection;
use PDO;
use RuntimeException;
use Tests\TestCase;

class QaDatabaseStateTest extends TestCase
{
    private string $directory;

    private SQLiteConnection $connection;

    protected function setUp(): void
    {
        parent::setUp();
        require_once base_path('../.github/deploy/qa/database-state.php');
        $this->directory = realpath(sys_get_temp_dir()).'/midia-qa-migrations-'.bin2hex(random_bytes(8));
        mkdir($this->directory, 0700);
        file_put_contents($this->directory.'/2026_01_01_000000_first.php', '<?php // first fixture');
        file_put_contents($this->directory.'/2026_01_02_000000_second.php', '<?php // second fixture');
        $this->connection = new SQLiteConnection(new PDO('sqlite::memory:'));
    }

    protected function tearDown(): void
    {
        $this->connection->disconnect();
        foreach (glob($this->directory.'/*') as $file) {
            unlink($file);
        }
        rmdir($this->directory);
        parent::tearDown();
    }

    public function test_empty_database_reports_every_pending_file_with_its_exact_hash(): void
    {
        $state = \Midia\QaDeploy\databaseState($this->connection, $this->directory);

        $this->assertSame(1, $state['schema_version']);
        $this->assertSame(0, $state['table_count']);
        $this->assertTrue($state['empty_database']);
        $this->assertFalse($state['migrations_table_exists']);
        $this->assertSame([], $state['applied_migrations']);
        $this->assertFalse($state['bootstrap_completed']);
        $this->assertNull($state['bootstrap_version']);
        $this->assertCount(2, $state['pending_migrations']);
        $this->assertSame([
            'name' => '2026_01_01_000000_first',
            'file' => 'database/migrations/2026_01_01_000000_first.php',
            'sha256' => hash_file('sha256', $this->directory.'/2026_01_01_000000_first.php'),
        ], $state['pending_migrations'][0]);
    }

    public function test_tables_in_other_accessible_databases_are_not_inspected_as_qa_tables(): void
    {
        $this->connection->statement("ATTACH DATABASE ':memory:' AS other_database");
        $this->connection->statement('CREATE TABLE other_database.unrelated_table (id INTEGER PRIMARY KEY)');

        $state = \Midia\QaDeploy\databaseState($this->connection, $this->directory);

        $this->assertSame(0, $state['table_count']);
        $this->assertTrue($state['empty_database']);
    }

    public function test_existing_tables_without_a_marker_or_migrations_are_never_fresh(): void
    {
        $this->connection->getSchemaBuilder()->create('existing_customer_data', fn (Blueprint $table) => $table->id());

        $state = \Midia\QaDeploy\databaseState($this->connection, $this->directory);

        $this->assertSame(1, $state['table_count']);
        $this->assertFalse($state['empty_database']);
        $this->assertFalse($state['bootstrap_completed']);
        $this->assertFalse($state['migrations_table_exists']);
        $this->assertCount(2, $state['pending_migrations']);
    }

    public function test_applied_migrations_and_bootstrap_marker_are_reported_without_mutation(): void
    {
        $schema = $this->connection->getSchemaBuilder();
        $schema->create('migrations', function (Blueprint $table) {
            $table->id();
            $table->string('migration');
            $table->integer('batch');
        });
        $schema->create('site_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value');
        });
        $this->connection->table('migrations')->insert(['migration' => '2026_01_01_000000_first', 'batch' => 1]);
        $this->connection->table('site_settings')->insert(['key' => 'qa_bootstrap_version', 'value' => '1']);

        $state = \Midia\QaDeploy\databaseState($this->connection, $this->directory);

        $this->assertSame(2, $state['table_count']);
        $this->assertFalse($state['empty_database']);
        $this->assertTrue($state['migrations_table_exists']);
        $this->assertSame(['2026_01_01_000000_first'], $state['applied_migrations']);
        $this->assertSame('1', $state['bootstrap_version']);
        $this->assertTrue($state['bootstrap_completed']);
        $this->assertSame(['2026_01_02_000000_second'], array_column($state['pending_migrations'], 'name'));
        $this->assertSame(1, $this->connection->table('migrations')->count());
        $this->assertSame(1, $this->connection->table('site_settings')->count());
    }

    public function test_unrecognized_marker_refuses_state_without_exposing_its_value(): void
    {
        $this->connection->getSchemaBuilder()->create('site_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value');
        });
        $this->connection->table('site_settings')->insert(['key' => 'qa_bootstrap_version', 'value' => 'private-fixture']);

        try {
            \Midia\QaDeploy\databaseState($this->connection, $this->directory);
            $this->fail('An unknown marker should not authorize deployment.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('unrecognized', $exception->getMessage());
            $this->assertStringNotContainsString('private-fixture', $exception->getMessage());
        }
    }

    public function test_pending_file_changes_change_the_reported_hash(): void
    {
        $before = \Midia\QaDeploy\databaseState($this->connection, $this->directory);
        file_put_contents($this->directory.'/2026_01_01_000000_first.php', '<?php // changed fixture');
        $after = \Midia\QaDeploy\databaseState($this->connection, $this->directory);

        $this->assertNotSame($before['pending_migrations'][0]['sha256'], $after['pending_migrations'][0]['sha256']);
        $this->assertSame($before['pending_migrations'][0]['file'], $after['pending_migrations'][0]['file']);
    }

    public function test_symlinked_migration_directories_are_rejected(): void
    {
        $alias = $this->directory.'-alias';
        symlink($this->directory, $alias);
        try {
            \Midia\QaDeploy\migrationInventory($alias, []);
            $this->fail('A migration directory outside the exact release path should be refused.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('exact release directory', $exception->getMessage());
        } finally {
            unlink($alias);
        }
    }

    public function test_symlinked_migration_files_are_rejected(): void
    {
        symlink($this->directory.'/2026_01_01_000000_first.php', $this->directory.'/2026_01_03_000000_link.php');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('regular files');
        \Midia\QaDeploy\databaseState($this->connection, $this->directory);
    }
}
