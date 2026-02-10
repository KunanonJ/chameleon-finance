const CACHE_KEY = "vexly_exchangeRates";
const DATE_KEY = "vexly_ratesLastUpdate";
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
        const response = await fetch("https://open.er-api.com/v6/latest/USD");

        // Check if response is successful before parsing JSON
        if (!response.ok) {
            const statusText = response.statusText || `HTTP ${response.status}`;
            if (response.status === 429) {
                console.warn("Rate limit exceeded from exchange rate API");
            } else {
                console.error(`Failed to fetch rates: ${statusText}`);
            }
            return null;
        }

        const data = await response.json();

        if (data.result === "success" && data.rates) {
            saveRates(data.rates);
            return data.rates;
        }
        throw new Error("Invalid response structure from rates API");
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        return null;
    }
}

async function loadRates() {
    const cachedRates = getCachedRates();

    if (cachedRates) {
        const timeElapsed = Date.now() - cachedRates.lastUpdate;

        // If cached rates are less than a day old, use them
        if (timeElapsed < ONE_DAY) {
            return cachedRates.rates;
        } else {
            const refreshedRates = await fetchRatesFromAPI();
            return refreshedRates || cachedRates.rates;
        }
    } else {
        const refreshedRates = await fetchRatesFromAPI();
        if (!refreshedRates) {
            console.warn("Failed to fetch rates, falling back to hardcoded rates.");
        }
        return refreshedRates;
    }
}

async function initRates() {
    const rates = await loadRates();
    if (rates && window.currencies) {
        Object.keys(window.currencies).forEach((currency) => {
            if (rates[currency]) {
                window.currencies[currency].rate = rates[currency];
            }
        });
    }
}

window.initRates = initRates;
