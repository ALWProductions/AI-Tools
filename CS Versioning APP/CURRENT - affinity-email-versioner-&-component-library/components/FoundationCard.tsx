import React, { useState, useRef, useEffect } from 'react';
import { Foundation, AffinityGroup } from '../types';
import { 
  FolderOpen, 
  Trash2, 
  Edit3, 
  ArrowRightLeft, 
  GripVertical,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Props {
  foundation: Foundation;
  isActive: boolean;
  onSelect: (f: Foundation) => void;
  onEdit: (f: Foundation) => void;
  onDelete: (f: Foundation) => void;
  onMoveDivision: (id: string, newRegion: AffinityGroup) => void;
  onDragStart?: (e: React.DragEvent, foundation: Foundation) => void;
  searchHighlight?: string;
}

const REGION_THEMES: Record<AffinityGroup, { name: string; dotColor: string; bgSoft: string; borderHover: string; textActive: string }> = {
  [AffinityGroup.CHI]: {
    name: 'CHI',
    dotColor: 'bg-blue-600',
    bgSoft: 'bg-blue-50/50',
    borderHover: 'hover:border-blue-400',
    textActive: 'text-blue-700'
  },
  [AffinityGroup.DIGNITY]: {
    name: 'Dignity Health',
    dotColor: 'bg-orange-500',
    bgSoft: 'bg-orange-50/50',
    borderHover: 'hover:border-orange-400',
    textActive: 'text-orange-700'
  },
  [AffinityGroup.MOUNTAIN]: {
    name: 'Mountain',
    dotColor: 'bg-purple-700',
    bgSoft: 'bg-purple-50/50',
    borderHover: 'hover:border-purple-400',
    textActive: 'text-purple-700'
  }
};

export const FoundationCard: React.FC<Props> = ({
  foundation,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onMoveDivision,
  onDragStart,
  searchHighlight
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    if (showMoveMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMoveMenu]);

  const otherRegions = (Object.values(AffinityGroup) as AffinityGroup[]).filter(
    r => r !== foundation.region
  );

  const renderHighlightedName = (name: string, query?: string) => {
    if (!query || !query.trim()) return name;
    const q = query.trim().toLowerCase();
    const idx = name.toLowerCase().indexOf(q);
    if (idx === -1) return name;

    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + q.length);
    const after = name.substring(idx + q.length);

    return (
      <>
        {before}
        <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-bold">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, foundation);
        e.dataTransfer.setData('text/plain', foundation.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onSelect(foundation)}
      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
        isActive
          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm'
          : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/70 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div 
            className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 p-0.5 -ml-1 transition-colors"
            title="Drag to another division"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <FolderOpen
            className={`w-4 h-4 flex-shrink-0 transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span
            className={`text-xs font-bold truncate transition-colors ${
              isActive ? 'text-blue-900' : 'text-slate-800'
            }`}
            title={foundation.name}
          >
            {renderHighlightedName(foundation.name, searchHighlight)}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
              isActive
                ? 'bg-blue-100/70 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-500 border-slate-200/80 group-hover:bg-white'
            }`}
            title={`${foundation.components.length} reusable component${foundation.components.length !== 1 ? 's' : ''}`}
          >
            {foundation.components.length}
          </span>

          {/* Quick Move Division Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className={`p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors ${
                showMoveMenu ? 'bg-slate-200 text-slate-800' : 'opacity-70 group-hover:opacity-100'
              }`}
              title="Move foundation to another division"
              aria-label="Move foundation to another division"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            {showMoveMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Move Division
                </div>
                {otherRegions.map((region) => {
                  const theme = REGION_THEMES[region];
                  return (
                    <button
                      key={region}
                      onClick={() => {
                        onMoveDivision(foundation.id, region);
                        setShowMoveMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                        <span>{region}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(foundation)}
            className="opacity-70 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit / Rename foundation"
            aria-label="Edit foundation"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(foundation)}
            className="opacity-70 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Delete foundation"
            aria-label="Delete foundation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoundationCard;
