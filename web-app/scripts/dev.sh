#!/bin/bash
PORT=${1:-3000}

echo "Setting SITE_URL=http://localhost:$PORT in Convex..."
pnpm exec convex env set SITE_URL "http://localhost:$PORT"

echo "Starting dev server on port $PORT..."
PORT=$PORT exec pnpm dev
