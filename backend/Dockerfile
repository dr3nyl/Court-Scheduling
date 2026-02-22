# Court Scheduling - Laravel backend for Ubuntu/EC2
FROM php:8.2-cli

WORKDIR /var/www

# --------------------------
# Install system dependencies and PHP extensions
# --------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        curl \
        libzip-dev \
        libpq-dev \
        libonig-dev \
        libxml2-dev \
        zip \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        mbstring \
        xml \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --------------------------
# Composer
# --------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# --------------------------
# Application code
# --------------------------
COPY . .

# Ensure .env exists
RUN test -f .env || cp .env.example .env

# --------------------------
# Install PHP dependencies
# --------------------------
RUN composer install --no-dev --optimize-autoloader

# --------------------------
# Create storage/cache dirs and set permissions
# --------------------------
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# --------------------------
# Expose port for Laravel
# --------------------------
EXPOSE 8000

# --------------------------
# Entrypoint script
# --------------------------
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# --------------------------
# Default command to serve Laravel
# --------------------------
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
