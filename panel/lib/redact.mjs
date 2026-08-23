export function redact(text) {
  return String(text || '')
    .replace(/CLIPRO_API_KEY\s*=\s*\S+/g, 'CLIPRO_API_KEY=[redacted]')
    .replace(/PANEL_GUONEI_KEY\s*=\s*\S+/g, 'PANEL_GUONEI_KEY=[redacted]')
    .replace(/CLOUDFLARE_[A-Z_]+\s*=\s*\S+/g, '[cloudflare-secret]')
    .replace(/ghp_[A-Za-z0-9]+/g, '[redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, '[local-path]')
    .replace(/\/(?:Users|home)\/[^\s"'`]+/g, '[local-path]')
}
