#!/usr/bin/env bash
# Subscribe the production Bachs webhook endpoint to Connect events so vendor
# payouts actually get marked ready (step 6 of vendor onboarding).
#
# Two changes:
#   1. event_source  account -> all   (account alone never delivers Connect
#      events, which is why capability.updated could never arrive)
#   2. event_types   += capability.updated
#
# event_types REPLACES the whole list on Bachs, so every type we still want is
# resent below. Dropping one here silently unsubscribes it.
#
# Requires an API key with the `webhooks:write` scope. The key in .env.local
# does NOT have it (403 FORBIDDEN) — either "Edit scopes" on the existing key in
# the Bachs Developer Portal (the key is not regenerated), or create a new key
# with that scope and pass it here.

set -euo pipefail

KEY="${BACHS_SECRET_KEY:-$(grep '^BACHS_SECRET_KEY=' .env.local | cut -d= -f2)}"
ENDPOINT_ID="whe_tKgS97nPqiTbeR1u"
BASE="${BACHS_BASE_URL:-https://sandbox-api.bachs.io}"

echo "Endpoint: $ENDPOINT_ID @ $BASE"
echo "--- BEFORE ---"
curl -s --max-time 20 -H "Authorization: Bearer $KEY" \
  "$BASE/v1/webhooks/endpoints/$ENDPOINT_ID" | python3 -m json.tool

# Status code captured separately: appending it to the body makes json.tool
# fail on the trailing line ("Extra data"), which aborts the run under set -e.
echo "--- PATCH ---"
HTTP_CODE=$(curl -s -o /tmp/bachs_patch.json -w "%{http_code}" --max-time 20 -X PATCH \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_source": "all",
    "event_types": [
      "checkout.completed",
      "collection.failed",
      "collection.succeeded",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "refund.paid",
      "capability.updated"
    ]
  }' \
  "$BASE/v1/webhooks/endpoints/$ENDPOINT_ID")
echo "HTTP $HTTP_CODE"
python3 -m json.tool < /tmp/bachs_patch.json || cat /tmp/bachs_patch.json
if [ "$HTTP_CODE" != "200" ]; then
  echo "PATCH did not return 200 — see response above." >&2
  exit 1
fi

echo "--- AFTER ---"
curl -s --max-time 20 -H "Authorization: Bearer $KEY" \
  "$BASE/v1/webhooks/endpoints/$ENDPOINT_ID" > /tmp/bachs_after.json
python3 -m json.tool < /tmp/bachs_after.json

# Assert the two things this change exists to do, so the script exits non-zero
# if either ever regresses.
python3 - <<'PY'
import json, sys
d = json.load(open("/tmp/bachs_after.json"))
required = {"checkout.completed", "collection.failed", "collection.succeeded",
            "customer.subscription.created", "customer.subscription.updated",
            "customer.subscription.deleted", "refund.paid", "capability.updated"}
have = set(d.get("event_types") or [])
ok = True
if d.get("event_source") != "all":
    print(f"FAIL event_source={d.get('event_source')!r}, expected 'all'"); ok = False
if "capability.updated" not in have:
    print("FAIL capability.updated not subscribed"); ok = False
if missing := (required - have):
    print(f"FAIL missing pre-existing types: {sorted(missing)}"); ok = False
if not d.get("enabled"):
    print("FAIL endpoint is disabled"); ok = False
if ok:
    print("VERIFIED event_source=all, capability.updated subscribed, all 7 original types intact, endpoint enabled")
sys.exit(0 if ok else 1)
PY
