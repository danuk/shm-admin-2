#!/bin/sh

# Просто используем существующий конфиг
# /etc/nginx/conf.d/default.conf уже скопирован из nginx.conf.template при сборке

# Если задан VITE_HOST - заменяем статическую обслужку на проксирование к Vite
if [ ! -z "$VITE_HOST" ]; then
    echo "Development mode: proxying to Vite server at $VITE_HOST:5173"

    # Заменяем статическое обслуживание на проксирование к Vite
    # Если есть SHM_BASE_PATH, проксируем с сохранением пути
    if [ ! -z "$SHM_BASE_PATH" ] && [ "$SHM_BASE_PATH" != "/" ]; then
        sed -i "s|        alias /app/;|        proxy_pass http://$VITE_HOST:5173;|" /etc/nginx/conf.d/default.conf
    else
        sed -i "s|        alias /app/;|        proxy_pass http://$VITE_HOST:5173/;|" /etc/nginx/conf.d/default.conf
    fi
    sed -i "s|        index index.html;|        proxy_http_version 1.1;|" /etc/nginx/conf.d/default.conf
    sed -i "s|        try_files \$uri \$uri/ /index.html;|        proxy_set_header Upgrade \$http_upgrade;\\
        proxy_set_header Connection 'upgrade';\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto \$scheme;\\
        proxy_cache_bypass \$http_upgrade;|" /etc/nginx/conf.d/default.conf

    # Добавляем специальные locations для Vite ресурсов ПЕРЕД основным location /
    sed -i "/location \/ {/i\\
    # Vite special resources\\
    location ~ ^/@(vite|react-refresh) {\\
        proxy_pass http://$VITE_HOST:5173;\\
        proxy_http_version 1.1;\\
        proxy_set_header Upgrade \$http_upgrade;\\
        proxy_set_header Connection 'upgrade';\\
        proxy_set_header Host \$host;\\
        proxy_cache_bypass \$http_upgrade;\\
    }\\
\\
    location ~ ^/src/ {\\
        proxy_pass http://$VITE_HOST:5173;\\
        proxy_http_version 1.1;\\
        proxy_set_header Host \$host;\\
    }\\
" /etc/nginx/conf.d/default.conf

    # Убираем assets location так как Vite сам обслуживает ресурсы
    sed -i "/location \/assets\/ {/,/}/d" /etc/nginx/conf.d/default.conf

    # Для network_mode: host используем localhost
    if [ -z "$VITE_HOST" ] || [ "$VITE_HOST" = "localhost" ] || [ "$VITE_HOST" = "127.0.0.1" ]; then
        sed -i "s|http://$VITE_HOST:5173|http://127.0.0.1:5173|g" /etc/nginx/conf.d/default.conf
    fi
fi

[ -z "$SHM_URL" ] || sed -i "s|http://shm.local|$SHM_URL|g" /etc/nginx/conf.d/default.conf
[ -z "$SHM_HOST" ] || sed -i "s|http://shm.local|$SHM_HOST|g" /etc/nginx/conf.d/default.conf
[ -z "$RESOLVER" ] || sed -i "s|resolver 127.0.0.11|resolver $RESOLVER|g" /etc/nginx/conf.d/default.conf

if [ ! -z "$VITE_SHOW_SWAGGER" ] && [ "$VITE_SHOW_SWAGGER" == "true" ]; then
    SWAGGER_LOCATION="    location /swagger {\n        alias /swagger;\n        try_files \$uri \$uri/ /swagger/index.html;\n    }\n\n    if"
    sed -i "s|    if (\$http_origin = '') {|$SWAGGER_LOCATION (\$http_origin = '') {|" /etc/nginx/conf.d/default.conf
fi

if [ ! -z "$SHM_BASE_PATH" ] && [ "$SHM_BASE_PATH" != "/" ]; then
    echo "  SHM_BASE_PATH: $SHM_BASE_PATH"
    sed -i "s|<base href=\"/\" />|<base href=\"$SHM_BASE_PATH/\" />|" /app/index.html
    sed -i "s|href=\"/favicon.jpg\"|href=\"$SHM_BASE_PATH/favicon.jpg\"|" /app/index.html
    sed -i "s|location / {|location $SHM_BASE_PATH/ {|" /etc/nginx/conf.d/default.conf
    sed -i "s|try_files \$uri \$uri/ /index.html;|try_files \$uri \$uri/ $SHM_BASE_PATH/index.html;|" /etc/nginx/conf.d/default.conf
    sed -i "s|location /assets/ {|location $SHM_BASE_PATH/assets/ {|" /etc/nginx/conf.d/default.conf

    # Add Vite special resources handling before the main location block with base path
    sed -i "/location $SHM_BASE_PATH\/ {/i\\
    # Vite special resources with base path\\
    location ~ ^$SHM_BASE_PATH/@(vite|react-refresh) {\\
        proxy_pass http://$VITE_HOST:5173;\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto \$scheme;\\
    }\\
\\
    location ~ ^$SHM_BASE_PATH/src/ {\\
        proxy_pass http://$VITE_HOST:5173;\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto \$scheme;\\
    }\\
\\
" /etc/nginx/conf.d/default.conf

    sed -i "s|location /shm {|location $SHM_BASE_PATH/shm {|" /etc/nginx/conf.d/default.conf
    sed -i "s|/shm/healthcheck|$SHM_BASE_PATH/shm/healthcheck|" /etc/nginx/conf.d/default.conf
    sed -i "s|#proxy_cookie_path;|proxy_cookie_path / $SHM_BASE_PATH/;|" /etc/nginx/conf.d/default.conf

    # Исправляем proxy_pass для base path - убираем слэш чтобы сохранить путь
    if [ ! -z "$VITE_HOST" ]; then
        sed -i "s|        proxy_pass http://$VITE_HOST:5173/;|        proxy_pass http://$VITE_HOST:5173;|" /etc/nginx/conf.d/default.conf
    fi

    REDIRECT="    location = $SHM_BASE_PATH {\n        return 301 \$scheme://\$http_host$SHM_BASE_PATH/;\n    }\n\n    "
    sed -i "s|location $SHM_BASE_PATH/ {|$REDIRECT location $SHM_BASE_PATH/ {|" /etc/nginx/conf.d/default.conf

    if [ ! -z "$VITE_SHOW_SWAGGER" ] && [ "$VITE_SHOW_SWAGGER" == "true" ]; then
        sed -i "s|location /swagger {|location $SHM_BASE_PATH/swagger {|" /etc/nginx/conf.d/default.conf
        sed -i "s|/shm/|$SHM_BASE_PATH/shm/|" /swagger/index.html

        # Добавляем редирект для swagger без слэша
        SWAGGER_REDIRECT="    location = $SHM_BASE_PATH/swagger {\n        return 301 \$scheme://\$http_host$SHM_BASE_PATH/swagger/;\n    }\n\n    "
        sed -i "s|location $SHM_BASE_PATH/swagger {|$SWAGGER_REDIRECT location $SHM_BASE_PATH/swagger {|" /etc/nginx/conf.d/default.conf
    fi
fi

echo "Starting nginx with configuration:"
echo "  SHM_HOST: ${SHM_HOST:-http://shm.local}"

exec nginx -g 'daemon off;'
