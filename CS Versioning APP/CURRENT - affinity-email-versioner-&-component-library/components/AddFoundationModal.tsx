import React, { useState, useEffect } from 'react';
import { AffinityGroup } from '../types';
import { X, Building2, Check, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, region: AffinityGroup) => void;
  defaultRegion?: AffinityGroup;
  existingNames: string[];
}

const DIVISION_CONFIG: Record<AffinityGroup, { name: string; tag: string; bgBadge: string; borderActive: string; accentColor: string; description: string }> = {
  [AffinityGroup.CHI]: {
    name: 'CHI Division',
    tag: 'Blue/Green Branding',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    borderActive: 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50',
    accentColor: 'bg-blue-600',
    description: 'Catholic Health Initiatives regional network'
  },
  [AffinityGroup.DIGNITY]: {
    name: 'Dignity Health Division',
    tag: 'Orange/Blue Branding',
    bgBadge: 'bg-orange-50 text-orange-700 border-orange-200',
    borderActive: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50',
    accentColor: 'bg-orange-500',
    description: 'Dignity Health hospitals and philanthropic foundations'
  },
  [AffinityGroup.MOUNTAIN]: {
    name: 'Mountain Division',
    tag: 'Purple/Indigo Branding',
    bgBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    borderActive: 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/50',
    accentColor: 'bg-purple-700',
    description: 'Colorado, Utah, & Kansas healthcare foundations'
  }
};

export const AddFoundationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAdd,
  defaultRegion = AffinityGroup.CHI,
  existingNames
}) => {
  const [name, setName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<AffinityGroup>(defaultRegion);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedRegion(defaultRegion);
      setError(null);
    }
  }, [isOpen, defaultRegion]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a foundation name.');
      return;
    }

    const isDuplicate = existingNames.some(
      n => n.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError(`A foundation named "${trimmed}" already exists.`);
      return;
    }

    onAdd(trimmed, selectedRegion);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-foundation-title"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-foundation-title" className="font-bold text-base text-slate-900">
                Add New Foundation
              </h3>
              <p className="text-xs text-slate-500">
                Register a new healthcare foundation into its designated division
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Foundation Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. St. Joseph Hospital Foundation"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className={`w-full p-3 border rounded-xl bg-slate-50 text-sm font-medium transition-all focus:outline-none focus:bg-white ${
                error 
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 bg-rose-50/30' 
                  : 'border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
              }`}
            />
            {error && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Designated Division <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Assign to the brand division. You can easily move it later if branding changes.
            </p>

            <div className="space-y-2.5">
              {(Object.keys(DIVISION_CONFIG) as AffinityGroup[]).map((regionKey) => {
                const config = DIVISION_CONFIG[regionKey];
                const isSelected = selectedRegion === regionKey;
                return (
                  <button
                    key={regionKey}
                    type="button"
                    onClick={() => setSelectedRegion(regionKey)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? config.borderActive
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${config.accentColor} flex-shrink-0`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{config.name}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.bgBadge}`}>
                            {regionKey}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-slate-900 text-white flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" /> Add Foundation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFoundationModal;
