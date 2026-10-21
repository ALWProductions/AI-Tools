
import React from 'react';
import { AffinityGroup } from '../types';

interface Props {
  selected: AffinityGroup;
  onChange: (group: AffinityGroup) => void;
}

const AffinityBrandToggle: React.FC<Props> = ({ selected, onChange }) => {
  const groups = [
    { id: AffinityGroup.CHI, label: 'CHI', sub: 'Blue/Green', color: 'bg-blue-600' },
    { id: AffinityGroup.DIGNITY, label: 'DIGNITY', sub: 'Orange/Blue', color: 'bg-orange-500' },
    { id: AffinityGroup.MOUNTAIN, label: 'MOUNTAIN', sub: 'Purple', color: 'bg-purple-700' },
  ];

  return (
    <div className="flex gap-4 mb-8">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onChange(group.id)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            selected === group.id 
              ? 'border-slate-900 bg-white shadow-lg scale-105' 
              : 'border-slate-200 bg-slate-50 opacity-60 hover:opacity-100'
          }`}
        >
          <div className={`w-full h-2 rounded-full mb-2 ${group.color}`} />
          <h3 className="font-bold text-lg">{group.label}</h3>
          <p className="text-xs text-slate-500">{group.sub}</p>
        </button>
      ))}
    </div>
  );
};

export default AffinityBrandToggle;
