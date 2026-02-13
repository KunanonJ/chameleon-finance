// R2 Cloud Storage Manager
// Handles backup, restore, file attachments, and export storage via Cloudflare R2

const R2Storage = {
  TOKEN_KEY: "subgrid_r2_token",
  BACKUP_STATE_KEY: "subgrid_r2_state",
  isConnected: false,
  lastBackupTime: null,
  _backupDebounce: null,
  BACKUP_DEBOUNCE_MS: 30000,

  /**
   * Initialize R2 storage - check if already connected
   */
  init() {
    const token = this.getToken();
    if (token) {
      this.isConnected = true;
    }

    const state = localStorage.getItem(this.BACKUP_STATE_KEY);
    if (state) {
      try {
        const parsed = JSON.parse(state);
        this.lastBackupTime = parsed.lastBackupTime || null;
      } catch (e) {
        // ignore
      }
    }

    this.updateUI();
  },

  /**
   * Hash passphrase to SHA-256 hex string
   * @param {string} passphrase
   * @returns {Promise<string>}
   */
  async hashPassphrase(passphrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  },

  /**
   * Get stored token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Connect with a passphrase
   * @param {string} passphrase
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connect(passphrase) {
    if (!passphrase || passphrase.length < 6) {
      return { success: false, error: "Passphrase must be at least 6 characters" };
    }

    const token = await this.hashPassphrase(passphrase);
    localStorage.setItem(this.TOKEN_KEY, token);
    this.isConnected = true;
    this.updateUI();
    return { success: true };
  },

  /**
   * Disconnect from R2
   */
  disconnect() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.BACKUP_STATE_KEY);
    this.isConnected = false;
    this.lastBackupTime = null;
    this.updateUI();
  },

  /**
   * Save state to localStorage
   */
  _saveState() {
    localStorage.setItem(this.BACKUP_STATE_KEY, JSON.stringify({
      lastBackupTime: this.lastBackupTime
    }));
  },

  /**
   * Generic API call helper
   * @param {string} path - relative to /api/r2/
   * @param {Object} options - fetch options
   * @returns {Promise<Response>}
   */
  async apiCall(path, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error("Not connected to cloud storage");

    const headers = { "X-User-Token": token, ...(options.headers || {}) };
    const response = await fetch("/api/r2/" + path, { ...options, headers });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `Request failed (${response.status})`);
    }
    return response;
  },

  // ===== Backup Methods =====

  /**
   * Save a full data backup to R2
   * @returns {Promise<{ok: boolean, backupDate: string}>}
   */
  async saveBackup() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      currency: selectedCurrency,
      subscriptions: subs,
      budget: typeof BudgetManager !== "undefined" ? BudgetManager.getBudget() : null,
      trends: typeof TrendsAnalyzer !== "undefined" ? TrendsAnalyzer.getHistory() : []
    };

    const response = await this.apiCall("backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    this.lastBackupTime = result.backupDate || new Date().toISOString();
    this._saveState();
    this.updateUI();
    return result;
  },

  /**
   * Restore the latest backup from R2
   * @param {string} [key] - optional specific backup key
   * @returns {Promise<Object>} - backup data
   */
  async restoreBackup(key) {
    const path = key ? "backup?key=" + encodeURIComponent(key) : "backup";
    const response = await this.apiCall(path);
    return await response.json();
  },

  /**
   * List all historical backups
   * @returns {Promise<Array>}
   */
  async listBackups() {
    const response = await this.apiCall("backups");
    return await response.json();
  },

  /**
   * Schedule a debounced auto-backup (called from save())
   */
  scheduleBackup() {
    if (!this.isConnected) return;
    clearTimeout(this._backupDebounce);
    this._backupDebounce = setTimeout(() => {
      this.saveBackup().catch(err => console.warn("Auto-backup failed:", err));
    }, this.BACKUP_DEBOUNCE_MS);
  },

  // ===== Attachment Methods =====

  /**
   * Upload a file attachment for a subscription
   * @param {string} subId
   * @param {File} file
   * @returns {Promise<Object>}
   */
  async uploadAttachment(subId, file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.apiCall("attachments/" + encodeURIComponent(subId), {
      method: "POST",
      body: formData
    });
    return await response.json();
  },

  /**
   * List attachments for a subscription
   * @param {string} subId
   * @returns {Promise<Array>}
   */
  async listAttachments(subId) {
    const response = await this.apiCall("attachments/" + encodeURIComponent(subId));
    return await response.json();
  },

  /**
   * Get download URL for an attachment
   * @param {string} subId
   * @param {string} filename
   * @returns {string}
   */
  getAttachmentUrl(subId, filename) {
    return "/api/r2/attachment/" + encodeURIComponent(subId) + "/" + encodeURIComponent(filename);
  },

  /**
   * Delete an attachment
   * @param {string} subId
   * @param {string} filename
   * @returns {Promise<Object>}
   */
  async deleteAttachment(subId, filename) {
    const response = await this.apiCall(
      "attachment/" + encodeURIComponent(subId) + "/" + encodeURIComponent(filename),
      { method: "DELETE" }
    );
    return await response.json();
  },

  // ===== Export Methods =====

  /**
   * Save an export file to R2
   * @param {string} filename
   * @param {string} content
   * @param {string} contentType
   * @returns {Promise<Object>}
   */
  async saveExport(filename, content, contentType) {
    const response = await this.apiCall("exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content, contentType })
    });
    return await response.json();
  },

  /**
   * List all saved exports
   * @returns {Promise<Array>}
   */
  async listExports() {
    const response = await this.apiCall("exports");
    return await response.json();
  },

  /**
   * Download an export file
   * @param {string} filename
   * @returns {Promise<Blob>}
   */
  async downloadExport(filename) {
    const response = await this.apiCall("export/" + encodeURIComponent(filename));
    return await response.blob();
  },

  /**
   * Delete an export
   * @param {string} filename
   * @returns {Promise<Object>}
   */
  async deleteExport(filename) {
    const response = await this.apiCall("export/" + encodeURIComponent(filename), {
      method: "DELETE"
    });
    return await response.json();
  },

  // ===== UI =====

  /**
   * Update the R2 settings UI based on connection state
   */
  updateUI() {
    const status = document.getElementById("r2-status");
    const connectForm = document.getElementById("r2-connect-form");
    const actions = document.getElementById("r2-actions");
    const lastBackup = document.getElementById("r2-last-backup");
    const attachSection = document.getElementById("attachments-section");

    if (status) {
      if (this.isConnected) {
        status.textContent = "Connected";
        status.className = "mb-4 rounded-lg px-3 py-2 text-center text-sm font-semibold bg-green-50 text-green-700";
      } else {
        status.textContent = "Not Connected";
        status.className = "mb-4 rounded-lg px-3 py-2 text-center text-sm font-semibold bg-slate-100 text-slate-500";
      }
    }

    if (connectForm) {
      connectForm.classList.toggle("hidden", this.isConnected);
    }
    if (actions) {
      actions.classList.toggle("hidden", !this.isConnected);
    }

    if (lastBackup) {
      if (this.lastBackupTime) {
        lastBackup.textContent = "Last backup: " + new Date(this.lastBackupTime).toLocaleString();
      } else {
        lastBackup.textContent = "";
      }
    }

    if (attachSection) {
      attachSection.classList.toggle("hidden", !this.isConnected);
    }
  }
};

