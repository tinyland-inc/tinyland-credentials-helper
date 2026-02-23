import type { CredentialsHelperConfig } from './types.js';

let _config: CredentialsHelperConfig | null = null;





export function configure(config: CredentialsHelperConfig): void {
  _config = { ...config };
}




export function getConfig(): CredentialsHelperConfig | null {
  return _config ? { ..._config } : null;
}




export function resetConfig(): void {
  _config = null;
}
