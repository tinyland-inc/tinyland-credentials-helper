/**
 * Represents generated credentials for a user account.
 */
export interface UserCredentials {
  username: string;
  displayName: string;
  email: string;
  tempPassword?: string;
  totpSecret?: string;
}

/**
 * Output from the credentials package generator (image + text card).
 */
export interface CredentialsPackage {
  image: Buffer;
  text: string;
}

/**
 * Dependency-injection configuration for the credentials helper.
 *
 * All functions that would otherwise couple this package to specific
 * crypto / TOTP / card-generation implementations are injected here.
 */
export interface CredentialsHelperConfig {
  generateCredentialsPackage: (options: {
    username: string;
    displayName: string;
    tempPassword: string;
    totpUri: string;
    issuer: string;
  }) => Promise<CredentialsPackage>;
  generateTempPassword: (length: number) => string;
  generateTOTPSecret: () => string;
  generateTOTPUri: (secret: string, issuer: string, account: string) => string;
}