// ===== UI handler functions (called from onclick) =====

async function connectR2() {
  const input = document.getElementById("r2-passphrase");
  if (!input) return;

  const result = await R2Storage.connect(input.value);
  if (result.success) {
    input.value = "";
    alert("Connected to cloud storage!");
  } else {
    alert(result.error);
  }
}

function disconnectR2() {
  if (!confirm("Disconnect from cloud storage? Your cloud data will remain but you won't sync until you reconnect.")) return;
  R2Storage.disconnect();
  alert("Disconnected from cloud storage");
}

async function backupToR2() {
  try {
    const result = await R2Storage.saveBackup();
    alert("Backup saved! (" + subs.length + " subscriptions)");
  } catch (err) {
    alert("Backup failed: " + err.message);
  }
}

async function restoreFromR2() {
  try {
    const data = await R2Storage.restoreBackup();

    if (!data || !data.subscriptions) {
      alert("No backup found in cloud storage");
      return;
    }

    const replaceExisting = subs.length === 0 || confirm(
      "You have " + subs.length + " existing subscription(s).\n\n" +
      "Click OK to replace with " + data.subscriptions.length + " from backup.\n" +
      "Click Cancel to merge."
    );

    if (replaceExisting || subs.length === 0) {
      subs = data.subscriptions;
    } else {
      for (let i = 0; i < data.subscriptions.length; i++) {
        const existing = subs.find(s => s.id === data.subscriptions[i].id);
        if (!existing) {
          subs.push(data.subscriptions[i]);
        }
      }
    }

    if (data.currency && currencies[data.currency]) {
      saveCurrency(data.currency);
    }

    if (data.budget && typeof BudgetManager !== "undefined") {
      BudgetManager.setBudget(data.budget.amount, data.budget.currency);
    }

    if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
      localStorage.setItem("subgrid_history", JSON.stringify(data.trends));
    }

    save();
    alert("Restored " + data.subscriptions.length + " subscription(s) from cloud!");
  } catch (err) {
    alert("Restore failed: " + err.message);
  }
}

