/**
 * Mask a password for display, showing only the first 2 and last 2 characters.
 * Passwords of 4 characters or fewer are fully masked.
 */
export function maskPassword(pwd: string): string {
  if (pwd.length <= 4) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  return `${pwd.substring(0, 2)}${'\u2022'.repeat(pwd.length - 4)}${pwd.substring(pwd.length - 2)}`;
}

/**
 * Escape special HTML characters to prevent XSS in generated HTML.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
