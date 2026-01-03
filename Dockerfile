# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:stable-alpine AS shm-admin-2

WORKDIR /app
ENTRYPOINT ["/entry.sh"]
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider "127.0.0.1${SHM_BASE_PATH:-}/shm/healthcheck.cgi" || exit 1
EXPOSE 80

COPY nginx.conf.template /etc/nginx/conf.d/default.conf
COPY swagger/index.html /swagger/index.html
COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

COPY --from=builder /app/dist /app
