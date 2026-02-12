import type { CredentialsHelperConfig } from './types.js';

let _config: CredentialsHelperConfig | null = null;

/**
 * Set the DI configuration for the credentials helper.
 * Must be called before using `generateUserCredentials`.
 */
export function configure(config: CredentialsHelperConfig): void {
  _config = { ...config };
}

/**
 * Return the current configuration, or `null` if not yet configured.
 */
export function getConfig(): CredentialsHelperConfig | null {
  return _config ? { ..._config } : null;
}

/**
 * Reset configuration to unconfigured state.
 */
export function resetConfig(): void {
  _config = null;
}