async function showR2BackupHistory() {
  try {
    const backups = await R2Storage.listBackups();

    if (!backups || backups.length === 0) {
      alert("No backup history found");
      return;
    }

    let msg = "Backup History:\n\n";
    for (let i = 0; i < backups.length; i++) {
      const b = backups[i];
      const date = new Date(b.uploaded).toLocaleString();
      const size = (b.size / 1024).toFixed(1) + " KB";
      msg += (i + 1) + ". " + date + " (" + size + ")\n";
    }
    msg += "\nUse 'Restore from Cloud' to restore the latest backup.";
    alert(msg);
  } catch (err) {
    alert("Failed to load backup history: " + err.message);
  }
}

// Attachment handling for subscription form
let pendingAttachmentFiles = [];

function handleAttachmentSelect(evt) {
  const files = Array.from(evt.target.files || []);
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 10 * 1024 * 1024) {
      alert(files[i].name + " exceeds 10MB limit");
      continue;
    }
    pendingAttachmentFiles.push(files[i]);
  }
  renderPendingAttachments();
  evt.target.value = "";
}

function renderPendingAttachments() {
  const container = document.getElementById("pending-attachments");
  if (!container) return;

  if (pendingAttachmentFiles.length === 0) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  let html = "";
  for (let i = 0; i < pendingAttachmentFiles.length; i++) {
    const file = pendingAttachmentFiles[i];
    const size = (file.size / 1024).toFixed(1) + " KB";
    html += '<div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">';
    html += '<div class="flex items-center gap-2 min-w-0">';
    html += '<span class="iconify shrink-0 text-slate-400" data-icon="ph:file-bold"></span>';
    html += '<span class="text-xs font-medium text-slate-700 truncate">' + escapeHtml(file.name) + '</span>';
    html += '<span class="text-xs text-slate-400 shrink-0">' + size + '</span>';
    html += '</div>';
    html += '<button type="button" onclick="removePendingAttachment(' + i + ')" class="text-slate-400 hover:text-red-500 p-1">';
    html += '<span class="iconify" data-icon="ph:x-bold"></span></button>';
    html += '</div>';
  }
  container.innerHTML = html;
}

function removePendingAttachment(index) {
  pendingAttachmentFiles.splice(index, 1);
  renderPendingAttachments();
}

async function uploadPendingAttachments(subId) {
  if (!R2Storage.isConnected || pendingAttachmentFiles.length === 0) return;

  for (let i = 0; i < pendingAttachmentFiles.length; i++) {
    try {
      await R2Storage.uploadAttachment(subId, pendingAttachmentFiles[i]);
    } catch (err) {
      console.warn("Failed to upload " + pendingAttachmentFiles[i].name + ":", err);
    }
  }
  pendingAttachmentFiles = [];
}

async function renderExistingAttachments(subId) {
  const container = document.getElementById("existing-attachments");
  if (!container || !R2Storage.isConnected) return;

  try {
    const attachments = await R2Storage.listAttachments(subId);
    if (!attachments || attachments.length === 0) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    container.classList.remove("hidden");
    let html = '<div class="text-xs font-semibold text-slate-500 mb-2">Saved files</div>';
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      const size = (att.size / 1024).toFixed(1) + " KB";
      html += '<div class="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">';
      html += '<div class="flex items-center gap-2 min-w-0">';
      html += '<span class="iconify shrink-0 text-indigo-400" data-icon="ph:file-bold"></span>';
      html += '<span class="text-xs font-medium text-indigo-700 truncate">' + escapeHtml(att.filename) + '</span>';
      html += '<span class="text-xs text-indigo-400 shrink-0">' + size + '</span>';
      html += '</div>';
      html += '<div class="flex items-center gap-1">';
      html += '<a href="' + R2Storage.getAttachmentUrl(subId, att.filename) + '" target="_blank" class="text-indigo-400 hover:text-indigo-600 p-1">';
      html += '<span class="iconify" data-icon="ph:download-simple-bold"></span></a>';
      html += '<button type="button" onclick="deleteExistingAttachment(\'' + escapeHtml(subId) + '\',\'' + escapeHtml(att.filename) + '\')" class="text-indigo-400 hover:text-red-500 p-1">';
      html += '<span class="iconify" data-icon="ph:trash-bold"></span></button>';
      html += '</div></div>';
    }
    container.innerHTML = html;
  } catch (err) {
    console.warn("Failed to load attachments:", err);
    container.classList.add("hidden");
  }
}

async function deleteExistingAttachment(subId, filename) {
  if (!confirm("Delete " + filename + "?")) return;
  try {
    await R2Storage.deleteAttachment(subId, filename);
    renderExistingAttachments(subId);
  } catch (err) {
    alert("Failed to delete: " + err.message);
  }
}
