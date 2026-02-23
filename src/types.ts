


export interface UserCredentials {
  username: string;
  displayName: string;
  email: string;
  tempPassword?: string;
  totpSecret?: string;
}




export interface CredentialsPackage {
  image: Buffer;
  text: string;
}







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
