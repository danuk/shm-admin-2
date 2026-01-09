# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build arguments for version info
ARG FRONTEND_VERSION=""
ARG BACKEND_COMMIT_SHA=""
ARG BACKEND_BRANCH=""
ARG BACKEND_COMMIT_URL=""
ARG BACKEND_REPO=""

# Generate version.json before building
COPY generate-version.sh ./
RUN apk add --no-cache git && \
    chmod +x generate-version.sh && \
    mkdir -p /app/public && \
    env FRONTEND_VERSION="${FRONTEND_VERSION}" \
        BACKEND_COMMIT_SHA="${BACKEND_COMMIT_SHA}" \
        BACKEND_BRANCH="${BACKEND_BRANCH}" \
        BACKEND_COMMIT_URL="${BACKEND_COMMIT_URL}" \
        BACKEND_REPO="${BACKEND_REPO}" \
    ./generate-version.sh /app/public/version.json

RUN npm run build

FROM nginx:stable-alpine AS admin

WORKDIR /app
ENTRYPOINT ["/entry.sh"]
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider "127.0.0.1${SHM_BASE_PATH:-}/shm/healthcheck.cgi" || exit 1
EXPOSE 80

COPY nginx.conf.template /etc/nginx/conf.d/default.conf
COPY swagger/index.html /swagger/index.html
COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

COPY --from=builder /app/dist /app
