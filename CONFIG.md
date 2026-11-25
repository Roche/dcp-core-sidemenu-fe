# `config.json` reference

Reference for SideMenu runtime configuration, local setup and deployment.

The file is served next to `main.js` and read when the app
bootstraps, so one build can be promoted to every environment. Start from [`config.example.json`](config.example.json).

> `config.json` is publicly readable. **Never put secrets, tokens or credentials in it.**

## Local development

Copy the example and adjust `gatewayUrl` for the local host:

```bash
cp config.example.json config.json
npm start
```

The root `config.json` is gitignored and copied to the build output root by the global Angular asset rule. It is
fetched without cache during each bootstrap, so changes take effect after reloading the host page. Do not edit the
host-owned `module-settings/` assets; in particular `dist/settings.json` is unrelated to app runtime config.
The legacy `apiUrl`, `privacyPolicyUrl` and `backendPortCheckUrl` values have no consumers in this app.

## CI and deployment

This repository includes `digitalclone/continuous-integration`'s `/templates/app/angular.yml` and sets
`CONFIG_VERSION: "2"` in its top-level variables. The shared template implementation is external to this repository;
its current settings generation, `CLI_DEPLOY_URL` substitution and deployment behavior have not been verified.
Verify that it places a valid `config.json` beside `main.js` without injecting runtime settings at build time.

### Container image scaffolding

The Dockerfile builds `dist` with Node `20.19.6` and copies it into a shared frontend base image. The build expects
`BASE_IMAGE_NAME` and `BASE_IMAGE_VERSION` arguments and a BuildKit secret named `npmrc` for `npm ci`; the target CI
configuration does not currently declare these values or show that it passes the secret. The base image and its
entrypoint behavior have not been verified for SideMenu.

`config.json.template` maps required `gatewayUrl` to the proposed, unconfirmed SideMenu deployment variable
`DCP_GATEWAY_URL`. Confirm the image name/version, secret support and environment-variable names before enabling the
Docker build. Verify the base image's substitution, JSON escaping, startup failure behavior, and placement and cache
behavior of the resulting `config.json`. The container image has not yet been built or run against a confirmed base
image.

For a pipeline that writes the file directly, the following `jq` example is illustrative only; connect its inputs
to the actual protected CI variables and output directory, and omit an unset optional base URL:

```sh
jq -n --arg gatewayUrl "$GATEWAY_URL" \
      --argjson production "$PRODUCTION" \
      --arg baseAppUrl "${BASE_APP_URL:-}" \
      '{production:$production, gatewayUrl:$gatewayUrl} + (if $baseAppUrl == "" then {} else {baseAppUrl:$baseAppUrl} end)' \
      > dist/config.json
```

Verify generated JSON, escaping, file placement and cache behavior in the actual deployment before release. Serve
`config.json` with `Cache-Control: no-store` as well as relying on the loader's no-store fetch.

## Example

```json
{
  "production": false,
  "gatewayUrl": "https://api.example.com:8199"
}
```

## Values

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `production` | `boolean` or `"true"`/`"false"` | Yes | none | Enables Angular production mode when true. Any other value is rejected. |
| `gatewayUrl` | `string` | Yes | none | Base URL provided to the DCP HTTP services. Must be non-empty. |
| `baseAppUrl` | `string` | No | `window.location.origin + "/"` | Host base URL used for menu translations. See below. |

Unknown keys are kept in the loaded config but are not used by the app.

### `production`

Accepts the JSON booleans `true`/`false` and the strings `"true"`/`"false"`, because CI tools such as
`jq --arg` emit strings. A missing or invalid value fails the load instead of silently selecting development mode.

### `gatewayUrl`

Required and provided to the DCP HTTP services by `provideRuntimeConfig()`. Use the API gateway base URL, e.g.
`https://api.example.com:8199`.

### `baseAppUrl` (optional)

Leave it out when the host app is served from the root of its domain: the app then uses the current page's origin
with a trailing slash.

| Page the app runs on | `baseAppUrl` in config | Resulting value |
|----------------------|------------------------|-----------------|
| `https://example.com/page` | omitted | `https://example.com/` |
| `http://localhost:4220/` | omitted | `http://localhost:4220/` |
| `https://example.com/dcp/page` | omitted | `https://example.com/` (subfolder is **not** detected) |
| `https://example.com/dcp/page` | `"https://example.com/dcp/"` | `https://example.com/dcp/` |
| any | `"https://example.com/dcp"` | `https://example.com/dcp/` (slash added) |

Set it only when the host app lives under a subfolder (e.g. `example.com/dcp/`): the built app cannot know that path.

Rules for a configured value:

- must be an absolute `http://` or `https://` URL (`/dcp/` or `ftp://...` are rejected);
- must not contain a query string or fragment;
- a trailing `/` is added if missing;
- must be the **host app's** URL, not the CDN or bundle path of the SideMenu app.

## Validation and errors

The config is loaded and validated once on bootstrap by `createRuntimeConfigLoader` / `parseRuntimeConfig` from
`@open-dcp/angular-services`, and cached. If it cannot be loaded or is invalid, SideMenu adds a localized error
message to `uiStore` and rethrows the error so single-spa bootstrap fails; the next bootstrap retries. Parser errors
start with `[RuntimeConfig]`.

| Problem | Error |
|---------|-------|
| File missing or not served | `Failed to load runtime config <url> (HTTP <status>)` |
| Not valid JSON | `Runtime config <url> is not valid JSON` |
| Not a JSON object | `expected a JSON object` |
| `production` missing or not `true`/`false` | `production must be true or false` |
| `gatewayUrl` missing or empty | `missing or empty gatewayUrl` |
| `baseAppUrl` not a string | `baseAppUrl must be a string` |
| `baseAppUrl` empty, not HTTP(S), or has query/fragment | `... explicit base app URL ...` |
| Config load/bootstrap failure | Localized `config-load-failed` message is sent to `uiStore`; bootstrap rejects. |

## Where each value is used

| Key | Used in |
|-----|---------|
| `production` | `main.single-spa.ts` / `main.ts` (`enableProdMode()`) |
| `gatewayUrl` | DCP `HttpConfig` provided by `provideRuntimeConfig()` in `app.module.ts` |
| `baseAppUrl` | `HttpLoaderFactory` in `app.module.ts`, for host menu translations at `js/i18n/` |

Read values in code by injecting `APP_CONFIG` (typed `DcpRuntimeConfig`, both from `@open-dcp/angular-services`); do
not import `environment` or `settings.json` for runtime values.

## Adding a new key

Update all of these together:

1. `src/app/shared/config/app-config.ts`: declare `interface AppConfig extends DcpRuntimeConfig`, write
   `parseAppConfig(raw, source)` that calls `parseRuntimeConfig(raw, source)` and validates the new key (throw if it
   is required and missing/invalid), pass it as the second argument of `createRuntimeConfigLoader`, inject
   `APP_CONFIG` typed as `AppConfig`, and add a spec for the parser
2. `config.example.json` with a placeholder value
3. this file, including the example and CI `jq` example
