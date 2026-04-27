let _config = null;
export function configure(config) {
    _config = { ...config };
}
export function getConfig() {
    return _config ? { ..._config } : null;
}
export function resetConfig() {
    _config = null;
}
