let subs = [];
let step = 1;
let selectedCurrency = "USD";
let currentView = "treemap";

window.currencies = {
  USD: { symbol: "$", name: "US Dollar", rate: 1 },
  EUR: { symbol: "€", name: "Euro", rate: 0.92 },
  GBP: { symbol: "£", name: "British Pound", rate: 0.79 },
  JPY: { symbol: "¥", name: "Japanese Yen", rate: 149.5 },
  CNY: { symbol: "¥", name: "Chinese Yuan", rate: 7.24 },
  KRW: { symbol: "₩", name: "South Korean Won", rate: 1320 },
  INR: { symbol: "₹", name: "Indian Rupee", rate: 83.12 },
  CAD: { symbol: "C$", name: "Canadian Dollar", rate: 1.36 },
  AUD: { symbol: "A$", name: "Australian Dollar", rate: 1.53 },
  CHF: { symbol: "CHF", name: "Swiss Franc", rate: 0.88 },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar", rate: 7.82 },
  SGD: { symbol: "S$", name: "Singapore Dollar", rate: 1.34 },
  SEK: { symbol: "kr", name: "Swedish Krona", rate: 10.42 },
  NOK: { symbol: "kr", name: "Norwegian Krone", rate: 10.85 },
  DKK: { symbol: "kr", name: "Danish Krone", rate: 6.87 },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", rate: 1.64 },
  MXN: { symbol: "MX$", name: "Mexican Peso", rate: 17.15 },
  BRL: { symbol: "R$", name: "Brazilian Real", rate: 4.97 },
  ZAR: { symbol: "R", name: "South African Rand", rate: 18.65 },
  RUB: { symbol: "₽", name: "Russian Ruble", rate: 92.5 },
  TRY: { symbol: "₺", name: "Turkish Lira", rate: 29.2 },
  PLN: { symbol: "zł", name: "Polish Zloty", rate: 3.98 },
  THB: { symbol: "฿", name: "Thai Baht", rate: 35.2 },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah", rate: 15650 },
  MYR: { symbol: "RM", name: "Malaysian Ringgit", rate: 4.72 },
  PHP: { symbol: "₱", name: "Philippine Peso", rate: 55.8 },
  VND: { symbol: "₫", name: "Vietnamese Dong", rate: 24500 },
  TWD: { symbol: "NT$", name: "Taiwan Dollar", rate: 31.5 },
  AED: { symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
  SAR: { symbol: "﷼", name: "Saudi Riyal", rate: 3.75 },
  ILS: { symbol: "₪", name: "Israeli Shekel", rate: 3.68 },
  CZK: { symbol: "Kč", name: "Czech Koruna", rate: 22.8 },
  HUF: { symbol: "Ft", name: "Hungarian Forint", rate: 356 },
  RON: { symbol: "lei", name: "Romanian Leu", rate: 4.57 },
  BGN: { symbol: "лв", name: "Bulgarian Lev", rate: 1.8 },
  HRK: { symbol: "kn", name: "Croatian Kuna", rate: 6.93 },
  CLP: { symbol: "CLP$", name: "Chilean Peso", rate: 880 },
  COP: { symbol: "COL$", name: "Colombian Peso", rate: 3950 },
  ARS: { symbol: "ARS$", name: "Argentine Peso", rate: 365 },
  PEN: { symbol: "S/", name: "Peruvian Sol", rate: 3.72 },
  EGP: { symbol: "E£", name: "Egyptian Pound", rate: 30.9 },
  NGN: { symbol: "₦", name: "Nigerian Naira", rate: 785 },
  KES: { symbol: "KSh", name: "Kenyan Shilling", rate: 153 },
  PKR: { symbol: "₨", name: "Pakistani Rupee", rate: 278 },
  BDT: { symbol: "৳", name: "Bangladeshi Taka", rate: 110 },
  UAH: { symbol: "₴", name: "Ukrainian Hryvnia", rate: 37.5 },
};

// tailwind color palette - bg is the lighter shade, accent for gradients
const colors = [
  { id: "purple", bg: "#FAF5FF", accent: "#E9D5FF" },
  { id: "blue", bg: "#EFF6FF", accent: "#BFDBFE" },
  { id: "cyan", bg: "#ECFEFF", accent: "#A5F3FC" },
  { id: "green", bg: "#F0FDF4", accent: "#BBF7D0" },
  { id: "yellow", bg: "#FEFCE8", accent: "#FEF08A" },
  { id: "orange", bg: "#FFF7ED", accent: "#FED7AA" },
  { id: "pink", bg: "#FDF2F8", accent: "#FBCFE8" },
  { id: "rose", bg: "#FFF1F2", accent: "#FECDD3" },
  { id: "slate", bg: "#F8FAFC", accent: "#E2E8F0" },
  { id: "indigo", bg: "#EEF2FF", accent: "#C7D2FE" },
  { id: "teal", bg: "#F0FDFA", accent: "#99F6E4" },
  { id: "amber", bg: "#FFFBEB", accent: "#FDE68A" },
];

const randColor = () => colors[Math.floor(Math.random() * colors.length)];

function getColor(colorId) {
  const found = colors.find(c => c.id === colorId);
  return found ? found : randColor();
}

const currencyLocales = {
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", JPY: "ja-JP", CNY: "zh-CN",
  KRW: "ko-KR", INR: "en-IN", CAD: "en-CA", AUD: "en-AU", CHF: "de-CH",
  HKD: "zh-HK", SGD: "en-SG", SEK: "sv-SE", NOK: "nb-NO", DKK: "da-DK",
  NZD: "en-NZ", MXN: "es-MX", BRL: "pt-BR", ZAR: "en-ZA", RUB: "ru-RU",
  TRY: "tr-TR", PLN: "pl-PL", THB: "th-TH", IDR: "id-ID", MYR: "ms-MY",
  PHP: "en-PH", VND: "vi-VN", TWD: "zh-TW", AED: "ar-AE", SAR: "ar-SA",
  ILS: "he-IL", CZK: "cs-CZ", HUF: "hu-HU", RON: "ro-RO", BGN: "bg-BG",
  HRK: "hr-HR", CLP: "es-CL", COP: "es-CO", ARS: "es-AR", PEN: "es-PE",
  EGP: "ar-EG", NGN: "en-NG", KES: "en-KE", PKR: "en-PK", BDT: "bn-BD",
  UAH: "uk-UA"
};

function convertToBase(amount, fromCurrency) {
  const from = currencies[fromCurrency] || currencies.USD;
  const to = currencies[selectedCurrency];
  const usdAmount = amount / from.rate;
  return usdAmount * to.rate;
}

function formatNum(amount, decimals, currencyCode) {
  const locale = currencyLocales[currencyCode] || "en-US";
  return amount.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatCurrency(baseAmount, decimals = 2) {
  const curr = currencies[selectedCurrency];
  const dec = curr.rate > 100 ? 0 : decimals;
  return curr.symbol + formatNum(baseAmount, dec, selectedCurrency);
}

function formatCurrencyShort(baseAmount) {
  const curr = currencies[selectedCurrency];
  if (baseAmount >= 1_000_000) return curr.symbol + (baseAmount / 1_000_000).toFixed(1) + "M";
  if (baseAmount >= 10_000) return curr.symbol + (baseAmount / 1_000).toFixed(0) + "k";
  if (curr.rate > 100) return curr.symbol + formatNum(Math.round(baseAmount), 0, selectedCurrency);
  return curr.symbol + formatNum(baseAmount, 0, selectedCurrency);
}

function formatOriginalPrice(sub) {
  const code = sub.currency || selectedCurrency || "USD";
  const curr = currencies[code] || currencies.USD;
  const dec = curr.rate > 100 ? 0 : 2;
  return curr.symbol + formatNum(sub.price, dec, code);
}

function formatOriginalMonthly(sub) {
  const code = sub.currency || selectedCurrency || "USD";
  const curr = currencies[code] || currencies.USD;
  let monthly = sub.price;
  if (sub.cycle === "Yearly") monthly = sub.price / 12;
  if (sub.cycle === "Weekly") monthly = sub.price * 4.33;
  const dec = curr.rate > 100 ? 0 : 2;
  return curr.symbol + formatNum(monthly, dec, code);
}

function formatOriginalMonthlyShort(sub) {
  const code = sub.currency || selectedCurrency || "USD";
  const curr = currencies[code] || currencies.USD;
  let monthly = sub.price;
  if (sub.cycle === "Yearly") monthly = sub.price / 12;
  if (sub.cycle === "Weekly") monthly = sub.price * 4.33;
  if (monthly >= 1_000_000) return curr.symbol + (monthly / 1_000_000).toFixed(1) + "M";
  if (monthly >= 10_000) return curr.symbol + (monthly / 1_000).toFixed(0) + "k";
  if (curr.rate > 100) return curr.symbol + formatNum(Math.round(monthly), 0, code);
  return curr.symbol + formatNum(monthly, 0, code);
}

function formatOriginalYearlyShort(sub) {
  const code = sub.currency || selectedCurrency || "USD";
  const curr = currencies[code] || currencies.USD;
  let yearly = sub.price * 12;
  if (sub.cycle === "Yearly") yearly = sub.price;
  if (sub.cycle === "Weekly") yearly = sub.price * 52;
  if (yearly >= 1_000_000) return curr.symbol + (yearly / 1_000_000).toFixed(1) + "M";
  if (yearly >= 10_000) return curr.symbol + (yearly / 1_000).toFixed(0) + "k";
  if (curr.rate > 100) return curr.symbol + formatNum(Math.round(yearly), 0, code);
  return curr.symbol + formatNum(yearly, 0, code);
}

function toMonthly(sub) {
  const subCurrency = sub.currency || selectedCurrency || "USD";
  let monthly = sub.price;
  if (sub.cycle === "Yearly") monthly = sub.price / 12;
  if (sub.cycle === "Weekly") monthly = sub.price * 4.33;
  return convertToBase(monthly, subCurrency);
}

function iconHtml(sub, className) {
  if (!sub.url) {
    return '<span class="iconify ' + className + ' text-slate-400 shrink-0" data-icon="ph:cube-bold"></span>';
  }

  const domain = sub.url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

  // logo.dev is pretty good at finding logos, free tier is enough for this
  const logoUrl = "https://img.logo.dev/" + domain + "?token=" + LOGO_API_TOKEN + "&size=100&retina=true&format=png";
  return '<img src="' + logoUrl + '" class="' + className + ' object-contain rounded-lg shrink-0" crossorigin="anonymous">';
}

function goToStep(stepNum) {
  document.querySelectorAll(".step-panel").forEach(panel => panel.classList.remove("active"));
  document.getElementById("step-" + stepNum).classList.add("active");

  const progressBar = document.getElementById("progress-bar");
  const indicator = document.getElementById("step-indicator");

  // tailwind doesn't support dynamic class names so we gotta hardcode these
  // tried using style.width but the transition didn't look as smooth
  const barClasses = "h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full";
  if (stepNum === 1) {
    progressBar.className = barClasses + " w-1/2";
  } else {
    progressBar.className = barClasses + " w-full";
    setView(currentView);
  }

  indicator.innerText = "Step " + stepNum + " of 2";
  step = stepNum;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setView(view) {
  currentView = view;

  // Update button styles
  const views = ["treemap", "beeswarm", "circlepack"];
  const activeClass = "bg-slate-900 text-white";
  const inactiveClass = "bg-white text-slate-600";

  views.forEach(v => {
    const btn = document.getElementById("view-" + v);
    if (btn) {
      btn.classList.remove(...activeClass.split(" "), ...inactiveClass.split(" "));
      if (v === view) {
        btn.classList.add(...activeClass.split(" "));
      } else {
        btn.classList.add(...inactiveClass.split(" "));
      }
    }
  });

  // Toggle containers
  const treemapContainer = document.getElementById("bento-grid");
  const beeswarmContainer = document.getElementById("beeswarm-container");
  const circlepackContainer = document.getElementById("circlepack-container");

  treemapContainer.classList.add("hidden");
  beeswarmContainer.classList.add("hidden");
  circlepackContainer.classList.add("hidden");

  if (view === "treemap") {
    treemapContainer.classList.remove("hidden");
    renderGrid();
    updateTrendsDisplay();
  } else if (view === "beeswarm") {
    beeswarmContainer.classList.remove("hidden");
    renderBeeswarm();
    updateTrendsDisplay();
  } else if (view === "circlepack") {
    circlepackContainer.classList.remove("hidden");
    renderCirclePack();
    updateTrendsDisplay();
  }
}

function renderList() {
  const listContainer = document.getElementById("sub-list-container");
  const emptyState = document.getElementById("empty-state");
  const nextBtn = document.getElementById("next-btn-1");
  const clearBtn = document.getElementById("clear-btn");

  if (subs.length === 0) {
    listContainer.classList.add("hidden");
    emptyState.classList.remove("hidden");
    nextBtn.disabled = true;
    nextBtn.classList.add("opacity-50", "cursor-not-allowed");
    clearBtn.classList.add("hidden");
    clearBtn.classList.remove("flex");
    updateUpcomingRenewals();
    return;
  }

  emptyState.classList.add("hidden");
  listContainer.classList.remove("hidden");
  nextBtn.disabled = false;
  nextBtn.classList.remove("opacity-50", "cursor-not-allowed");
  clearBtn.classList.remove("hidden");
  clearBtn.classList.add("flex");

  let html = "";
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    const color = getColor(sub.color);

    // Calculate renewal info if start date is set
    let renewalBadgeHtml = "";
    if (sub.startDate) {
      const renewalDate = ReminderManager.calculateNextRenewal(sub.startDate, sub.cycle);
      if (renewalDate) {
        const daysUntil = ReminderManager.getDaysUntilRenewal(renewalDate);
        if (daysUntil <= 30) {
          const badgeClass = ReminderManager.getRenewalBadgeClass(daysUntil);
          const badgeText = ReminderManager.getRenewalBadgeText(daysUntil);
          renewalBadgeHtml = '<div class="renewal-badge ' + badgeClass + '">' + badgeText + '</div>';
        }
      }
    }

    html += '<div class="relative flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">';
    html += renewalBadgeHtml;
    html += '<div class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" data-sub-id="' + escapeHtml(sub.id) + '" onclick="editSubFromCard(this)">';
    html += '<div class="w-1 h-10 rounded-full shrink-0" style="background: linear-gradient(180deg, ' + color.bg + ' 0%, ' + color.accent + ' 100%);"></div>';
    html += iconHtml(sub, "w-10 h-10");
    html += '<div class="min-w-0">';
    html += '<div class="font-bold text-slate-900 truncate">' + escapeHtml(sub.name) + '</div>';
    html += '<div class="text-xs text-slate-500">' + formatOriginalPrice(sub) + ' / ' + sub.cycle + '</div>';
    html += '</div></div>';
    html += '<div class="flex items-center gap-1">';
    html += '<button data-sub-id="' + escapeHtml(sub.id) + '" onclick="editSubFromButton(this)" class="text-slate-300 hover:text-indigo-500 p-2"><span class="iconify" data-icon="ph:pencil-simple-bold"></span></button>';
    html += '<button data-sub-id="' + escapeHtml(sub.id) + '" onclick="removeSubFromButton(this)" class="text-slate-300 hover:text-red-500 p-2"><span class="iconify" data-icon="ph:trash-bold"></span></button>';
    html += '</div></div>';
  }

  html += '<button onclick="openModal()" class="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center gap-2">';
  html += '<span class="iconify w-5 h-5" data-icon="ph:plus-bold"></span> Add Another</button>';

  listContainer.innerHTML = html;
  updateUpcomingRenewals();
}


function renderPresets() {
  const grid = document.getElementById("presets-grid");
  if (!grid) return;

  // full list is overwhelming, just show common ones here
  const popular = presets.filter(p => p.popular);

  let html = "";
  for (let i = 0; i < popular.length; i++) {
    const preset = popular[i];
    const presetIndex = presets.indexOf(preset);
    const logo = "https://img.logo.dev/" + preset.domain + "?token=" + LOGO_API_TOKEN + "&size=100&retina=true&format=png";

    html += '<button onclick="openModalWithPreset(' + presetIndex + ')" ';
    html += 'class="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md active:scale-95 sm:p-3">';
    html += '<img src="' + logo + '" class="h-8 w-8 rounded-lg object-contain sm:h-10 sm:w-10" crossorigin="anonymous" alt="' + preset.name + '">';
    html += '<span class="text-[10px] font-semibold text-slate-600 truncate w-full text-center sm:text-xs">' + preset.name + '</span>';
    html += '</button>';
  }
  grid.innerHTML = html;
}

function removeSub(subId) {
  subs = subs.filter(s => s.id !== subId);
  save();
}

function clearAllSubs() {
  if (!confirm("Delete all subscriptions?")) return;
  subs = [];
  save();
}

function editSub(subId) {
  const sub = subs.find(s => s.id === subId);
  if (!sub) return;

  document.getElementById("entry-id").value = sub.id;
  document.getElementById("name").value = sub.name;
  document.getElementById("price").value = sub.price;
  document.getElementById("sub-currency").value = sub.currency || selectedCurrency;
  document.getElementById("cycle").value = sub.cycle;
  document.getElementById("url").value = sub.url || "";
  document.getElementById("sub-category").value = sub.category || "other";
  document.getElementById("sub-start-date").value = sub.startDate || "";
  document.getElementById("sub-notifications-enabled").checked = sub.notificationsEnabled || false;
  document.getElementById("sub-reminder-days").value = sub.reminderDays || 7;

  updateFavicon(sub.url || "");
  pickColor(sub.color || randColor().id);
  updateReminderDaysVisibility();

  document.getElementById("modal-title").innerText = "Edit Subscription";
  document.querySelector("#sub-form button[type='submit']").innerText = "Save Changes";

  showModal();
}

function initColorPicker() {
  const container = document.getElementById("color-selector");
  let html = "";
  for (const color of colors) {
    html += '<div onclick="pickColor(\'' + color.id + '\')" ';
    html += 'class="color-option cursor-pointer rounded-lg h-10 border-2 border-transparent transition-all hover:scale-105" ';
    html += 'data-val="' + color.id + '" ';
    html += 'style="background:linear-gradient(135deg,' + color.bg + ' 0%,' + color.accent + ' 100%)"></div>';
  }
  container.innerHTML = html;
}

function pickColor(colorId) {
  document.getElementById("selected-color").value = colorId;

  const options = document.querySelectorAll(".color-option");
  for (const opt of options) {
    if (opt.dataset.val === colorId) {
      opt.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
    } else {
      opt.classList.remove("ring-2", "ring-indigo-500", "ring-offset-2");
    }
  }
}

// debounce the favicon preview so we're not hammering the api on every keystroke
let faviconDebounce = null;

function updateFavicon(urlInput) {
  clearTimeout(faviconDebounce);

  faviconDebounce = setTimeout(function () {
    const preview = document.getElementById("favicon-preview");

    if (!urlInput) {
      preview.innerHTML = '<span class="iconify text-slate-300 w-5 h-5" data-icon="ph:globe-simple"></span>';
      return;
    }

    const domain = urlInput.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

    // only fetch if domain looks legit (at least has a tld)
    if (domain.length > 3) {
      const logoUrl = "https://img.logo.dev/" + domain + "?token=" + LOGO_API_TOKEN + "&size=100&retina=true&format=png";
      preview.innerHTML = '<img src="' + logoUrl + '" class="w-full h-full object-cover" crossorigin="anonymous">';
    }
  }, 400);
}

function updateCategorySuggestion() {
  const nameInput = document.getElementById("name").value;
  const suggestionEl = document.getElementById("category-suggestion");

  if (!nameInput) {
    suggestionEl.innerText = "";
    return;
  }

  const suggestedCategory = CategoryManager.suggestCategory(nameInput);
  const categoryObj = Object.values(CATEGORIES).find(c => c.id === suggestedCategory);
  suggestionEl.innerText = "Suggested: " + (categoryObj ? categoryObj.name : "Other");
}

function saveBudget() {
  const amount = parseFloat(document.getElementById("budget-amount-input").value);
  const currency = document.getElementById("budget-currency-select").value;

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid budget amount");
    return;
  }

  const result = BudgetManager.setBudget(amount, currency);

  if (result.success) {
    alert("Budget saved!");
    updateBudgetDisplay();
  } else {
    alert("Error: " + result.error);
  }
}

function clearBudget() {
  if (!confirm("Clear your budget limit?")) return;

  BudgetManager.removeBudget();
  document.getElementById("budget-amount-input").value = "";
  updateBudgetDisplay();
  alert("Budget cleared");
}

function updateBudgetDisplay() {
  const usage = BudgetManager.calculateUsage(subs, selectedCurrency);
  const indicator = document.getElementById("budget-indicator");

  if (!usage) {
    indicator.classList.add("hidden");
    return;
  }

  indicator.classList.remove("hidden");

  // Update text
  const curr = currencies[usage.currency];
  const budgetFormatted = formatNum(usage.budget, 0, usage.currency);
  const totalFormatted = formatNum(usage.total, 0, usage.currency);
  document.getElementById("budget-text").innerText = curr.symbol + totalFormatted + " / " + curr.symbol + budgetFormatted;

  // Update percentage
  const percentage = Math.min(usage.percentage, 150);
  document.getElementById("budget-percentage").innerText = Math.round(usage.percentage) + "%";

  // Update bar
  const fill = document.getElementById("budget-fill");
  const color = BudgetManager.getThresholdColor(usage.status);
  fill.style.width = percentage + "%";
  fill.style.backgroundColor = color;

  // Update status message
  const status = BudgetManager.getStatusMessage(usage.status);
  document.getElementById("budget-status").innerText = status;
}

function initBudgetCurrencySelector() {
  const dropdown = document.getElementById("budget-currency-select");
  if (!dropdown) return;

  let html = "";
  const currencyCodes = Object.keys(currencies);

  for (let i = 0; i < currencyCodes.length; i++) {
    const code = currencyCodes[i];
    const curr = currencies[code];
    html += '<option value="' + code + '">' + curr.symbol + ' ' + code + '</option>';
  }

  dropdown.innerHTML = html;
  dropdown.value = selectedCurrency;

  // Load saved budget if exists
  const budget = BudgetManager.getBudget();
  if (budget) {
    document.getElementById("budget-amount-input").value = budget.amount;
    dropdown.value = budget.currency;
  }
}

function initCurrencySelector() {
  const dropdown = document.getElementById("currency-selector");
  if (!dropdown) return;

  let html = "";
  const currencyCodes = Object.keys(currencies);

  for (let i = 0; i < currencyCodes.length; i++) {
    const code = currencyCodes[i];
    const curr = currencies[code];
    const selected = (code === selectedCurrency) ? " selected" : "";
    html += '<option value="' + code + '"' + selected + '>' + curr.symbol + ' ' + code + ' - ' + curr.name + '</option>';
  }

  dropdown.innerHTML = html;
  dropdown.addEventListener("change", function (e) {
    saveCurrency(e.target.value);
  });
}

function initFormCurrencySelector() {
  const dropdown = document.getElementById("sub-currency");
  if (!dropdown) return;

  let html = "";
  const currencyCodes = Object.keys(currencies);

  for (let i = 0; i < currencyCodes.length; i++) {
    const code = currencyCodes[i];
    const curr = currencies[code];
    html += '<option value="' + code + '">' + curr.symbol + ' ' + code + '</option>';
  }

  dropdown.innerHTML = html;
  dropdown.value = selectedCurrency;
}

function handleFormSubmit(evt) {
  evt.preventDefault();

  const existingId = document.getElementById("entry-id").value;

  const subData = {
    id: existingId || Date.now().toString(),
    name: document.getElementById("name").value,
    price: parseFloat(document.getElementById("price").value),
    currency: document.getElementById("sub-currency").value,
    cycle: document.getElementById("cycle").value,
    url: document.getElementById("url").value,
    color: document.getElementById("selected-color").value || randColor().id,
    date: document.getElementById("date").value || "",
    category: document.getElementById("sub-category").value || "other",
    startDate: document.getElementById("sub-start-date").value || "",
    notificationsEnabled: document.getElementById("sub-notifications-enabled").checked || false,
    reminderDays: parseInt(document.getElementById("sub-reminder-days").value) || 7
  };

  if (existingId) {
    const index = subs.findIndex(s => s.id === existingId);
    if (index !== -1) {
      subs[index] = subData;
    }
  } else {
    subs.push(subData);
  }

  save();
  hideModal();
}

function updateReminderDaysVisibility() {
  const checkbox = document.getElementById("sub-notifications-enabled");
  const section = document.getElementById("reminder-days-section");
  if (!checkbox || !section) return;

  if (checkbox.checked) {
    section.classList.remove("hidden");
  } else {
    section.classList.add("hidden");
  }
}

function updateUpcomingRenewals() {
  const container = document.getElementById("upcoming-renewals-section");
  const list = document.getElementById("upcoming-renewals-list");

  if (!container || !list) return;

  const upcoming = ReminderManager.getUpcomingRenewals(subs, 30);

  if (upcoming.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  let html = "";
  for (let i = 0; i < upcoming.length; i++) {
    const sub = upcoming[i];
    const formattedDate = new Date(sub.renewalDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });

    html += '<div class="renewal-item">';
    html += '<div class="renewal-item-name">' + sub.name + '</div>';
    html += '<div class="renewal-item-date">' + formattedDate + '</div>';
    html += '<div class="renewal-item-days">' + sub.daysUntilRenewal + 'd</div>';
    html += '</div>';
  }

  list.innerHTML = html;
}

function updateTrendsDisplay() {
  const container = document.getElementById("trends-section");
  if (!container) return;

  if (!TrendsAnalyzer.hasEnoughData()) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  // Update MoM
  const mom = TrendsAnalyzer.calculateMoMChange();
  if (mom) {
    const momValue = document.getElementById("mom-value");
    const momDetail = document.getElementById("mom-detail");

    const icon = mom.direction === "up" ? "↑" : mom.direction === "down" ? "↓" : "→";
    const color = mom.direction === "up" ? "#ef4444" : mom.direction === "down" ? "#22c55e" : "#3b82f6";

    momValue.innerHTML = '<span style="color:' + color + '">' + icon + ' ' + Math.abs(mom.percentage).toFixed(1) + '%</span>';
    momValue.style.color = "inherit";
    momDetail.innerText = (mom.change >= 0 ? "+" : "-") + formatCurrency(Math.abs(mom.change));
  } else {
    document.getElementById("mom-value").innerText = "—";
    document.getElementById("mom-detail").innerText = "";
  }

  // Update YoY
  const yoy = TrendsAnalyzer.calculateYoYChange();
  if (yoy) {
    const yoyValue = document.getElementById("yoy-value");
    const yoyDetail = document.getElementById("yoy-detail");

    const icon = yoy.direction === "up" ? "↑" : yoy.direction === "down" ? "↓" : "→";
    const color = yoy.direction === "up" ? "#ef4444" : yoy.direction === "down" ? "#22c55e" : "#3b82f6";

    yoyValue.innerHTML = '<span style="color:' + color + '">' + icon + ' ' + Math.abs(yoy.percentage).toFixed(1) + '%</span>';
    yoyValue.style.color = "inherit";
    yoyDetail.innerText = (yoy.change >= 0 ? "+" : "-") + formatCurrency(Math.abs(yoy.change));
  } else {
    document.getElementById("yoy-value").innerText = "—";
    document.getElementById("yoy-detail").innerText = "";
  }

  // Update direction
  const trend = TrendsAnalyzer.getTrendDirection(6);
  const directionValue = document.getElementById("direction-value");
  const directionDetail = document.getElementById("direction-detail");

  const directionLabel = trend.direction === "increasing" ? "Increasing" : trend.direction === "decreasing" ? "Decreasing" : "Stable";
  const directionIcon = trend.direction === "increasing" ? "📈" : trend.direction === "decreasing" ? "📉" : "➡️";

  directionValue.innerText = directionIcon + " " + directionLabel;
  directionDetail.innerText = "Last 6 months";
}

function exportTrendsAsCSV() {
  TrendsAnalyzer.downloadTrendData();
}

// ===== Google Sheets Integration Functions =====

/**
 * Connect Google Sheets
 */
async function connectGoogleSheets() {
  const sheetUrl = document.getElementById("sheets-url")?.value;
  const apiKey = document.getElementById("sheets-api-key")?.value;

  if (!sheetUrl || !apiKey) {
    alert('Please enter both Google Sheet URL and API Key');
    return;
  }

  const result = await SheetsAPI.setCredentials(sheetUrl, apiKey);

  if (result.success) {
    alert('✓ Connected to Google Sheets!');
    updateSheetsSettingsUI();

    // Do initial sync
    const synced = await SyncManager.pullFromSheets();
    if (synced) {
      alert('✓ Initial sync successful!');
    }
  } else {
    alert('✗ Connection failed: ' + result.error);
  }
}

/**
 *  Disconnect Google Sheets
 */
function disconnectGoogleSheets() {
  if (confirm('Are you sure? This will not delete data, but you\'ll no longer sync to Google Sheets.')) {
    SheetsAPI.clearCredentials();
    SyncManager.setSyncStatus('idle');
    updateSheetsSettingsUI();
    alert('✓ Disconnected from Google Sheets');
  }
}

/**
 * Update Sheets settings UI based on connection status
 */
function updateSheetsSettingsUI() {
  const creds = SheetsAPI.getCredentials();
  const statusDiv = document.getElementById('sheets-status');
  const urlInput = document.getElementById('sheets-url');
  const keyInput = document.getElementById('sheets-api-key');
  const connectBtn = document.querySelector('[onclick="connectGoogleSheets()"]');
  const disconnectBtn = document.querySelector('[onclick="disconnectGoogleSheets()"]');

  if (!statusDiv) return;

  if (creds) {
    statusDiv.className = 'connected';
    statusDiv.innerText = '✓ Connected to Google Sheets';
    if (urlInput) urlInput.value = creds.sheetsUrl;
    if (keyInput) keyInput.value = '••••••••' + creds.apiKey.slice(-4);
    if (connectBtn) connectBtn.disabled = true;
    if (disconnectBtn) disconnectBtn.disabled = false;
  } else {
    statusDiv.className = 'disconnected';
    statusDiv.innerText = 'Not Connected';
    if (urlInput) urlInput.value = '';
    if (keyInput) keyInput.value = '';
    if (connectBtn) connectBtn.disabled = false;
    if (disconnectBtn) disconnectBtn.disabled = true;
  }
}

// ===== Conflict Resolution Modal Functions =====

/**
 * Show conflict resolution dialog
 * @param {Array} conflicts - Array of conflict objects
 */
function showConflictDialog(conflicts) {
  if (conflicts.length === 0) return;

  const modal = document.getElementById('conflict-modal');
  const description = document.getElementById('conflict-description');
  const comparison = document.getElementById('conflict-comparison');

  if (!modal || !description || !comparison) return;

  // Build description
  const conflictTexts = conflicts.map(c =>
    `${c.local.name} was modified in both places`
  ).join(', ');
  description.innerText = `${conflicts.length} conflict(s) detected: ${conflictTexts}`;

  // Build comparison view
  let comparisonHTML = '<div class="space-y-4">';
  for (let conflict of conflicts) {
    comparisonHTML += `
      <div class="border border-slate-200 rounded-lg p-3">
        <div class="font-semibold text-slate-900 mb-2">${conflict.local.name}</div>
        <div class="text-xs space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-blue-50 p-2 rounded">
              <div class="font-bold text-blue-900 mb-1">Local</div>
              <div class="text-slate-600">
                Price: ${conflict.local.price}<br/>
                Modified: ${new Date(conflict.localTime).toLocaleString()}
              </div>
            </div>
            <div class="bg-green-50 p-2 rounded">
              <div class="font-bold text-green-900 mb-1">Cloud</div>
              <div class="text-slate-600">
                Price: ${conflict.cloud.price}<br/>
                Modified: ${new Date(conflict.cloudTime).toLocaleString()}
              </div>
            </div>
          </div>
          <div class="text-slate-500 text-center text-xs">
            Newer version: <span class="font-bold">${conflict.cloudTime > conflict.localTime ? 'Cloud' : 'Local'}</span>
          </div>
        </div>
      </div>
    `;
  }
  comparisonHTML += '</div>';

  comparison.innerHTML = comparisonHTML;

  // Store conflicts for resolution
  window.currentConflicts = conflicts;

  // Show modal
  modal.classList.remove('hidden');
}

/**
 * Hide conflict dialog
 */
function hideConflictDialog() {
  const modal = document.getElementById('conflict-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Resolve conflicts by keeping one version
 * @param {string} choice - 'local' or 'cloud'
 */
function resolveConflict(choice) {
  const conflicts = window.currentConflicts;
  if (!conflicts) {
    hideConflictDialog();
    return;
  }

  // Apply user's choice
  for (let conflict of conflicts) {
    if (choice === 'cloud') {
      // Keep cloud version
      const index = subs.findIndex(s => s.id === conflict.id);
      if (index !== -1) {
        subs[index] = conflict.cloud;
      }
    }
    // Else keep local (do nothing, already in subs)
  }

  save();
  hideConflictDialog();
  window.currentConflicts = null;

  if (choice === 'cloud') {
    alert('✓ Resolved: Kept cloud versions');
  } else {
    alert('✓ Resolved: Kept local versions');
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  ThemeManager.init();
  await window.initRates();
  load();
  loadCurrency();
  initColorPicker();
  initCurrencySelector();
  initFormCurrencySelector();
  initBudgetCurrencySelector();
  renderPresets();
  renderList();
  updateBudgetDisplay();

  // Initialize Google Sheets sync manager
  if (typeof SyncManager !== 'undefined') {
    await SyncManager.init();
  }

  // Record initial snapshot if don't have one for this month
  TrendsAnalyzer.recordSnapshot();

  // Request notification permission on first visit
  if (Notification && Notification.permission === "default") {
    ReminderManager.requestNotificationPermission();
  }

  // Set up event listeners for reminder form
  const notificationsCheckbox = document.getElementById("sub-notifications-enabled");
  if (notificationsCheckbox) {
    notificationsCheckbox.addEventListener("change", updateReminderDaysVisibility);
  }

  document.getElementById("date").value = new Date().toISOString().split("T")[0];
});

/**
 * Wrapper function for XSS-safe edit subscription from card click
 * @param {HTMLElement} element - The clicked element
 */
function editSubFromCard(element) {
  const subId = element.getAttribute("data-sub-id");
  if (subId) {
    editSub(subId);
  }
}

/**
 * Wrapper function for XSS-safe edit subscription from button click
 * @param {HTMLElement} element - The clicked button element
 */
function editSubFromButton(element) {
  const subId = element.getAttribute("data-sub-id");
  if (subId) {
    editSub(subId);
  }
}

/**
 * Wrapper function for XSS-safe remove subscription from button click
 * @param {HTMLElement} element - The clicked button element
 */
function removeSubFromButton(element) {
  const subId = element.getAttribute("data-sub-id");
  if (subId) {
    removeSub(subId);
  }
}
