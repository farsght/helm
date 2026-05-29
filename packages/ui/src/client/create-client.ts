/**
 * Thin re-export of createApiClient and SDK types from @farsight/sdk.
 *
 * No 'use client' — this is a pure factory utility, not a React hook.
 *
 * @note Consumers should use the surface-specific hooks provided by FarsightProvider
 * rather than calling createApiClient directly. Use createApiClient only when you
 * need to instantiate a client outside the React tree (e.g. server-side prefetch).
 */
export {
  createApiClient,
  type ApiClient,
  ApiClientError,
  ApiClientSchemaError,
  type CreateApiClientOptions,
} from "@farsight/sdk"
