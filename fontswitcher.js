/**
 * ══════════════════════════════════════════
 *  FONT SWITCHER MODULE (font-switcher.js)
 *  - Adds font selector to sidebar
 *  - Persists choice in localStorage
 *  - Works with existing StudyAI structure
 * ══════════════════════════════════════════
 */

const FontSwitcher = (() => {
  // Available fonts (name -> CSS font-family)
  const FONTS = {
    'Outfit': "'Outfit', sans-serif",
    'Poppins': "'Poppins', sans-serif",
    'Inter': "'Inter', sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Open Sans': "'Open Sans', sans-serif",
    'Lato': "'Lato', sans-serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Source Sans Pro': "'Source Sans Pro', sans-serif"
  };

  const STORAGE_KEY = 'studyai_selected_font';
  let currentFont = 'Outfit';

  // Load saved font or default
  function loadSavedFont() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FONTS[saved]) {
      currentFont = saved;
    } else {
      currentFont = 'Outfit';
    }
    applyFont(currentFont);
  }

  // Apply font to body and all elements (via CSS variable)
  function applyFont(fontName) {
    const fontFamily = FONTS[fontName];
    if (!fontFamily) return;
    document.body.style.fontFamily = fontFamily;
    // Also update all elements that explicitly use var(--font)
    document.documentElement.style.setProperty('--font', fontFamily);
    localStorage.setItem(STORAGE_KEY, fontName);
    currentFont = fontName;
  }

  // Create the UI selector
  function createFontSelector() {
    const container = document.createElement('div');
    container.className = 'font-switcher-container';
    container.style.cssText = `
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      margin-top: 8px;
    `;

    const label = document.createElement('div');
    label.textContent = '🔤 FONT STYLE';
    label.style.cssText = `
      font-size: 10px;
      letter-spacing: .2em;
      color: var(--muted);
      font-family: var(--mono);
      margin-bottom: 8px;
      text-transform: uppercase;
    `;

    const select = document.createElement('select');
    select.id = 'fontSwitcherSelect';
    select.style.cssText = `
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    `;

    // Populate options
    for (const [name, _] of Object.entries(FONTS)) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (name === currentFont) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      const newFont = e.target.value;
      applyFont(newFont);
      showToast(`Font changed to ${newFont}`, 'success');
    });

    container.appendChild(label);
    container.appendChild(select);
    return container;
  }

  // Insert selector into sidebar (after strategy selector or before footer)
  function injectFontSwitcher() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      // Retry after a short delay if sidebar not yet loaded
      setTimeout(injectFontSwitcher, 500);
      return;
    }

    // Check if already injected
    if (document.querySelector('.font-switcher-container')) return;

    // Find the sidebar-footer or the strategy selector container
    const strategySelect = document.getElementById('strategySelect');
    const footer = document.querySelector('.sidebar-footer');
    
    let target = strategySelect?.closest('div') || footer;
    if (target && target.parentNode) {
      target.parentNode.insertBefore(createFontSelector(), target.nextSibling);
    } else {
      // Fallback: append to sidebar-nav
      const nav = document.querySelector('.sidebar-nav');
      if (nav) nav.after(createFontSelector());
    }
  }

  // Public init function
  function init() {
    loadSavedFont();
    injectFontSwitcher();
  }

  return { init, applyFont };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FontSwitcher.init());
} else {
  FontSwitcher.init();
}