# Yandex Music resolver through API Gateway

Supabase Edge Functions receive HTTP 451 from `api.music.yandex.net`.
Use Yandex Cloud API Gateway as a small public proxy with Russian egress.

## Create the gateway

1. Open Yandex Cloud Console and create an API Gateway.
2. Paste the contents of `api-gateway.yaml` as the OpenAPI specification.
3. Save the gateway and copy its service domain.
4. Verify the public endpoint:

```text
https://<service-domain>/playlist/ffd98707-2b27-7b02-a78e-064dce9c76c7
```

The response should be JSON with a `result.owner.login` field and a
`result.kind` field. These values are used to construct the iframe URL:

```text
https://music.yandex.ru/iframe/playlist/<owner.login>/<kind>
```

After the endpoint is available, update the frontend resolver URL and normalize
the raw Yandex response in `playlists.html`.
