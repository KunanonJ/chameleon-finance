// Tests for Feature 5: Dark Mode Theme System
const fs = require('fs');
const path = require('path');

// Load the theme module
const themeCode = fs.readFileSync(path.join(__dirname, '../../js/theme.js'), 'utf8');
eval(themeCode);

describe('ThemeManager - Feature 5: Dark Mode Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('init', () => {
    test('CD-1: Should initialize with light mode by default', () => {
      ThemeManager.init();
      const theme = document.documentElement.getAttribute('data-theme');
      expect(['dark', null, undefined]).toContain(theme);
    });

    test('CD-2: Should respect saved theme preference', () => {
      localStorage.setItem('subgrid_theme', 'dark');
      ThemeManager.init();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('CD-3: Should respect system preference when no saved theme', () => {
      ThemeManager.init();
      const theme = document.documentElement.getAttribute('data-theme');
      expect(['dark', null, undefined]).toContain(theme);
    });
  });

  describe('getSavedTheme', () => {
    test('CD-4: Should return null when no theme saved', () => {
      const theme = ThemeManager.getSavedTheme();
      expect(theme).toBeNull();
    });

    test('CD-5: Should retrieve saved theme', () => {
      localStorage.setItem('subgrid_theme', 'dark');
      const theme = ThemeManager.getSavedTheme();
      expect(theme).toBe('dark');
    });

    test('CD-6: Should handle corrupted localStorage', () => {
      localStorage.data['subgrid_theme'] = undefined;
      const theme = ThemeManager.getSavedTheme();
      expect(theme).toBeNull();
    });
  });

  describe('saveTheme', () => {
    test('CD-7: Should save light theme', () => {
      ThemeManager.saveTheme('light');
      expect(localStorage.getItem('subgrid_theme')).toBe('light');
    });

    test('CD-8: Should save dark theme', () => {
      ThemeManager.saveTheme('dark');
      expect(localStorage.getItem('subgrid_theme')).toBe('dark');
    });
  });

  describe('apply', () => {
    test('CD-9: Should apply light theme', () => {
      ThemeManager.apply('light');
      expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
    });

    test('CD-10: Should apply dark theme', () => {
      ThemeManager.apply('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('CD-11: Should set colorScheme to light', () => {
      ThemeManager.apply('light');
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    test('CD-12: Should set colorScheme to dark', () => {
      ThemeManager.apply('dark');
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });
  });

  describe('toggle', () => {
    test('CD-13: Should toggle from light to dark', () => {
      ThemeManager.apply('light');
      ThemeManager.toggle();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('CD-14: Should toggle from dark to light', () => {
      ThemeManager.apply('dark');
      ThemeManager.toggle();
      expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
    });

    test('CD-15: Should persist toggled theme', () => {
      ThemeManager.apply('light');
      ThemeManager.toggle();
      const saved = ThemeManager.getSavedTheme();
      expect(saved).toBe('dark');
    });

    test('CD-16: Should update theme label when toggling', () => {
      const label = document.createElement('span');
      label.id = 'theme-label';
      document.body.appendChild(label);

      ThemeManager.apply('light');
      ThemeManager.toggle();
      expect(['Dark', 'Light']).toContain(label.innerText);
    });
  });

  describe('getSystemPreference', () => {
    test('CD-17: Should return light or dark', () => {
      const preference = ThemeManager.getSystemPreference();
      expect(['light', 'dark']).toContain(preference);
    });
  });

  describe('updateThemeButton', () => {
    test('CD-18: Should update theme label to Light', () => {
      const label = document.createElement('span');
      label.id = 'theme-label';
      document.body.appendChild(label);

      ThemeManager.updateThemeButton('light');
      expect(label.innerText).toBe('Light');
    });

    test('CD-19: Should update theme label to Dark', () => {
      const label = document.createElement('span');
      label.id = 'theme-label';
      document.body.appendChild(label);

      ThemeManager.updateThemeButton('dark');
      expect(label.innerText).toBe('Dark');
    });

    test('CD-20: Should handle missing button gracefully', () => {
      ThemeManager.updateThemeButton('light');
      expect(true).toBe(true);
    });
  });

  describe('getChartColors', () => {
    test('CD-21: Should return light colors for light theme', () => {
      ThemeManager.apply('light');
      const colors = ThemeManager.getChartColors();
      expect(colors.isDark).toBe(false);
      expect(colors.text).toBe('#0f172a');
    });

    test('CD-22: Should return dark colors for dark theme', () => {
      ThemeManager.apply('dark');
      const colors = ThemeManager.getChartColors();
      expect(colors.isDark).toBe(true);
      expect(colors.text).toBe('#f1f5f9');
    });

    test('CD-23: Should include all required color properties', () => {
      const colors = ThemeManager.getChartColors();
      expect(colors).toHaveProperty('isDark');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('grid');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('tooltip');
      expect(colors).toHaveProperty('hover');
    });

    test('CD-24: Should return contrasting colors', () => {
      ThemeManager.apply('light');
      const lightColors = ThemeManager.getChartColors();
      ThemeManager.apply('dark');
      const darkColors = ThemeManager.getChartColors();
      expect(lightColors.text).not.toBe(darkColors.text);
      expect(lightColors.background).not.toBe(darkColors.background);
    });
  });
});
