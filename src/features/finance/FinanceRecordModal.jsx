import { useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { FINANCE_TYPES, PAYMENT_METHODS, HOW_PAID_OPTIONS } from '@shared/lib/financeConstants';
import { LOGO_API_TOKEN, randColor } from '@shared/lib/constants';
import Modal from '@shared/ui/Modal';
import ColorPicker from '@shared/ui/ColorPicker';

function extractDomain(text) {
  if (!text) return '';
  // If it looks like a URL, extract domain
  const urlMatch = text.match(/^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)/);
  if (urlMatch) return urlMatch[1];
  // Otherwise try description as a brand name -> brand.com
  const cleaned = text.trim().toLowerCase().replace(/\s+/g, '');
  if (cleaned.length >= 2) return cleaned + '.com';
  return '';
}

function getLogoUrl(domain) {
  if (!domain || domain.length < 4) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_API_TOKEN}&size=100&retina=true&format=png`;
}

function resizeImage(file, maxSize = 100) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200';
const selectClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200';
const labelClass = 'mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300';

const defaultForm = {
  date: '',
  description: '',
  interestRate: '',
  income: '',
  expenses: '',
  minimumExpenses: '',
  balance: '',
  dueDate: '',
  paymentMethod: '',
  howPaid: '',
  done: false,
  type: 'Utility',
  note: '',
  iconDomain: '',
  customIcon: '',
  color: '',
};

export default function FinanceRecordModal({ isOpen, onClose, editId }) {
  const records = useFinanceStore((s) => s.records);
  const addRecord = useFinanceStore((s) => s.addRecord);
  const editRecord = useFinanceStore((s) => s.editRecord);

  const [form, setForm] = useState({ ...defaultForm });
  const [iconValid, setIconValid] = useState(false);
  const [iconLoading, setIconLoading] = useState(false);
  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editId) {
      const existing = records.find((r) => r.id === editId);
      if (existing) {
        setForm({
          date: existing.date || '',
          description: existing.description || '',
          interestRate: existing.interestRate || '',
          income: existing.income || '',
          expenses: existing.expenses || '',
          minimumExpenses: existing.minimumExpenses || '',
          balance: existing.balance || '',
          dueDate: existing.dueDate || '',
          paymentMethod: existing.paymentMethod || '',
          howPaid: existing.howPaid || '',
          done: existing.done || false,
          type: existing.type || 'Utility',
          note: existing.note || '',
          iconDomain: existing.iconDomain || '',
          customIcon: existing.customIcon || '',
          color: existing.color || randColor().id,
        });
      }
    } else if (isOpen) {
      setForm({ ...defaultForm, date: todayLocal(), color: randColor().id });
      setIconValid(false);
    }
  }, [editId, isOpen, records]);

  // Auto-detect icon from description with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!form.description || form.iconDomain) return;

    debounceRef.current = setTimeout(() => {
      const guessed = extractDomain(form.description);
      if (guessed && guessed.length >= 4) {
        setIconLoading(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setForm((prev) => ({ ...prev, iconDomain: guessed }));
          setIconValid(true);
          setIconLoading(false);
        };
        img.onerror = () => {
          setIconValid(false);
          setIconLoading(false);
        };
        img.src = getLogoUrl(guessed);
      }
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [form.description]);

  // Validate icon when iconDomain changes manually
  useEffect(() => {
    if (!form.iconDomain) {
      setIconValid(false);
      return;
    }
    const url = getLogoUrl(form.iconDomain);
    if (!url) { setIconValid(false); return; }
    setIconLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setIconValid(true); setIconLoading(false); };
    img.onerror = () => { setIconValid(false); setIconLoading(false); };
    img.src = url;
  }, [form.iconDomain]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm((prev) => ({ ...prev, customIcon: dataUrl }));
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...form,
      interestRate: parseFloat(form.interestRate) || 0,
      income: parseFloat(form.income) || 0,
      expenses: parseFloat(form.expenses) || 0,
      minimumExpenses: parseFloat(form.minimumExpenses) || 0,
      balance: parseFloat(form.balance) || 0,
      iconDomain: form.iconDomain || '',
      customIcon: form.customIcon || '',
      color: form.color || '',
    };

    if (editId) {
      editRecord(editId, data);
    } else {
      addRecord(data);
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Edit Record' : 'Add Record'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={selectClass}
            >
              {FINANCE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value, iconDomain: '' }))}
            className={inputClass}
            placeholder="e.g. Netflix, Spotify, Water Bill"
            required
          />
        </div>

        {/* Brand Icon */}
        <div>
          <label className={labelClass}>Brand Icon</label>
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-indigo-500"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload icon"
            >
              {form.customIcon ? (
                <img
                  src={form.customIcon}
                  className="h-full w-full rounded-xl object-cover"
                  alt=""
                />
              ) : iconLoading ? (
                <svg className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : iconValid && form.iconDomain ? (
                <img
                  src={getLogoUrl(form.iconDomain)}
                  className="h-full w-full rounded-xl object-cover"
                  crossOrigin="anonymous"
                  alt=""
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <svg className="h-5 w-5 text-slate-300 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={form.iconDomain}
                onChange={(e) => setForm({ ...form, iconDomain: e.target.value.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0], customIcon: '' })}
                className={inputClass}
                placeholder="Auto-detected or type domain (e.g. netflix.com)"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
              title="Upload icon"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            {(form.iconDomain || form.customIcon) && (
              <button
                type="button"
                onClick={() => setForm({ ...form, iconDomain: '', customIcon: '' })}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {form.customIcon ? 'Custom icon uploaded' : iconValid ? 'Icon detected' : 'Auto-detects brand icon or upload your own'}
          </p>
        </div>

        {/* Color */}
        <div>
          <label className={labelClass}>Color</label>
          <ColorPicker value={form.color} onChange={(id) => setForm({ ...form, color: id })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Income</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.income}
              onChange={(e) => setForm({ ...form, income: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Expenses</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.expenses}
              onChange={(e) => setForm({ ...form, expenses: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Minimum Expenses</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minimumExpenses}
              onChange={(e) => setForm({ ...form, minimumExpenses: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.interestRate}
              onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Balance</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Payment Method</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className={selectClass}
            >
              <option value="">Select...</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>How I paid?</label>
            <select
              value={form.howPaid}
              onChange={(e) => setForm({ ...form, howPaid: e.target.value })}
              className={selectClass}
            >
              <option value="">Select...</option>
              {HOW_PAID_OPTIONS.map((hp) => (
                <option key={hp} value={hp}>{hp}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Note</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className={inputClass + ' resize-none'}
            rows={2}
            placeholder="Optional note..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="finance-done"
            checked={form.done}
            onChange={(e) => setForm({ ...form, done: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600"
          />
          <label htmlFor="finance-done" className="text-sm text-slate-600 dark:text-slate-400">Mark as done</label>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-indigo-600 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
        >
          {editId ? 'Save Changes' : 'Add Record'}
        </button>
      </form>
    </Modal>
  );
}
