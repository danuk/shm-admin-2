#!/bin/sh

cp /etc/nginx/nginx.conf.template /etc/nginx/http.d/default.conf

[ -z "$SHM_URL" ] || sed -i "s|http://shm.local|$SHM_URL|g" /etc/nginx/http.d/default.conf
[ -z "$SHM_HOST" ] || sed -i "s|http://shm.local|$SHM_HOST|g" /etc/nginx/http.d/default.conf
[ -z "$RESOLVER" ] || sed -i "s|resolver 127.0.0.11|resolver $RESOLVER|g" /etc/nginx/http.d/default.conf

if [ ! -z "$VITE_SHOW_SWAGGER" ] && [ "$VITE_SHOW_SWAGGER" == "true" ]; then
    SWAGGER_LOCATION="    location /swagger {\n        alias /swagger;\n        try_files \$uri \$uri/ /swagger/index.html;\n    }\n\n    if"
    sed -i "s|    if (\$http_origin = '') {|$SWAGGER_LOCATION (\$http_origin = '') {|" /etc/nginx/http.d/default.conf
fi

if [ ! -z "$SHM_BASE_PATH" ] && [ "$SHM_BASE_PATH" != "/" ]; then
    # Update base path in index.html first
    sed -i "s|<base href=\"/\" />|<base href=\"$SHM_BASE_PATH/\" />|" /app/index.html
    
    # Update nginx config
    sed -i "s|try_files \$uri \$uri/ /index.html;|try_files \$uri \$uri/ $SHM_BASE_PATH/index.html;|" /etc/nginx/http.d/default.conf
    sed -i "s|location / {|location $SHM_BASE_PATH/ {|" /etc/nginx/http.d/default.conf
    sed -i "s|location /shm {|location $SHM_BASE_PATH/shm {|" /etc/nginx/http.d/default.conf
    sed -i "s|/shm/healthcheck|$SHM_BASE_PATH/shm/healthcheck|" /etc/nginx/http.d/default.conf
    sed -i "s|#proxy_cookie_path;|proxy_cookie_path / $SHM_BASE_PATH;|" /etc/nginx/http.d/default.conf
    
    # Add redirect from / to /SHM_BASE_PATH/
    REDIRECT="    location = / {\n        return 301 \$scheme://\$host$SHM_BASE_PATH/;\n    }\n\n    "
    sed -i "s|location $SHM_BASE_PATH/ {|$REDIRECT location $SHM_BASE_PATH/ {|" /etc/nginx/http.d/default.conf

    if [ ! -z "$VITE_SHOW_SWAGGER" ] && [ "$VITE_SHOW_SWAGGER" == "true" ]; then
        sed -i "s|location /swagger {|location $SHM_BASE_PATH/swagger {|" /etc/nginx/http.d/default.conf
        sed -i "s|/shm/|$SHM_BASE_PATH/shm/|" /swagger/index.html
    fi
fi

echo "Starting nginx with configuration:"
echo "  SHM_HOST: ${SHM_HOST:-http://shm.local}"

exec nginx -g 'daemon off;'