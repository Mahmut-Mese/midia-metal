# QA deployment

Only pushes to `qa` in `Mahmut-Mese/midia-metal` deploy
`https://test.midiametal.com`. The other deployment workflows and their targets
are independent. This branch starts from Irfan's `content` commit
`50ca8f576ecbca84fc66970f0eee918145924257`.

## Pipeline

1. Validate repository, branch and push event; test deployment guards.
2. Run frontend ESLint, Astro type checks, Vitest and Node runtime tests.
3. Run PHP formatting checks and the backend suite with both SQLite and MySQL 8.
4. Run Playwright browser regressions against isolated local test servers.
5. Build the QA frontend once, validate SSR/admin assets, and package the clean
   source commit with locked production Composer dependencies and a SHA-256
   inventory. Retain the verified artifact for 14 days.
6. Upload that same archive over pinned SSH, verify it again, and prepare a new
   release. Install locked production Node dependencies on the server and check
   the native image runtime. Verify the actual database and authenticated user.
7. Back up only the dedicated QA database, validate the compressed backup, apply
   permitted migrations, and cache Laravel configuration/routes/views.
8. Atomically switch the common `current` link for PHP and Node; restart
   Passenger. Verify release/commit headers, frontend and database health,
   public pages, CSRF cookie, an image and an available product PDF.

Any required CI failure prevents deployment. Workflow concurrency queues up to
100 runs without cancelling an active deployment; the server also uses a lock.
A deploy-only retry reuses the successful release job's artifact. Each attempt
has a distinct release ID: `qa-<commit-prefix>-<run-id>-<attempt>`.

## Private configuration

The GitHub environment `qa` allows only branch `qa` and contains:

| Setting | Purpose |
| --- | --- |
| Secret `QA_DEPLOY_TARGET` | Private target JSON matching `target.example.json` |
| Secret `QA_SSH_PRIVATE_KEY` | Dedicated QA key |
| Secret `QA_SSH_KNOWN_HOSTS` | Host keys verified against the hosting panel |
| Variable `QA_DEPLOY_ENABLED` | Must be `true` after provisioning; `false` stops deployments |

Optional repository variable `QA_STRIPE_PUBLISHABLE_KEY` supplies a Stripe test
publishable key at build time. It is not an environment variable because the
build job does not receive deployment secrets. Server-side Stripe test secrets
must be configured separately before payment integration testing. Initial QA
setup uses logged email and mock shipping; it does not send real email or create
shipping labels.

Connection identifiers and credentials are excluded from Git:
`target.json` in this directory, root `qa-ssh.local.env`, and root
`qa-bootstrap.local.env`. The latter is the local handover file for the database
connection, stable app key and unique initial QA administrator credentials.
Do not put secrets directly in `.gitignore`; it contains their filenames only.

The approved account is also pinned by a digest in both Python and PHP guards.
The target requires this exact domain and a QA database/user belonging to the
same account. A copied workflow cannot redirect deployment to another account.

## Server layout and provisioning

Within this domain only, the private `.midia-qa` directory contains:

```text
control/                 trusted SSH gate, release controller and validators
incoming/                verified uploaded archives
releases/<release-id>/   frontend, backend and release manifest
current -> releases/<release-id>
backups/                 private QA-only compressed database backups
shared/
  target.json            private target identity (0600)
  provisioned.json       account/repository/domain/routing marker
  backend.env            stable Laravel configuration (0600)
  mysql.cnf              QA-only [client] host/port/user/password (0600)
  qa-bootstrap.env       unique first-use administrator credentials (0600)
  storage/               persistent uploads, sessions, caches and logs
  deployments/           private per-attempt outcomes and health-check results
```

Provisioning requires a new empty database and a database user granted access
only to that database, PHP 8.3 with the app's extensions, Node 22, Python 3.9 or
newer, and `mysqldump`. No root database credentials are used. Per-user MySQL
defaults are rejected to prevent them from overriding the QA backup target.

`public_html/.htaccess` is rendered from `web.htaccess.template` with the private
root substituted. API and Sanctum requests dispatch through
`public_html/__qa_laravel__/index.php`, installed from `php-entry.php`, with the
adjacent `php.htaccess`. Node handles frontend pages and bundled static assets.
`public_html/storage` links only to shared public uploads, where
`storage.htaccess` disables script execution and directory listing. Laravel
source, vendor files, environment files and backups stay outside the web root.

The dedicated key's `authorized_keys` entry uses `restrict` and a forced command
running `control/ssh-gate.py`. The gate accepts only `qa-upload`, `qa-deploy` and
`qa-status` with validated arguments; it does not offer a shell, SCP or arbitrary
commands. Other keys are preserved. Initial provisioning and later trusted
controller/routing updates require an owner maintenance connection. Merely
pushing updated controller files does not replace installed trusted control
files.

## Database changes and recovery

The exact existing migration baseline is allowed only for the initial empty
database. The first deployment then runs `QaBootstrapSeeder` once, creating
labeled sample content and a unique administrator. Routine deployments preserve
data and never run `migrate:fresh`, generic seeders, or database restores.

For a future migration, add its file hash and an explanation to
`migration-policy.json` under `backwards_compatible`. Review that it preserves
the previous app's behavior. Destructive or incompatible migrations need a
separate maintenance procedure. Applied migration files may not be edited or
removed. A failed initial migration/bootstrap requires deliberate recovery;
the pipeline will not treat a partly initialized database as empty.

If activation health checks fail, the controller restores the previous common
release link only when the schema remains compatible and the link still points
to its own candidate. A failed first activation removes only that candidate's
link. It never reverses database changes automatically. Backups and release
directories are retained; cleanup is an explicit maintenance action.

Inspect the GitHub run, its browser diagnostics, and the private deployment
outcome to identify the failing stage. Set `QA_DEPLOY_ENABLED=false` to stop new
deployment jobs while investigating. Prefer reverting the source change and
pushing to `qa` so the complete checks run again. Re-run a failed deploy job only
after fixing an infrastructure issue; it uses the previously verified artifact.

For manual recovery, the owner must inspect the recorded previous release and
migration compatibility before atomically changing `current` and touching that
release's `frontend/tmp/restart.txt`. Do not restore a database over newer test
data without a deliberate recovery decision. Never use another account's
credentials, root path or database for these operations.

## Local checks

Use Node 22 and PHP 8.3 for parity with CI:

```sh
npm ci
npm run lint
npm run check -- --config .github/deploy/qa/astro.config.mjs
npm run test
node --test .github/deploy/qa/runtime.test.mjs
python3 -m unittest discover -s .github/deploy/qa -p 'test_*.py' -v
cd backend
composer install
vendor/bin/pint --test
php artisan test
```

From the repository root, install Chromium with `npx playwright install chromium`
and run `npm run test:e2e`. These use isolated test state. GitHub also runs the
backend against its disposable MySQL service; local SQLite alone does not cover
MySQL behavior.
