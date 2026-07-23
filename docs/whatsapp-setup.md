# WhatsApp Cloud API setup (Campaign Manager)

1. Apply migration `packages/db/migrations/015_whatsapp_campaigns.sql` in Supabase.
2. Set these API env vars (see `apps/api/.env.example`):
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_ACCESS_TOKEN` (permanent system user token)
   - `WHATSAPP_VERIFY_TOKEN` (any strong random string you choose)
   - `WHATSAPP_APP_SECRET` (Meta app secret — used to verify webhook signatures)
3. In Meta Developer Console → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://<your-api-host>/v1/webhooks/whatsapp`
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to `messages`
4. Ensure at least one **approved** message template exists on the WABA.
5. In the app: Integrations shows WhatsApp status → open a WhatsApp campaign → Flow tab → Sync templates on the Message node → Generate / Submit / Approve.

Local testing: expose the API with a tunnel (ngrok/cloudflared) so Meta can reach the webhook.
