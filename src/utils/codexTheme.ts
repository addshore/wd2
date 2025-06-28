// Codex dark mode sync utility
// Call setCodexTheme('dark' | 'light') to switch Codex tokens at runtime

const LIGHT_LINK = 'codex-tokens-light';
const DARK_LINK = 'codex-tokens-dark';

function ensureCodexThemeLinks() {
  if (!document.getElementById(LIGHT_LINK)) {
    const light = document.createElement('link');
    light.id = LIGHT_LINK;
    light.rel = 'stylesheet';
    light.href = '/node_modules/@wikimedia/codex-design-tokens/theme-wikimedia-ui.css';
    document.head.appendChild(light);
  }
  if (!document.getElementById(DARK_LINK)) {
    const dark = document.createElement('link');
    dark.id = DARK_LINK;
    dark.rel = 'stylesheet';
    dark.href = '/node_modules/@wikimedia/codex-design-tokens/theme-wikimedia-ui-mode-dark.css';
    dark.media = 'none';
    document.head.appendChild(dark);
  }
}

export function setCodexTheme(theme) {
  ensureCodexThemeLinks();
  const dark = document.getElementById(DARK_LINK);
  if (dark) {
    dark.media = theme === 'dark' ? 'all' : 'none';
  }
}
