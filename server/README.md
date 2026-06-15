# Fate-ish API

Small production gateway for the mobile app. It keeps provider secrets off the
client, fixes the upstream model, requires idempotency keys, and enforces guest
request limits.

## Endpoints

- `GET /healthz`
- `POST /v1/auth/guest`
- `POST /v1/auth/email`
- `POST /v1/auth/wechat` (reserved until WeChat Open Platform approval)
- `GET /v1/cases`
- `PUT /v1/cases`
- `POST /v1/chat/completions`

The chat endpoint requires both `Authorization: Bearer <token>` and an
`Idempotency-Key` header. The client cannot select the upstream URL, API key, or
arbitrary model. It may request only the server allowlisted Flash or Pro tier.
