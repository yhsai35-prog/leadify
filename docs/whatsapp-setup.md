# WhatsApp Cloud API setup (Campaign Manager)

## 1. Database migrations

Run these in the Supabase SQL Editor (in order):

1. `packages/db/migrations/015_whatsapp_campaigns.sql`
2. `packages/db/migrations/016_campaign_recipients_history.sql` ← **required for recipient picker + delivery history**

Migration 016 adds:

- `campaign_recipients` — which phones/emails a campaign will message
- delivery columns on `whatsapp_messages` (`to_phone`, `delivery_status`, `delivered_at`, `read_at`)
- `whatsapp_message_events` — accepted → sent → delivered → read (+ inbound replies)

## 2. API env vars

Set in `apps/api/.env` (see `.env.example`):

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN` (permanent system user token)
- `WHATSAPP_VERIFY_TOKEN` (any strong random string you choose)
- `WHATSAPP_APP_SECRET` (Meta app secret — verifies webhook signatures)

Restart the API after changing env.

## 3. Meta webhook (delivery / read receipts)

In Meta Developer Console → WhatsApp → Configuration → Webhook:

- Callback URL: `https://<your-api-host>/v1/webhooks/whatsapp`
- Verify token: same as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to `messages`

Local testing: expose the API with ngrok/cloudflared so Meta can reach the webhook. Without a public webhook you can still **send**; you just won’t get delivered/read updates until it’s connected.

## 4. Templates

Ensure at least one **approved** template exists on the WABA (e.g. `hello_world` / `en_US`).

## 5. Send a campaign

1. Create a **WhatsApp** campaign (or switch channel on the Flow canvas).
2. Open the **Recipients** tab:
   - **Add test number** — enter your personal phone (`+91…`) to dry-run first, or
   - Add leads that have phone numbers and select them
3. **Flow** tab → Message node → Sync templates → pick template → Save.
4. **Generate for selected** → **Submit all** → approve in Approval Center.
5. **Activity** tab shows message body + delivery timeline.

Meta note: in sandbox / before going live, register the test phone under WhatsApp → API Setup → **To** numbers, or Meta will reject the send.

