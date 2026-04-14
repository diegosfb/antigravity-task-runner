# Anthropic Settings

## `ANTHROPIC_API_KEY` vs `ANTHROPIC_AUTH_TOKEN`

These two variables are related, but they are not usually interchangeable.

## `ANTHROPIC_API_KEY`

`ANTHROPIC_API_KEY` is typically used for direct authentication with Anthropic's API. In that setup, requests usually go straight to Anthropic and the credential is sent as an API key header such as `x-api-key`.

Use this when:

- you are calling Anthropic directly
- your tool or SDK expects the standard Anthropic API flow
- you are not routing traffic through an intermediary gateway

## `ANTHROPIC_AUTH_TOKEN`

`ANTHROPIC_AUTH_TOKEN` is more commonly used for bearer-token style authentication when requests are routed through an intermediary service, proxy, or gateway. Examples include custom internal gateways or providers that expose Anthropic-compatible endpoints but authenticate differently.

Use this when:

- you are going through an intermediary instead of Anthropic directly
- the endpoint expects `Authorization: Bearer ...`
- your platform documentation explicitly asks for an auth token instead of an API key

## Related Setting: `ANTHROPIC_BASE_URL`

`ANTHROPIC_BASE_URL` controls where requests are sent.

- If you are using the official Anthropic API, this should point to Anthropic's API endpoint.
- If you are using a proxy, gateway, or Anthropic-compatible service, this should point to that service instead.

In practice, the meaning of your credential often depends on the base URL:

- direct Anthropic endpoint: usually `ANTHROPIC_API_KEY`
- proxy or compatible endpoint: often `ANTHROPIC_AUTH_TOKEN`

## Practical Rule of Thumb

Use:

- `ANTHROPIC_API_KEY` for direct Anthropic access
- `ANTHROPIC_AUTH_TOKEN` for proxy or bearer-token based access

If both are present, the application or tool may prefer one over the other depending on its implementation, so check the tool's auth logic rather than assuming both will be used.

## Common Mistake

A frequent source of confusion is pointing `ANTHROPIC_BASE_URL` at a non-Anthropic endpoint while still assuming the standard Anthropic API key flow will work unchanged. Many compatible services mimic the Anthropic API shape but require different headers or token handling.

## Security Reminder

Both values should be treated as secrets.

- Do not commit them to Git.
- Do not paste them into documentation or tickets.
- Rotate them immediately if they are exposed.

## Bottom Line

If you are talking to Anthropic directly, use `ANTHROPIC_API_KEY`. If you are talking to an Anthropic-compatible proxy or gateway that expects bearer-token auth, use `ANTHROPIC_AUTH_TOKEN`. Always confirm the expected auth method against the endpoint you are actually calling.
