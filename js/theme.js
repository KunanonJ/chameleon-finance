// Dark mode / theme management system

const ThemeManager = {
  THEMES: {
    light: 'light',
    dark: 'dark'
  },

  /**
   * Initialize theme on page load
   */
  init() {
    let theme = this.getSavedTheme();

    if (!theme) {
      theme = this.getSystemPreference();
    }

    this.apply(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (!this.getSavedTheme()) {
        // Only apply system preference if user hasn't set a preference
        this.apply(e.matches ? 'dark' : 'light');
      }
    });
  },

  /**
   * Get saved theme preference from localStorage
   * @returns {string|null} - 'light', 'dark', or null
   */
  getSavedTheme() {
    try {
      return localStorage.getItem('subgrid_theme');
    } catch (err) {
      return null;
    }
  },

  /**
   * Save theme preference to localStorage
   * @param {string} theme - 'light' or 'dark'
   */
  saveTheme(theme) {
    try {
      localStorage.setItem('subgrid_theme', theme);
    } catch (err) {
      console.warn('Failed to save theme:', err);
    }
  },

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.apply(newTheme);
    this.saveTheme(newTheme);

    // Trigger visualizations to update if they have a refresh function
    if (typeof renderGrid === 'function') {
      renderGrid();
    }
    if (typeof renderBeeswarm === 'function') {
      renderBeeswarm();
    }
    if (typeof renderCirclePack === 'function') {
      renderCirclePack();
    }
  },

  /**
   * Apply a theme
   * @param {string} theme - 'light' or 'dark'
   */
  apply(theme) {
    const html = document.documentElement;

    // Remove old theme
    html.removeAttribute('data-theme');

    // Apply new theme if dark
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      html.style.colorScheme = 'dark';
    } else {
      html.style.colorScheme = 'light';
    }

    // Update theme toggle button if it exists
    this.updateThemeButton(theme);
  },

  /**
   * Get system color scheme preference
   * @returns {string} - 'light' or 'dark'
   */
  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  /**
   * Update theme toggle button text
   * @param {string} theme - Current theme
   */
  updateThemeButton(theme) {
    const label = document.getElementById("theme-label");
    if (label) {
      label.innerText = theme === 'dark' ? 'Dark' : 'Light';
    }
  },

  /**
   * Get chart/visualization colors based on current theme
   * @returns {Object} - Color configuration object
   */
  getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    return {
      isDark: isDark,
      text: isDark ? '#f1f5f9' : '#0f172a',
      textSecondary: isDark ? '#cbd5e1' : '#64748b',
      background: isDark ? '#1e293b' : '#ffffff',
      grid: isDark ? '#475569' : '#e0e0e0',
      border: isDark ? '#334155' : '#e2e8f0',
      tooltip: isDark ? '#334155' : '#f8f9fb',
      hover: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)'
    };
  }
};
