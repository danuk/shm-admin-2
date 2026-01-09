#!/bin/sh
set -e

# Output file
OUTPUT_FILE="${1:-/app/version.json}"

# Get git info for frontend
FRONTEND_COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
FRONTEND_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
FRONTEND_REMOTE=$(git config --get remote.origin.url 2>/dev/null || echo "")

# Generate frontend commit URL
if [ -n "$FRONTEND_REMOTE" ] && [ "$FRONTEND_REMOTE" != "" ]; then
    # Convert SSH to HTTPS URL
    FRONTEND_REPO_URL=$(echo "$FRONTEND_REMOTE" | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
    FRONTEND_COMMIT_URL="${FRONTEND_REPO_URL}/commit/${FRONTEND_COMMIT_SHA}"
else
    FRONTEND_COMMIT_URL=""
fi

# Backend info (can be overridden by env vars)
FRONTEND_VERSION="${FRONTEND_VERSION:-}"
BACKEND_COMMIT_SHA="${BACKEND_COMMIT_SHA:-}"
BACKEND_BRANCH="${BACKEND_BRANCH:-}"
BACKEND_COMMIT_URL="${BACKEND_COMMIT_URL:-}"

# If backend info is not provided, try to fetch from GitHub API
if [ -z "$BACKEND_COMMIT_SHA" ] && [ -n "$BACKEND_REPO" ]; then
    echo "Fetching backend info from GitHub API for repo: $BACKEND_REPO"

    # Try to get default branch first if not specified
    if [ -z "$BACKEND_BRANCH" ]; then
        REPO_INFO=$(curl -s "https://api.github.com/repos/${BACKEND_REPO}" || echo "")
        if [ -n "$REPO_INFO" ]; then
            BACKEND_BRANCH=$(echo "$REPO_INFO" | sed -n 's/.*"default_branch": *"\([^"]*\)".*/\1/p')
        fi
        BACKEND_BRANCH="${BACKEND_BRANCH:-master}"
    fi

    # Fetch latest commit info using GitHub API
    if command -v curl >/dev/null 2>&1; then
        API_RESPONSE=$(curl -s "https://api.github.com/repos/${BACKEND_REPO}/commits/${BACKEND_BRANCH}" || echo "")

        if [ -n "$API_RESPONSE" ]; then
            # Extract SHA using sed (works without jq)
            BACKEND_COMMIT_SHA=$(echo "$API_RESPONSE" | sed -n 's/.*"sha": *"\([^"]*\)".*/\1/p' | head -1)
            if [ -n "$BACKEND_COMMIT_SHA" ]; then
                BACKEND_COMMIT_URL="https://github.com/${BACKEND_REPO}/commit/${BACKEND_COMMIT_SHA}"
            fi
        fi
    fi
fi

# Create JSON file
cat > "$OUTPUT_FILE" << EOF
{
    "backend": {
      "commitSha": "${BACKEND_COMMIT_SHA}",
      "branch": "${BACKEND_BRANCH}",
      "commitUrl": "${BACKEND_COMMIT_URL}"
    },
    "frontend": {
      "version": "${FRONTEND_VERSION}",
      "commitSha": "${FRONTEND_COMMIT_SHA}",
      "branch": "${FRONTEND_BRANCH}",
      "commitUrl": "${FRONTEND_COMMIT_URL}"
    }
}
EOF

echo "Version file generated: $OUTPUT_FILE"
cat "$OUTPUT_FILE"
