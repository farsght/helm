/**
 * @farsight/ui — thin re-export of createApiClient from @farsight/sdk.
 *
 * No 'use client' — pure factory utility, not a React hook.
 */
export {
  createApiClient,
  type ApiClient,
  type ApiClientError,
  type ApiClientSchemaError,
  type CreateApiClientOptions,
} from "@farsight/sdk"
