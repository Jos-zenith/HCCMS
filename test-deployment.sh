#!/bin/bash
# Smoke-test a running HCCMS deployment: database, inference server, and a real ingest round-trip.
#   APP_URL=https://your-app.example DEVICE_KEY=dev_xxx ./test-deployment.sh

APP_URL="${APP_URL:-http://localhost:3000}"

echo "== Health: $APP_URL/api/health"
curl -s "$APP_URL/api/health"; echo; echo

if [ -n "$DEVICE_KEY" ]; then
  echo "== Posting one reading with DEVICE_KEY"
  curl -s -X POST "$APP_URL/api/ingest" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DEVICE_KEY" \
    -d "{\"ts\": $(date +%s), \"temperature\": 30.5, \"humidity\": 65}"
  echo
else
  echo "(Set DEVICE_KEY to a key from the Manage page to test ingestion.)"
fi
