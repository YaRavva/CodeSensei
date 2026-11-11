#!/usr/bin/env bash
# Post-deploy verification for codesensei.ravva.su.
#
# Usage (after a deployment reaches "ready"):
#   bash scripts/check-prod.sh
#
# Checks: auth routes, email assets, CSP header (proxy.ts present),
# CSRF rejection of cross-site POST, and the verification endpoint guard.
set -u

BASE="${BASE_URL:-https://codesensei.ravva.su}"

echo "=== routes ==="
for path in /login /register /verify-email /reset-password /forgot-password /modules; do
  printf '%-18s -> %s\n' "$path" "$(curl.exe -s -o NUL -w '%{http_code}' "$BASE$path")"
done

echo
echo "=== assets ==="
for asset in /emails/katana.png /icon.svg; do
  printf '%-22s -> %s\n' "$asset" "$(curl.exe -s -o NUL -w '%{http_code}' "$BASE$asset")"
done

echo
echo "=== proxy.ts (CSP header must be present) ==="
curl.exe -s -D - -o NUL "$BASE/login" | grep -i '^content-security-policy' || echo "FAIL: CSP header missing — proxy.ts did not run"

echo
echo "=== CSRF (cross-site POST must be 403) ==="
printf 'cross-site POST    -> %s\n' "$(curl.exe -s -o NUL -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{}' "$BASE/api/tasks/attempts")"

echo
echo "=== verification endpoint (empty token must be 400) ==="
printf 'verify-email empty -> %s\n' "$(curl.exe -s -o NUL -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $BASE" -d '{}' "$BASE/api/auth/verify-email")"
