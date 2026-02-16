# Court Scheduling - Laravel backend for Ubuntu/EC2
FROM php:8.2-cli

WORKDIR /var/www

# Install system dependencies and PHP extension dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        curl \
        libzip-dev \
        libpng-dev \
        libpq-dev \
        libonig-dev \
        libxml2-dev \
    && docker-php-ext-configure zip --with-zip \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        mbstring \
        xml \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Application code (use .dockerignore to exclude vendor, node_modules, .env)
COPY . .

# Ensure .env exists (Laravel needs it; real values come from Docker env)
RUN test -f .env || cp .env.example .env

# Install PHP dependencies (no dev for smaller image; use composer install for dev)
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist \
    && composer dump-autoload --optimize

# Create storage/cache dirs and set permissions for Laravel
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 8000

# Entrypoint: wait for DB, migrate, then serve
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
