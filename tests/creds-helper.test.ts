import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configure,
  getConfig,
  resetConfig,
  generateUserCredentials,
  createCredentialsDownloadResponse,
  generateCredentialsEmailHtml,
  generateSecureCredentialsLink,
  maskPassword,
  escapeHtml,
} from '../src/index.js';
import type { CredentialsHelperConfig, UserCredentials } from '../src/index.js';





function createMockConfig(overrides?: Partial<CredentialsHelperConfig>): CredentialsHelperConfig {
  return {
    generateCredentialsPackage: vi.fn().mockResolvedValue({
      image: Buffer.from('fake-png-data'),
      text: 'fake text credentials',
    }),
    generateTempPassword: vi.fn().mockReturnValue('TempPass1234'),
    generateTOTPSecret: vi.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
    generateTOTPUri: vi.fn().mockReturnValue('otpauth://totp/Tinyland.dev:testuser?secret=JBSWY3DPEHPK3PXP&issuer=Tinyland.dev'),
    ...overrides,
  };
}





describe('configure / getConfig / resetConfig', () => {
  beforeEach(() => resetConfig());

  it('returns null before configure is called', () => {
    expect(getConfig()).toBeNull();
  });

  it('returns config after configure is called', () => {
    const mock = createMockConfig();
    configure(mock);
    expect(getConfig()).not.toBeNull();
  });

  it('returns a shallow copy, not the original reference', () => {
    const mock = createMockConfig();
    configure(mock);
    const a = getConfig();
    const b = getConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('resetConfig clears the stored config', () => {
    configure(createMockConfig());
    expect(getConfig()).not.toBeNull();
    resetConfig();
    expect(getConfig()).toBeNull();
  });

  it('configure overwrites previous config', () => {
    const first = createMockConfig({ generateTempPassword: vi.fn().mockReturnValue('aaa') });
    const second = createMockConfig({ generateTempPassword: vi.fn().mockReturnValue('bbb') });
    configure(first);
    configure(second);
    const cfg = getConfig()!;
    expect(cfg.generateTempPassword(8)).toBe('bbb');
  });
});





describe('generateUserCredentials', () => {
  beforeEach(() => resetConfig());

  it('throws when not configured', async () => {
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow(
      /not configured/i
    );
  });

  it('returns username, displayName, email in output', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials('alice', 'Alice A', 'alice@example.com');
    expect(result.username).toBe('alice');
    expect(result.displayName).toBe('Alice A');
    expect(result.email).toBe('alice@example.com');
  });

  it('returns tempPassword from DI function', async () => {
    configure(createMockConfig({ generateTempPassword: vi.fn().mockReturnValue('MyPass99') }));
    const result = await generateUserCredentials('u', 'd', 'e');
    expect(result.tempPassword).toBe('MyPass99');
  });

  it('returns totpSecret from DI function', async () => {
    configure(createMockConfig({ generateTOTPSecret: vi.fn().mockReturnValue('SECRET42') }));
    const result = await generateUserCredentials('u', 'd', 'e');
    expect(result.totpSecret).toBe('SECRET42');
  });

  it('returns credentialsCard as Buffer', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials('u', 'd', 'e');
    expect(Buffer.isBuffer(result.credentialsCard)).toBe(true);
  });

  it('returns credentialsText as string', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials('u', 'd', 'e');
    expect(typeof result.credentialsText).toBe('string');
    expect(result.credentialsText).toBe('fake text credentials');
  });

  it('calls generateTempPassword with length 12', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('u', 'd', 'e');
    expect(mock.generateTempPassword).toHaveBeenCalledWith(12);
  });

  it('calls generateTOTPSecret with no arguments', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('u', 'd', 'e');
    expect(mock.generateTOTPSecret).toHaveBeenCalledWith();
  });

  it('calls generateTOTPUri with secret, issuer Tinyland.dev, and username', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('bob', 'Bob B', 'bob@b.com');
    expect(mock.generateTOTPUri).toHaveBeenCalledWith(
      'JBSWY3DPEHPK3PXP',
      'Tinyland.dev',
      'bob'
    );
  });

  it('calls generateCredentialsPackage with correct options', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('carol', 'Carol C', 'carol@c.com');
    expect(mock.generateCredentialsPackage).toHaveBeenCalledWith({
      username: 'carol',
      displayName: 'Carol C',
      tempPassword: 'TempPass1234',
      totpUri: 'otpauth://totp/Tinyland.dev:testuser?secret=JBSWY3DPEHPK3PXP&issuer=Tinyland.dev',
      issuer: 'Tinyland.dev',
    });
  });

  it('passes the issuer as Tinyland.dev', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('u', 'd', 'e');
    const call = (mock.generateCredentialsPackage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.issuer).toBe('Tinyland.dev');
  });

  it('propagates errors from generateCredentialsPackage', async () => {
    configure(
      createMockConfig({
        generateCredentialsPackage: vi.fn().mockRejectedValue(new Error('card gen failed')),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('card gen failed');
  });

  it('propagates errors from generateTempPassword', async () => {
    configure(
      createMockConfig({
        generateTempPassword: vi.fn().mockImplementation(() => {
          throw new Error('pwd gen failed');
        }),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('pwd gen failed');
  });

  it('uses the TOTP secret returned by generateTOTPSecret in the URI call', async () => {
    const mock = createMockConfig({
      generateTOTPSecret: vi.fn().mockReturnValue('CUSTOM_SECRET'),
    });
    configure(mock);
    await generateUserCredentials('u', 'd', 'e');
    expect(mock.generateTOTPUri).toHaveBeenCalledWith('CUSTOM_SECRET', 'Tinyland.dev', 'u');
  });

  it('each invocation calls all DI functions exactly once', async () => {
    const mock = createMockConfig();
    configure(mock);
    await generateUserCredentials('u', 'd', 'e');
    expect(mock.generateTempPassword).toHaveBeenCalledTimes(1);
    expect(mock.generateTOTPSecret).toHaveBeenCalledTimes(1);
    expect(mock.generateTOTPUri).toHaveBeenCalledTimes(1);
    expect(mock.generateCredentialsPackage).toHaveBeenCalledTimes(1);
  });
});





describe('createCredentialsDownloadResponse', () => {
  const card = Buffer.from('test-image-data');

  it('returns a Response object', () => {
    const res = createCredentialsDownloadResponse(card, 'user1');
    expect(res).toBeInstanceOf(Response);
  });

  it('sets Content-Type to image/png for png format', () => {
    const res = createCredentialsDownloadResponse(card, 'user1', 'png');
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });

  it('sets Content-Type to text/plain for txt format', () => {
    const res = createCredentialsDownloadResponse(card, 'user1', 'txt');
    expect(res.headers.get('Content-Type')).toBe('text/plain');
  });

  it('defaults to png format', () => {
    const res = createCredentialsDownloadResponse(card, 'user1');
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });

  it('sets content-disposition with attachment and filename', () => {
    const res = createCredentialsDownloadResponse(card, 'user1', 'png');
    const cd = res.headers.get('Content-Disposition')!;
    expect(cd).toContain('attachment');
    expect(cd).toContain('credentials-user1-');
    expect(cd).toContain('.png');
  });

  it('filename contains the username', () => {
    const res = createCredentialsDownloadResponse(card, 'jdoe', 'txt');
    const cd = res.headers.get('Content-Disposition')!;
    expect(cd).toContain('credentials-jdoe-');
    expect(cd).toContain('.txt');
  });

  it('sets Cache-Control to no-store', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('sets Cache-Control to include must-revalidate', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    expect(res.headers.get('Cache-Control')).toContain('must-revalidate');
  });

  it('sets Pragma to no-cache', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  it('sets Expires to 0', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    expect(res.headers.get('Expires')).toBe('0');
  });

  it('body can be read as Uint8Array matching original data', async () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);
    expect(Buffer.from(bytes).toString()).toBe('test-image-data');
  });

  it('filename includes a timestamp-like numeric portion', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    const cd = res.headers.get('Content-Disposition')!;
    
    const match = cd.match(/credentials-u-(\d+)\.png/);
    expect(match).not.toBeNull();
    const ts = parseInt(match![1], 10);
    
    expect(Math.abs(ts - Date.now())).toBeLessThan(5000);
  });

  it('handles empty Buffer', () => {
    const res = createCredentialsDownloadResponse(Buffer.alloc(0), 'u');
    expect(res).toBeInstanceOf(Response);
  });

  it('handles large Buffer', () => {
    const big = Buffer.alloc(1024 * 1024, 0xab);
    const res = createCredentialsDownloadResponse(big, 'u');
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });

  it('response status is 200', () => {
    const res = createCredentialsDownloadResponse(card, 'u');
    expect(res.status).toBe(200);
  });
});





describe('generateCredentialsEmailHtml', () => {
  const baseCreds: UserCredentials = {
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    tempPassword: 'Abcdef1234',
    totpSecret: 'SECRET',
  };

  it('contains the username', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('testuser');
  });

  it('contains the displayName', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Test User');
  });

  it('contains the email', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('test@example.com');
  });

  it('masks password showing first 2 and last 2 chars', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    
    expect(html).toContain('Ab');
    expect(html).toContain('34');
    expect(html).not.toContain('Abcdef1234');
  });

  it('masks short password (4 chars) fully', () => {
    const creds = { ...baseCreds, tempPassword: 'Ab12' };
    const html = generateCredentialsEmailHtml(creds);
    expect(html).not.toContain('Ab12');
    expect(html).toContain('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('shows "See attached card" when tempPassword is undefined', () => {
    const creds = { ...baseCreds, tempPassword: undefined };
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('See attached card');
  });

  it('includes setup instructions section', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Setup Instructions');
  });

  it('includes authenticator app instruction', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('authenticator app');
  });

  it('includes step to change password after first login', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Change your password immediately after first login');
  });

  it('includes security warning about keeping credentials secure', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Keep your credentials secure');
  });

  it('includes security warning about compromised accounts', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('compromised');
  });

  it('includes two-factor authentication warning', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('two-factor authentication');
  });

  it('when includeCard=true, mentions attached credentials card', () => {
    const html = generateCredentialsEmailHtml(baseCreds, true);
    expect(html).toContain('attached credentials card');
  });

  it('when includeCard=false, mentions QR code from administrator', () => {
    const html = generateCredentialsEmailHtml(baseCreds, false);
    expect(html).toContain('QR code provided by your administrator');
  });

  it('defaults includeCard to false', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('QR code provided by your administrator');
    expect(html).not.toContain('attached credentials card');
  });

  it('contains the current year', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain(new Date().getFullYear().toString());
  });

  it('contains Welcome to Tinyland.dev', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Welcome to Tinyland.dev');
  });

  it('contains contact email address', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('admin@stonewallunderground.com');
  });

  it('contains Your Login Credentials heading', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Your Login Credentials');
  });

  it('contains Security Notice heading', () => {
    const html = generateCredentialsEmailHtml(baseCreds);
    expect(html).toContain('Security Notice');
  });
});





