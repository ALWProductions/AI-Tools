import React, { useState } from 'react';
import { Foundation, AffinityGroup } from '../types';
import FoundationCard from './FoundationCard';
import { Plus, Building, ArrowDownCircle } from 'lucide-react';

interface Props {
  group: AffinityGroup;
  foundations: Foundation[];
  activeFoundation: Foundation | null;
  onSelectFoundation: (f: Foundation) => void;
  onEditFoundation: (f: Foundation) => void;
  onDeleteFoundation: (f: Foundation) => void;
  onMoveDivision: (id: string, newRegion: AffinityGroup) => void;
  onAddFoundationToRegion: (group: AffinityGroup) => void;
  onDropFoundation: (foundationId: string, targetRegion: AffinityGroup) => void;
  searchQuery: string;
}

const DIVISION_STYLES: Record<AffinityGroup, {
  headerBg: string;
  badgeBg: string;
  dragOverBg: string;
  name: string;
  sub: string;
  accentBorder: string;
}> = {
  [AffinityGroup.CHI]: {
    headerBg: 'bg-blue-600',
    badgeBg: 'bg-blue-700/80 text-white border-blue-400/40',
    dragOverBg: 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/20',
    name: 'CHI Division',
    sub: 'Blue/Green',
    accentBorder: 'border-blue-200'
  },
  [AffinityGroup.DIGNITY]: {
    headerBg: 'bg-orange-500',
    badgeBg: 'bg-orange-600/80 text-white border-orange-300/40',
    dragOverBg: 'border-orange-500 bg-orange-50/70 ring-4 ring-orange-500/20',
    name: 'Dignity Health Division',
    sub: 'Orange/Blue',
    accentBorder: 'border-orange-200'
  },
  [AffinityGroup.MOUNTAIN]: {
    headerBg: 'bg-purple-700',
    badgeBg: 'bg-purple-800/80 text-white border-purple-400/40',
    dragOverBg: 'border-purple-600 bg-purple-50/70 ring-4 ring-purple-500/20',
    name: 'Mountain Division',
    sub: 'Purple',
    accentBorder: 'border-purple-200'
  }
};

export const DivisionColumn: React.FC<Props> = ({
  group,
  foundations,
  activeFoundation,
  onSelectFoundation,
  onEditFoundation,
  onDeleteFoundation,
  onMoveDivision,
  onAddFoundationToRegion,
  onDropFoundation,
  searchQuery
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const style = DIVISION_STYLES[group];

  const filteredFoundations = foundations.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only turn off if leaving column
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const foundationId = e.dataTransfer.getData('text/plain');
    if (foundationId) {
      onDropFoundation(foundationId, group);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col ${
        isDragOver ? style.dragOverBg : 'border-slate-200/90'
      }`}
    >
      {/* Column Header */}
      <div className={`px-4 py-3.5 text-white flex justify-between items-center ${style.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className="font-black text-xs tracking-wider uppercase">{style.name}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
            {foundations.length}
          </span>
        </div>
        <button
          onClick={() => onAddFoundationToRegion(group)}
          className="hover:bg-white/20 active:bg-white/30 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
          title={`Add new foundation to ${group}`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Drag & Drop Notice Banner if dragging */}
      {isDragOver && (
        <div className="bg-slate-900 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 animate-in fade-in">
          <ArrowDownCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span>Drop to move foundation to {group}</span>
        </div>
      )}

      {/* Foundations List */}
      <div className="p-3.5 space-y-2 flex-1 min-h-[340px] max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {filteredFoundations.length > 0 ? (
          filteredFoundations.map((f) => (
            <FoundationCard
              key={f.id}
              foundation={f}
              isActive={activeFoundation?.id === f.id}
              onSelect={onSelectFoundation}
              onEdit={onEditFoundation}
              onDelete={onDeleteFoundation}
              onMoveDivision={onMoveDivision}
              searchHighlight={searchQuery}
            />
          ))
        ) : searchQuery.trim() ? (
          <div className="text-center py-10 px-3">
            <p className="text-xs text-slate-400 font-medium">
              No foundations match "{searchQuery}" in {group}.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-xl">
            <Building className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No foundations in {group}</p>
            <button
              onClick={() => onAddFoundationToRegion(group)}
              className="mt-3 text-xs font-bold text-slate-700 hover:text-slate-900 underline uppercase tracking-wider"
            >
              + Add first foundation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DivisionColumn;
