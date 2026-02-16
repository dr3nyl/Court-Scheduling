#!/bin/sh
set -e

# Generate app key if not set (required before migrate)
if [ -z "${APP_KEY}" ] || [ "${APP_KEY}" = "" ]; then
  php artisan key:generate --force
fi

# Wait for database and run migrations (retry until DB is up)
if [ -n "${DB_HOST}" ]; then
  echo "Waiting for database at ${DB_HOST}..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if php artisan migrate --force --no-interaction 2>/dev/null; then
      echo "Migrations completed."
      break
    fi
    if [ "$i" = "10" ]; then
      echo "Database not available after 10 attempts, exiting."
      exit 1
    fi
    sleep 2
  done
else
  php artisan migrate --force --no-interaction 2>/dev/null || true
fi

exec "$@"