describe('generateSecureCredentialsLink', () => {
  it('returns a url starting with /admin/credentials/download/', () => {
    const { url } = generateSecureCredentialsLink('cred-123');
    expect(url).toMatch(/^\/admin\/credentials\/download\//);
  });

  it('returns an expiresAt Date object', () => {
    const { expiresAt } = generateSecureCredentialsLink('cred-123');
    expect(expiresAt).toBeInstanceOf(Date);
  });

  it('token decodes from base64url to JSON with id field', () => {
    const { url } = generateSecureCredentialsLink('my-id');
    const token = url.split('/admin/credentials/download/')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    expect(decoded.id).toBe('my-id');
  });

  it('token decodes from base64url to JSON with exp field', () => {
    const { url } = generateSecureCredentialsLink('my-id');
    const token = url.split('/admin/credentials/download/')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    expect(typeof decoded.exp).toBe('number');
  });

  it('default expiry is ~60 minutes from now', () => {
    const before = Date.now();
    const { expiresAt } = generateSecureCredentialsLink('id');
    const after = Date.now();
    const expectedMin = before + 60 * 60 * 1000;
    const expectedMax = after + 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it('custom expiry of 30 minutes', () => {
    const before = Date.now();
    const { expiresAt } = generateSecureCredentialsLink('id', 30);
    const expected = before + 30 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - expected)).toBeLessThan(1000);
  });

  it('custom expiry of 1440 minutes (24 hours)', () => {
    const before = Date.now();
    const { expiresAt } = generateSecureCredentialsLink('id', 1440);
    const expected = before + 1440 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - expected)).toBeLessThan(1000);
  });

  it('token exp matches expiresAt.getTime()', () => {
    const { url, expiresAt } = generateSecureCredentialsLink('id');
    const token = url.split('/admin/credentials/download/')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    expect(decoded.exp).toBe(expiresAt.getTime());
  });

  it('different credentialsId values produce different tokens', () => {
    const { url: url1 } = generateSecureCredentialsLink('aaa');
    const { url: url2 } = generateSecureCredentialsLink('bbb');
    expect(url1).not.toBe(url2);
  });

  it('url contains only url-safe characters in token', () => {
    const { url } = generateSecureCredentialsLink('test-id-with-dashes');
    const token = url.split('/admin/credentials/download/')[1];
    
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('handles very short credentialsId', () => {
    const { url } = generateSecureCredentialsLink('x');
    const token = url.split('/admin/credentials/download/')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    expect(decoded.id).toBe('x');
  });

  it('handles credentialsId with special characters', () => {
    const { url } = generateSecureCredentialsLink('id/with:special&chars');
    const token = url.split('/admin/credentials/download/')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    expect(decoded.id).toBe('id/with:special&chars');
  });

  it('expiresAt is in the future', () => {
    const { expiresAt } = generateSecureCredentialsLink('id');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('custom expiry of 0 minutes sets expiresAt to roughly now', () => {
    const before = Date.now();
    const { expiresAt } = generateSecureCredentialsLink('id', 0);
    expect(Math.abs(expiresAt.getTime() - before)).toBeLessThan(1000);
  });

  it('custom expiry of 1 minute', () => {
    const before = Date.now();
    const { expiresAt } = generateSecureCredentialsLink('id', 1);
    const expected = before + 1 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - expected)).toBeLessThan(1000);
  });
});





describe('maskPassword edge cases', () => {
  it('empty string returns full mask', () => {
    expect(maskPassword('')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('1-char password returns full mask', () => {
    expect(maskPassword('A')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('2-char password returns full mask', () => {
    expect(maskPassword('AB')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('3-char password returns full mask', () => {
    expect(maskPassword('ABC')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('4-char password returns full mask', () => {
    expect(maskPassword('ABCD')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('5-char password shows first 2 and last 2 with 1 mask char', () => {
    const result = maskPassword('ABCDE');
    expect(result).toBe('AB\u2022DE');
  });

  it('6-char password shows first 2 and last 2 with 2 mask chars', () => {
    const result = maskPassword('ABCDEF');
    expect(result).toBe('AB\u2022\u2022EF');
  });

  it('10-char password shows first 2 and last 2 with 6 mask chars', () => {
    const result = maskPassword('0123456789');
    expect(result).toBe('01\u2022\u2022\u2022\u2022\u2022\u202289');
  });

  it('long password (20 chars) masks middle portion', () => {
    const pwd = 'AB' + 'x'.repeat(16) + 'YZ';
    const result = maskPassword(pwd);
    expect(result.startsWith('AB')).toBe(true);
    expect(result.endsWith('YZ')).toBe(true);
    expect(result.length).toBe(20);
  });

  it('mask length equals password length for passwords > 4 chars', () => {
    for (const len of [5, 6, 7, 8, 12, 20, 50]) {
      const pwd = 'A'.repeat(len);
      expect(maskPassword(pwd).length).toBe(len);
    }
  });
});





describe('HTML structure', () => {
  const creds: UserCredentials = {
    username: 'htmluser',
    displayName: 'HTML User',
    email: 'html@test.com',
    tempPassword: 'Password123',
  };

  it('starts with <!DOCTYPE html>', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('contains <html> and </html> tags', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('contains <style> tag', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
  });

  it('contains class names from the CSS', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('class="header"');
    expect(html).toContain('class="content"');
    expect(html).toContain('class="credentials-box"');
    expect(html).toContain('class="warning"');
    expect(html).toContain('class="steps"');
    expect(html).toContain('class="footer"');
  });

  it('contains field-label and field-value classes', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('class="field-label"');
    expect(html).toContain('class="field-value"');
  });

  it('contains <head> section with title', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('<title>Your Tinyland.dev Account</title>');
  });

  it('contains <body> tag', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
  });

  it('escapes HTML in username to prevent XSS', () => {
    const xssCreds: UserCredentials = {
      username: '<script>alert("xss")</script>',
      displayName: 'Safe',
      email: 'safe@test.com',
      tempPassword: 'Password123',
    };
    const html = generateCredentialsEmailHtml(xssCreds);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in email to prevent XSS', () => {
    const xssCreds: UserCredentials = {
      username: 'safe',
      displayName: 'Safe',
      email: '"><img src=x onerror=alert(1)>',
      tempPassword: 'Password123',
    };
    const html = generateCredentialsEmailHtml(xssCreds);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('escapes HTML in displayName to prevent XSS', () => {
    const xssCreds: UserCredentials = {
      username: 'safe',
      displayName: '<b onmouseover="alert(1)">Name</b>',
      email: 'safe@test.com',
      tempPassword: 'Password123',
    };
    const html = generateCredentialsEmailHtml(xssCreds);
    expect(html).not.toContain('<b onmouseover="alert(1)">');
    expect(html).toContain('&lt;b');
  });

  it('contains charset meta tag', () => {
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('charset="UTF-8"');
  });
});





describe('error handling', () => {
  beforeEach(() => resetConfig());

  it('generateCredentialsPackage throwing propagates to caller', async () => {
    configure(
      createMockConfig({
        generateCredentialsPackage: vi.fn().mockRejectedValue(new Error('render failed')),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('render failed');
  });

  it('generateTempPassword throwing propagates to caller', async () => {
    configure(
      createMockConfig({
        generateTempPassword: vi.fn().mockImplementation(() => {
          throw new Error('entropy exhausted');
        }),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('entropy exhausted');
  });

  it('generateTOTPSecret throwing propagates to caller', async () => {
    configure(
      createMockConfig({
        generateTOTPSecret: vi.fn().mockImplementation(() => {
          throw new Error('totp gen failed');
        }),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('totp gen failed');
  });

  it('generateTOTPUri throwing propagates to caller', async () => {
    configure(
      createMockConfig({
        generateTOTPUri: vi.fn().mockImplementation(() => {
          throw new Error('uri gen failed');
        }),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toThrow('uri gen failed');
  });

  it('generateCredentialsPackage rejection with non-Error propagates', async () => {
    configure(
      createMockConfig({
        generateCredentialsPackage: vi.fn().mockRejectedValue('string error'),
      })
    );
    await expect(generateUserCredentials('u', 'd', 'e')).rejects.toBe('string error');
  });
});





describe('edge cases', () => {
  beforeEach(() => resetConfig());

  it('handles empty username in generateUserCredentials', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials('', 'Display', 'email@test.com');
    expect(result.username).toBe('');
  });

  it('handles empty email in generateUserCredentials', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials('user', 'Display', '');
    expect(result.email).toBe('');
  });

  it('handles special characters in displayName', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials(
      'user',
      "O'Brien & Sons <LLC>",
      'e@e.com'
    );
    expect(result.displayName).toBe("O'Brien & Sons <LLC>");
  });

  it('handles unicode in username', async () => {
    configure(createMockConfig());
    const result = await generateUserCredentials(
      '\u00e9l\u00e8ve',
      'Student',
      's@s.com'
    );
    expect(result.username).toBe('\u00e9l\u00e8ve');
  });

  it('email HTML handles special characters safely', () => {
    const creds: UserCredentials = {
      username: "user'name",
      displayName: 'Name & <Display>',
      email: 'test+special@example.com',
      tempPassword: 'Pass12345',
    };
    const html = generateCredentialsEmailHtml(creds);
    expect(html).toContain('user&#x27;name');
    expect(html).toContain('Name &amp; &lt;Display&gt;');
  });
});





describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("a'b")).toBe('a&#x27;b');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes multiple special characters in one string', () => {
    expect(escapeHtml('<script>"alert(\'xss\')&"</script>')).toBe(
      '&lt;script&gt;&quot;alert(&#x27;xss&#x27;)&amp;&quot;&lt;/script&gt;'
    );
  });
});
