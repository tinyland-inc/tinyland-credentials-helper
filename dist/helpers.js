export function maskPassword(pwd) {
    if (pwd.length <= 4)
        return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    return `${pwd.substring(0, 2)}${'\u2022'.repeat(pwd.length - 4)}${pwd.substring(pwd.length - 2)}`;
}
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
