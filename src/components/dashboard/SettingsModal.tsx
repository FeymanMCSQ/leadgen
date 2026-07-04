'use client';
import { useState } from 'react';

export default function SettingsModal({
  quota,
  onClose,
  onSave,
}: {
  quota: number;
  onClose: () => void;
  onSave: (newQuota: number) => void;
}) {
  const [value, setValue] = useState(String(quota));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const q = parseInt(value, 10);
    if (!Number.isInteger(q) || q < 1 || q > 200) {
      setError('Enter a number between 1 and 200.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyCallQuota: q }),
      });
      if (!res.ok) throw new Error();
      onSave(q);
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Settings</h2>

        <label className="block text-sm font-medium text-slate-700 mb-1.5">Daily call quota</label>
        <input
          type="number"
          min={1}
          max={200}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
        <p className="text-xs text-slate-400 mt-1">How many leads you aim to action per day.</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-green hover:bg-brand-green-dark rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
