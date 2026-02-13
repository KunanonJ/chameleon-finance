// localstorage keys - using vexly prefix for namespacing
// (this was the old name of the project)
const STORAGE_KEY = "vexly_flow_data";
const CURRENCY_KEY = "vexly_currency";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      subs = JSON.parse(raw);
    }
  } catch (err) {
    // probably corrupted data, just start fresh
    console.warn("failed to load saved data:", err);
    subs = [];
  }
}

function save() {
  // Add/update lastModified timestamp for each subscription
  const now = new Date().toISOString();
  for (let i = 0; i < subs.length; i++) {
    if (!subs[i].lastModified) {
      subs[i].lastModified = now;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  } catch (error) {
    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      alert("Storage full - please delete some subscriptions to continue.");
      console.error("localStorage quota exceeded:", error);
      return; // Don't proceed if save failed
    }
    throw error; // Re-throw other errors
  }

  renderList();
  if (typeof updateBudgetDisplay === 'function') {
    updateBudgetDisplay();
  }

  // Notify sync manager of changes
  if (typeof SyncManager !== 'undefined' && SyncManager.onDataChanged) {
    SyncManager.onDataChanged();
  }

  // Schedule R2 cloud auto-backup
  if (typeof R2Storage !== 'undefined' && R2Storage.scheduleBackup) {
    R2Storage.scheduleBackup();
  }
}

function loadCurrency() {
  const saved = localStorage.getItem(CURRENCY_KEY);

  // make sure it's a valid currency code
  if (saved && currencies[saved]) {
    selectedCurrency = saved;
  } else {
    selectedCurrency = "USD";
  }
}

function saveCurrency(code) {
  selectedCurrency = code;
  localStorage.setItem(CURRENCY_KEY, code);

  renderList();
  if (step === 2) renderGrid();
}

function exportData() {
  // Gather all data for comprehensive backup
  const exportObj = {
    version: 2, // Increment version for new format
    exportedAt: new Date().toISOString(),
    currency: selectedCurrency,
    subscriptions: subs,
    budget: BudgetManager ? BudgetManager.getBudget() : null,
    trends: TrendsAnalyzer ? TrendsAnalyzer.getHistory() : []
  };

  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "subgrid-backup-" + new Date().toISOString().split("T")[0] + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(blobUrl);
  Analytics.track("data_exported", { value: subs.length });
  console.log(`✓ Exported ${subs.length} subscriptions, budget, and ${exportObj.trends.length} trend records`);

  // Also save to R2 cloud storage if connected
  if (typeof R2Storage !== 'undefined' && R2Storage.isConnected) {
    R2Storage.saveExport(link.download, jsonStr, "application/json")
      .then(() => console.log("✓ Export also saved to cloud"))
      .catch(err => console.warn("Cloud export save failed:", err));
  }
}

function importData(evt) {
  const file = evt.target.files && evt.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.subscriptions || !Array.isArray(data.subscriptions)) {
        throw new Error("Invalid file format");
      }

      for (let i = 0; i < data.subscriptions.length; i++) {
        const sub = data.subscriptions[i];
        // Validate required fields and price is a positive number
        if (!sub.id || !sub.name || typeof sub.price !== "number" || !isFinite(sub.price) || sub.price <= 0) {
          throw new Error("Invalid subscription data - price must be a positive number");
        }
      }

      let replaceExisting = true;
      if (subs.length > 0) {
        replaceExisting = confirm(
          "You have " + subs.length + " existing subscription(s).\n\n" +
          "Click OK to replace them with " + data.subscriptions.length + " imported subscription(s).\n\n" +
          "Click Cancel to merge (add imported to existing)."
        );
      }

      if (replaceExisting || subs.length === 0) {
        subs = data.subscriptions;
      } else {
        for (let i = 0; i < data.subscriptions.length; i++) {
          const imported = data.subscriptions[i];
          subs.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: imported.name,
            price: imported.price,
            currency: imported.currency || selectedCurrency || "USD",
            cycle: imported.cycle,
            url: imported.url || "",
            color: imported.color
          });
        }
      }

      if (data.currency && currencies[data.currency]) {
        saveCurrency(data.currency);
      }

      // Import budget if present
      if (data.budget && BudgetManager) {
        if (data.budget.amount && data.budget.currency) {
          BudgetManager.setBudget(data.budget.amount, data.budget.currency);
          console.log(`✓ Imported budget: ${data.budget.amount} ${data.budget.currency}`);
        }
      }

      // Import trends if present
      if (data.trends && Array.isArray(data.trends) && data.trends.length > 0 && TrendsAnalyzer) {
        localStorage.setItem('subgrid_history', JSON.stringify(data.trends));
        console.log(`✓ Imported ${data.trends.length} trend records`);
      }

      save();
      closeSettings();
      Analytics.track("data_imported", { value: data.subscriptions.length });
      alert("Successfully imported " + data.subscriptions.length + " subscription(s)!" +
            (data.budget ? "\n✓ Budget restored" : "") +
            (data.trends && data.trends.length > 0 ? `\n✓ ${data.trends.length} trends restored` : ""));

    } catch (err) {
      alert("Failed to import: " + err.message);
    }
  };

  reader.readAsText(file);

  // reset the input so they can import the same file again if needed
  evt.target.value = "";
}
