import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultCurrencies } from '@shared/lib/constants';

const CACHE_KEY = 'vexly_exchangeRates';
const DATE_KEY = 'vexly_ratesLastUpdate';
const CURRENCY_KEY = 'vexly_currency';
const GEO_DETECTED_KEY = 'vexly_geoCurrencyDetected';
const ONE_DAY = 24 * 60 * 60 * 1000;

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      selectedCurrency: 'USD',
      currencies: { ...defaultCurrencies },

      setCurrency: (code) => set({ selectedCurrency: code }),

      initRates: async () => {
        const rates = await loadRates();
        if (rates) {
          set((state) => {
            const updated = { ...state.currencies };
            Object.keys(updated).forEach((code) => {
              if (rates[code]) {
                updated[code] = { ...updated[code], rate: rates[code] };
              }
            });
            return { currencies: updated };
          });
        }

        // Auto-detect currency from IP on first visit
        const hasSavedCurrency = localStorage.getItem(CURRENCY_KEY);
        const alreadyDetected = localStorage.getItem(GEO_DETECTED_KEY);
        if (!hasSavedCurrency && !alreadyDetected) {
          const detectedCurrency = await detectCurrencyFromIP();
          if (detectedCurrency && defaultCurrencies[detectedCurrency]) {
            set({ selectedCurrency: detectedCurrency });
          }
          localStorage.setItem(GEO_DETECTED_KEY, '1');
        }
      },
    }),
    {
      name: CURRENCY_KEY,
      storage: {
        getItem: (name) => {
          const raw = localStorage.getItem(name);
          if (!raw) return null;
          try {
            // Legacy format is just a currency code string like "USD"
            if (!raw.startsWith('{') && !raw.startsWith('[')) {
              return { state: { selectedCurrency: raw } };
            }
            return { state: JSON.parse(raw) };
          } catch {
            return { state: { selectedCurrency: raw } };
          }
        },
        setItem: (name, value) => {
          // Save as plain string for backward compat
          localStorage.setItem(name, value.state.selectedCurrency);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({ selectedCurrency: state.selectedCurrency }),
    }
  )
);

// Rate fetching helpers (kept outside store for simplicity)
function getCachedRates() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const lastUpdate = localStorage.getItem(DATE_KEY);
    if (!cached) return null;
    const parsedLastUpdate = parseInt(lastUpdate) || 0;
    if (isNaN(parsedLastUpdate)) return null;
    return { rates: JSON.parse(cached), lastUpdate: parsedLastUpdate };
  } catch {
    return null;
  }
}

function saveRates(rates) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  localStorage.setItem(DATE_KEY, Date.now());
}

async function fetchRatesFromAPI() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limit exceeded from exchange rate API');
      }
      return null;
    }
    const data = await response.json();
    if (data.result === 'success' && data.rates) {
      saveRates(data.rates);
      return data.rates;
    }
    throw new Error('Invalid response structure from rates API');
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

async function loadRates() {
  const cachedRates = getCachedRates();

  if (cachedRates) {
    const timeElapsed = Date.now() - cachedRates.lastUpdate;
    if (timeElapsed < ONE_DAY) {
      return cachedRates.rates;
    } else {
      const refreshedRates = await fetchRatesFromAPI();
      return refreshedRates || cachedRates.rates;
    }
  } else {
    const refreshedRates = await fetchRatesFromAPI();
    if (!refreshedRates) {
      console.warn('Failed to fetch rates, falling back to hardcoded rates.');
    }
    return refreshedRates;
  }
}

// Country code → currency code mapping
const COUNTRY_TO_CURRENCY = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', CH: 'CHF',
  HK: 'HKD', SG: 'SGD', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  MX: 'MXN', BR: 'BRL', ZA: 'ZAR', RU: 'RUB', TR: 'TRY',
  PL: 'PLN', TH: 'THB', ID: 'IDR', MY: 'MYR', PH: 'PHP',
  VN: 'VND', TW: 'TWD', AE: 'AED', SA: 'SAR', IL: 'ILS',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'HRK',
  CL: 'CLP', CO: 'COP', AR: 'ARS', PE: 'PEN', EG: 'EGP',
  NG: 'NGN', KE: 'KES', PK: 'PKR', BD: 'BDT', UA: 'UAH',
  // Eurozone countries
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR',
  GR: 'EUR', SK: 'EUR', SI: 'EUR', LT: 'EUR', LV: 'EUR',
  EE: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR',
};

async function detectCurrencyFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();

    // ipapi.co returns a 'currency' field directly
    if (data.currency && defaultCurrencies[data.currency]) {
      return data.currency;
    }

    // Fallback: map country code to currency
    if (data.country_code && COUNTRY_TO_CURRENCY[data.country_code]) {
      return COUNTRY_TO_CURRENCY[data.country_code];
    }

    return null;
  } catch {
    return null;
  }
}
