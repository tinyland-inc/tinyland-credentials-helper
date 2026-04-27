import type { UserCredentials } from './types.js';
export declare function generateUserCredentials(username: string, displayName: string, email: string): Promise<UserCredentials & {
    credentialsCard: Buffer;
    credentialsText: string;
}>;
export declare function createCredentialsDownloadResponse(credentialsCard: Buffer, username: string, format?: 'png' | 'txt'): Response;
export declare function generateCredentialsEmailHtml(credentials: UserCredentials, includeCard?: boolean): string;
export declare function generateSecureCredentialsLink(credentialsId: string, expiresInMinutes?: number): {
    url: string;
    expiresAt: Date;
};
//# sourceMappingURL=creds-helper.d.ts.map