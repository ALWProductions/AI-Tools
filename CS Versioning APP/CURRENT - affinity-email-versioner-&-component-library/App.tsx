import React, { useState, useEffect, useCallback } from 'react';
import { 
  AffinityGroup, 
  EmailLink, 
  EmailImage, 
  EmailSection, 
  Foundation, 
  ComponentType, 
  EmailComponent 
} from './types';
import AffinityBrandToggle from './components/AffinityBrandToggle';
import FileUploadZone from './components/FileUploadZone';
import DivisionColumn from './components/DivisionColumn';
import AddFoundationModal from './components/AddFoundationModal';
import EditFoundationModal from './components/EditFoundationModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ToastContainer, { ToastMessage } from './components/Toast';
import ImageManagerCard from './components/ImageManagerCard';
import { applyEmailConfigurations } from './utils/htmlProcessor';
import { analyzeEmailStructure, generateAltText, mergeEmailContent } from './services/geminiService';
import { 
  Settings2, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Code as CodeIcon, 
  Download, 
  ArrowRight, 
  Loader2, 
  Trash2, 
  RotateCcw, 
  Library, 
  PlusCircle, 
  FolderOpen, 
  Save, 
  CheckCircle, 
  FileCode, 
  X, 
  Plus, 
  Search,
  Edit3,
  ArrowRightLeft,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ChevronDown
} from 'lucide-react';

const PREDEFINED_FOUNDATIONS: Record<AffinityGroup, string[]> = {
  [AffinityGroup.CHI]: ["St. Luke's", "St. Joseph", "St. Joseph KY"],
  [AffinityGroup.DIGNITY]: ["St. Rose Health", "Sequoia", "St. Mary Long Beach", "French"],
  [AffinityGroup.MOUNTAIN]: [
    "St. Anthony Health", 
    "St. Anthony North", 
    "St. Anthony Summit", 
    "St. Mary Corwin", 
    "St. Thomas More", 
    "St. Catherine", 
    "Mercy", 
    "Holy Cross", 
    "Penrose-St. Francis"
  ]
};

const DIVISION_CONFIG: Record<AffinityGroup, { name: string; dotColor: string; bgBadge: string; textBadge: string; borderBadge: string }> = {
  [AffinityGroup.CHI]: {
    name: 'CHI',
    dotColor: 'bg-blue-600',
    bgBadge: 'bg-blue-50',
    textBadge: 'text-blue-700',
    borderBadge: 'border-blue-200'
  },
  [AffinityGroup.DIGNITY]: {
    name: 'Dignity Health',
    dotColor: 'bg-orange-500',
    bgBadge: 'bg-orange-50',
    textBadge: 'text-orange-700',
    borderBadge: 'border-orange-200'
  },
  [AffinityGroup.MOUNTAIN]: {
    name: 'Mountain',
    dotColor: 'bg-purple-700',
    bgBadge: 'bg-purple-50',
    textBadge: 'text-purple-700',
    borderBadge: 'border-purple-200'
  }
};

const App: React.FC = () => {
  const [sourceHtml, setSourceHtml] = useState('');
  const [targetHtml, setTargetHtml] = useState('');
  const [affinityGroup, setAffinityGroup] = useState<AffinityGroup>(AffinityGroup.CHI);
  
  // Library State
  const [foundations, setFoundations] = useState<Foundation[]>(() => {
    const saved = localStorage.getItem('email_foundations_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed parsing stored foundations", e);
      }
    }
    
    // Seed foundations if empty
    const initial: Foundation[] = [];
    Object.entries(PREDEFINED_FOUNDATIONS).forEach(([group, names]) => {
      names.forEach(name => {
        initial.push({
          id: Math.random().toString(36).substr(2, 9),
          name,
          region: group as AffinityGroup,
          components: []
        });
      });
    });
    return initial;
  });

  const [activeFoundation, setActiveFoundation] = useState<Foundation | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDefaultRegion, setAddModalDefaultRegion] = useState<AffinityGroup>(AffinityGroup.CHI);
  const [editingFoundation, setEditingFoundation] = useState<Foundation | null>(null);
  const [deletingFoundation, setDeletingFoundation] = useState<Foundation | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Manual Component Entry State
  const [showAddElement, setShowAddElement] = useState(false);
  const [newElem, setNewElem] = useState<Partial<EmailComponent>>({ 
    type: ComponentType.SIGNATURE, 
    label: '', 
    content: '' 
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, type: ToastMessage['type'] = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [links, setLinks] = useState<EmailLink[]>([]);
  const [images, setImages] = useState<EmailImage[]>([]);
  const [rawMergedHtml, setRawMergedHtml] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'library'>('upload');
  const [finalHtml, setFinalHtml] = useState('');

  useEffect(() => {
    localStorage.setItem('email_foundations_v5', JSON.stringify(foundations));
  }, [foundations]);

  // Keep activeFoundation in sync when foundations state updates
  useEffect(() => {
    if (activeFoundation) {
      const current = foundations.find(f => f.id === activeFoundation.id);
      if (current) {
        setActiveFoundation(current);
      } else {
        setActiveFoundation(null);
      }
    }
  }, [foundations]);

  const parseResources = useCallback((html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const anchorTags = Array.from(doc.querySelectorAll('a'));
    const extractedLinks: EmailLink[] = anchorTags.map((a, i) => ({
      id: `link-${i}`,
      originalUrl: a.getAttribute('href') || '',
      currentUrl: a.getAttribute('href') || '',
      isDeleted: false,
      isReplaced: false,
      text: a.innerText.trim() || 'Link Text'
    })).filter((l) => l.originalUrl && l.originalUrl !== '#' && l.originalUrl.startsWith('http'))
       .filter((l, i, self) => i === self.findIndex((t) => t.originalUrl === l.originalUrl));

    const imgTags = Array.from(doc.querySelectorAll('img'));
    const extractedImages: EmailImage[] = imgTags.map((img, i) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const widthAttr = img.getAttribute('width') || '';
      const heightAttr = img.getAttribute('height') || '';

      // Parse inline styles for width, height, max-width, max-height
      const styleStr = img.getAttribute('style') || '';
      let styleWidth = '';
      let styleHeight = '';
      let styleMaxWidth = '';
      let styleMaxHeight = '';

      styleStr.split(';').forEach(rule => {
        const colonIdx = rule.indexOf(':');
        if (colonIdx > 0) {
          const key = rule.slice(0, colonIdx).trim().toLowerCase();
          const val = rule.slice(colonIdx + 1).trim();
          if (key === 'width') styleWidth = val.replace('px', '');
          if (key === 'height') styleHeight = val.replace('px', '');
          if (key === 'max-width') styleMaxWidth = val;
          if (key === 'max-height') styleMaxHeight = val;
        }
      });

      const initialWidth = widthAttr || styleWidth || '600';
      const initialHeight = heightAttr || styleHeight || 'auto';
      const initialMaxWidth = styleMaxWidth || (initialWidth ? `${initialWidth}px` : '100%');
      const initialMaxHeight = styleMaxHeight || (initialHeight !== 'auto' && initialHeight ? `${initialHeight}px` : 'none');

      // Check if image is wrapped in an anchor link
      const parentAnchor = img.closest('a');
      const anchorHref = parentAnchor?.getAttribute('href') || '';
      const hasValidLink = !!anchorHref && anchorHref !== '#';

      return {
        id: `img-${i}`,
        originalSrc: src,
        newSrc: src,
        originalAlt: alt,
        newAlt: alt,
        keepOriginal: true,
        width: initialWidth,
        height: initialHeight,
        maxWidth: initialMaxWidth,
        maxHeight: initialMaxHeight,
        originalWidth: initialWidth,
        originalHeight: initialHeight,
        originalMaxWidth: initialMaxWidth,
        originalMaxHeight: initialMaxHeight,
        hasLink: hasValidLink,
        linkUrl: hasValidLink ? anchorHref : '',
        originalLinkUrl: anchorHref,
        removeLink: false
      };
    }).filter(img => img.originalSrc);

    setLinks(extractedLinks);
    setImages(extractedImages);
  }, []);

  const handleProcess = async () => {
    if (!sourceHtml || !targetHtml) return;
    setIsProcessing(true);
    try {
      const headMatch = sourceHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      const sourceHead = headMatch ? headMatch[1] : '';

      const sourceSections = await analyzeEmailStructure(sourceHtml);
      const targetSections = await analyzeEmailStructure(targetHtml);

      const chosenComponents = activeFoundation?.components.filter(c => selectedElementIds.includes(c.id)) || [];

      let merged = await mergeEmailContent(sourceSections, targetSections, chosenComponents, sourceHead, affinityGroup);
      setRawMergedHtml(merged);
      
      const processed = applyEmailConfigurations(merged, links, images);
      setFinalHtml(processed);
      setStep('configure');
    } catch (err) {
      console.error(err);
      addToast("Versioning Engine Error", "Failed to transfer email content. Check API configuration or templates.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpdate = (updatedImage: EmailImage, index: number) => {
    const updated = [...images];
    updated[index] = updatedImage;
    setImages(updated);
    if (rawMergedHtml) {
      setFinalHtml(applyEmailConfigurations(rawMergedHtml, links, updated));
    }
  };

  const handleLinkUpdate = (updatedLinks: EmailLink[]) => {
    setLinks(updatedLinks);
    if (rawMergedHtml) {
      setFinalHtml(applyEmailConfigurations(rawMergedHtml, updatedLinks, images));
    }
  };

  const goToPreview = () => {
    const processed = applyEmailConfigurations(rawMergedHtml || finalHtml, links, images);
    setFinalHtml(processed);
    setStep('preview');
  };

  const addElementToFoundation = () => {
    if (!activeFoundation || !newElem.label || !newElem.content) return;
    const component: EmailComponent = {
      id: Math.random().toString(36).substr(2, 9),
      type: newElem.type as ComponentType,
      label: newElem.label,
      content: newElem.content
    };
    const updated = foundations.map(f => f.id === activeFoundation.id ? { ...f, components: [...f.components, component] } : f);
    setFoundations(updated);
    setActiveFoundation({ ...activeFoundation, components: [...activeFoundation.components, component] });
    setNewElem({ type: ComponentType.SIGNATURE, label: '', content: '' });
    setShowAddElement(false);
    addToast("Component Added", `Saved "${component.label}" to ${activeFoundation.name}`);
  };

  const handleAddFoundation = (name: string, region: AffinityGroup) => {
    const newF: Foundation = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      region,
      components: []
    };
    setFoundations(prev => [...prev, newF]);
    setActiveFoundation(newF);
    addToast("Foundation Added", `"${name}" added to ${region} division`);
  };

  const handleMoveDivision = (id: string, newRegion: AffinityGroup) => {
    const targetFoundation = foundations.find(f => f.id === id);
    if (!targetFoundation) return;
    if (targetFoundation.region === newRegion) return;

    const oldRegion = targetFoundation.region;
    const updated = foundations.map(f => f.id === id ? { ...f, region: newRegion } : f);
    setFoundations(updated);

    if (activeFoundation?.id === id) {
      setActiveFoundation({ ...activeFoundation, region: newRegion });
    }
    addToast("Division Reassigned", `Moved "${targetFoundation.name}" from ${oldRegion} to ${newRegion}`);
  };

  const handleSaveEdit = (id: string, updatedName: string, updatedRegion: AffinityGroup) => {
    const updated = foundations.map(f => f.id === id ? { ...f, name: updatedName, region: updatedRegion } : f);
    setFoundations(updated);
    if (activeFoundation?.id === id) {
      setActiveFoundation(prev => prev ? { ...prev, name: updatedName, region: updatedRegion } : null);
    }
    addToast("Foundation Updated", `Saved changes for "${updatedName}"`);
  };

  const handleDeleteConfirm = () => {
    if (!deletingFoundation) return;
    const name = deletingFoundation.name;
    setFoundations(prev => prev.filter(f => f.id !== deletingFoundation.id));
    if (activeFoundation?.id === deletingFoundation.id) {
      setActiveFoundation(null);
    }
    addToast("Foundation Deleted", `Removed "${name}" from library`, 'info');
    setDeletingFoundation(null);
  };

  const handleResetToDefaults = () => {
    const initial: Foundation[] = [];
    Object.entries(PREDEFINED_FOUNDATIONS).forEach(([group, names]) => {
      names.forEach(name => {
        initial.push({
          id: Math.random().toString(36).substr(2, 9),
          name,
          region: group as AffinityGroup,
          components: []
        });
      });
    });
    setFoundations(initial);
    setActiveFoundation(null);
    addToast("Library Reset", "Restored standard healthcare foundation divisions");
    setShowResetConfirm(false);
  };

  const downloadHtml = () => {
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `versioned_${affinityGroup.toLowerCase()}_${Date.now()}.html`;
    link.click();
  };

  const existingFoundationNames = foundations.map(f => f.name);

  const chiCount = foundations.filter(f => f.region === AffinityGroup.CHI).length;
  const dignityCount = foundations.filter(f => f.region === AffinityGroup.DIGNITY).length;
  const mountainCount = foundations.filter(f => f.region === AffinityGroup.MOUNTAIN).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 sticky top-0 z-50 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl shadow-sm text-white">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Affinity Email Engine
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Regional Healthcare Versioning & Library
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            id="nav-library-btn"
            onClick={() => setStep('library')} 
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition-all ${
              step === 'library' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Library className="w-4 h-4" /> 
            <span>Foundation Library</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${step === 'library' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-700'}`}>
              {foundations.length}
            </span>
          </button>

          {step !== 'upload' && (
            <button 
              id="nav-reset-tool-btn"
              onClick={() => { setStep('upload'); setFinalHtml(''); }} 
              className="px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Versioner</span>
            </button>
          )}

          {step === 'configure' && (
            <button 
              id="nav-spotcheck-btn"
              onClick={goToPreview} 
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Spot Check <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {step === 'library' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">Foundation & Division Library</h2>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                    {foundations.length} Total
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Manage regional foundations across CHI, Dignity, and Mountain divisions. Add new foundations or reassign divisions when branding changes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="add-foundation-main-btn"
                  onClick={() => {
                    setAddModalDefaultRegion(AffinityGroup.CHI);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Foundation
                </button>

                <button
                  id="reset-library-btn"
                  onClick={() => setShowResetConfirm(true)}
                  className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Reset to default healthcare foundations"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Division Pills */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter foundations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:inline">
                  Divisions:
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  CHI: {chiCount}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Dignity: {dignityCount}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-700" />
                  Mountain: {mountainCount}
                </span>
              </div>
            </div>

            {/* 3 Division Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[AffinityGroup.CHI, AffinityGroup.DIGNITY, AffinityGroup.MOUNTAIN].map((group) => (
                <DivisionColumn
                  key={group}
                  group={group}
                  foundations={foundations.filter(f => f.region === group)}
                  activeFoundation={activeFoundation}
                  onSelectFoundation={(f) => setActiveFoundation(f)}
                  onEditFoundation={(f) => setEditingFoundation(f)}
                  onDeleteFoundation={(f) => setDeletingFoundation(f)}
                  onMoveDivision={handleMoveDivision}
                  onAddFoundationToRegion={(region) => {
                    setAddModalDefaultRegion(region);
                    setShowAddModal(true);
                  }}
                  onDropFoundation={(foundationId, targetRegion) => {
                    handleMoveDivision(foundationId, targetRegion);
                  }}
                  searchQuery={searchQuery}
                />
              ))}
            </div>

            {/* Active Foundation Detail Panel */}
            {activeFoundation && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-3 duration-300 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/80 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{activeFoundation.name}</h3>
                        <button
                          onClick={() => setEditingFoundation(activeFoundation)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-200/50 transition-colors"
                          title="Rename or reassign division"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Division Switcher Dropdown in Detail Header */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Division:
                        </span>
                        <div className="relative inline-block">
                          <select
                            value={activeFoundation.region}
                            onChange={(e) => handleMoveDivision(activeFoundation.id, e.target.value as AffinityGroup)}
                            className="text-xs font-bold py-0.5 pl-2 pr-6 rounded-md border border-slate-200 bg-white text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 appearance-none"
                          >
                            {Object.values(AffinityGroup).map((grp) => (
                              <option key={grp} value={grp}>
                                {grp} Division ({DIVISION_CONFIG[grp].name})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowAddElement(true)} 
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Component
                    </button>
                    <button
                      onClick={() => setActiveFoundation(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                      title="Close panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {activeFoundation.components.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                      <FileCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No components attached to {activeFoundation.name}</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Add reusable email blocks such as leadership signatures, logos, or customized footer disclosures for this foundation.
                      </p>
                      <button 
                        onClick={() => setShowAddElement(true)} 
                        className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create First Component
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeFoundation.components.map(comp => (
                        <div key={comp.id} className="p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {comp.type}
                              </span>
                              <button 
                                onClick={() => {
                                  const updated = foundations.map(f => 
                                    f.id === activeFoundation.id 
                                      ? { ...f, components: f.components.filter(c => c.id !== comp.id) } 
                                      : f
                                  );
                                  setFoundations(updated);
                                  setActiveFoundation({ 
                                    ...activeFoundation, 
                                    components: activeFoundation.components.filter(c => c.id !== comp.id) 
                                  });
                                  addToast("Component Removed", `Deleted "${comp.label}"`, 'info');
                                }} 
                                className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                                title="Remove component"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 mb-2 truncate" title={comp.label}>
                              {comp.label}
                            </h4>
                          </div>
                          <div className="bg-slate-900 p-3 rounded-lg text-[10px] h-24 overflow-auto font-mono text-emerald-400 scrollbar-thin scrollbar-thumb-slate-700">
                            {comp.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'upload' && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">1. Target Branding Division</h2>
              <AffinityBrandToggle selected={affinityGroup} onChange={setAffinityGroup} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">2. Input Templates</h2>
                <div className="space-y-4">
                  <FileUploadZone 
                    label="Base Template" 
                    description="The main structure where content will be transferred to." 
                    onFileSelect={setTargetHtml} 
                    hasFile={!!targetHtml} 
                  />
                  <FileUploadZone 
                    label="Versioned Template" 
                    description="The template containing the content to be copied." 
                    onFileSelect={(c) => { setSourceHtml(c); if(c) parseResources(c); }} 
                    hasFile={!!sourceHtml} 
                  />
                </div>
              </div>
              
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-900 mb-4">3. Foundation Component Selection</h2>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex-1 flex flex-col">
                  {activeFoundation ? (
                    <>
                      <div className="flex items-center justify-between mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-xs text-blue-950">Foundation: {activeFoundation.name}</p>
                            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                              {activeFoundation.region} Division
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setStep('library')} 
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider"
                        >
                          Change Foundation
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Choose Reusable Elements to Inject:
                        </p>
                        {activeFoundation.components.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                            {activeFoundation.components.map(c => (
                              <label 
                                key={c.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                  selectedElementIds.includes(c.id) 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={selectedElementIds.includes(c.id)}
                                  onChange={() => {
                                    if (selectedElementIds.includes(c.id)) {
                                      setSelectedElementIds(selectedElementIds.filter(id => id !== c.id));
                                    } else {
                                      setSelectedElementIds([...selectedElementIds, c.id]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded accent-blue-500"
                                />
                                <div>
                                  <p className="text-xs font-bold">{c.label}</p>
                                  <p className={`text-[9px] font-black uppercase tracking-wider ${
                                    selectedElementIds.includes(c.id) ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {c.type}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                            <p className="text-xs text-slate-400">No reusable elements stored for {activeFoundation.name}.</p>
                            <button 
                              onClick={() => setStep('library')} 
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase mt-2 inline-block"
                            >
                              Add components in library
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <Library className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-xs font-semibold text-slate-600 max-w-xs mb-3">
                        Select a foundation from your regional library to inject brand-specific signatures and logos.
                      </p>
                      <button 
                        onClick={() => setStep('library')} 
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                      >
                        Open Foundation Library
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-10">
              <button 
                id="run-engine-btn"
                disabled={!sourceHtml || !targetHtml || isProcessing} 
                onClick={handleProcess} 
                className="px-12 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-base flex items-center gap-3 shadow-lg transition-all hover:scale-102 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Transferring Content...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" /> Run Versioning Engine
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Link Management ({links.length} links detected)
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {links.map((link, idx) => (
                  <div key={link.id} className="p-4 border border-slate-200/80 rounded-xl bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="truncate">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5">{link.text}</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{link.originalUrl}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const nl = [...links];
                          nl[idx].isDeleted = !nl[idx].isDeleted;
                          if (nl[idx].isDeleted) nl[idx].isReplaced = false;
                          handleLinkUpdate(nl);
                        }} 
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wider ${
                          link.isDeleted 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        Delete (#)
                      </button>
                      <button 
                        onClick={() => {
                          const nl = [...links];
                          nl[idx].isReplaced = !nl[idx].isReplaced;
                          if (nl[idx].isReplaced) nl[idx].isDeleted = false;
                          handleLinkUpdate(nl);
                        }} 
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wider ${
                          link.isReplaced 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                      >
                        Replace
                      </button>
                    </div>
                    {link.isReplaced && (
                      <div className="animate-in slide-in-from-top-1 duration-150">
                        <label className="text-[9px] font-bold text-emerald-700 uppercase mb-1 block">New Destination URL</label>
                        <input 
                          type="text" 
                          placeholder="https://..." 
                          value={link.currentUrl} 
                          onChange={(e) => {
                            const nl = [...links];
                            nl[idx].currentUrl = e.target.value;
                            handleLinkUpdate(nl);
                          }} 
                          className="w-full p-2 text-xs border border-emerald-300 rounded-lg bg-emerald-50/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Image Asset Management Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Image Asset Management ({images.length} images)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {images.filter(i => i.hasLink && !i.removeLink).length} Linked
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {images.filter(i => !i.keepOriginal).length} Replaced
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-slate-50/30">
                {images.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    <p className="text-xs text-slate-400">No images detected in this email template.</p>
                  </div>
                ) : (
                  images.map((img, idx) => (
                    <ImageManagerCard
                      key={img.id}
                      image={img}
                      index={idx}
                      onChange={(updated) => handleImageUpdate(updated, idx)}
                      onGenerateAlt={generateAltText}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Bottom Floating/Fixed Action Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-slate-900">Finished configuring links and image blocks?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All width, height, max-width, max-height styles, and image hyperlinks will be applied to the output HTML.
                </p>
              </div>

              <button
                onClick={goToPreview}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-95 cursor-pointer"
              >
                Proceed to Production Spot Check <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in zoom-in-95 duration-200 h-full flex flex-col">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl flex flex-col h-[750px]">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CodeIcon className="w-4 h-4 text-slate-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Production Spot Check</h3>
                </div>
                <button 
                  onClick={downloadHtml} 
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 font-bold text-xs transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" /> Export Production HTML
                </button>
              </div>
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r border-slate-800 flex flex-col overflow-hidden bg-slate-900">
                  <div className="bg-slate-950 text-slate-400 px-4 py-2 text-[9px] font-black uppercase tracking-wider border-b border-slate-800">
                    Source Code (HTML)
                  </div>
                  <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                    <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre min-w-max">
                      <code>{finalHtml}</code>
                    </pre>
                  </div>
                </div>
                <div className="flex flex-col bg-slate-100 overflow-hidden">
                  <div className="bg-white text-slate-400 px-4 py-2 text-[9px] font-black uppercase tracking-wider border-b border-slate-200">
                    Live Rendering Preview
                  </div>
                  <iframe title="Live Preview" srcDoc={finalHtml} className="flex-1 w-full bg-white shadow-inner" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Foundation Modal */}
      <AddFoundationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddFoundation}
        defaultRegion={addModalDefaultRegion}
        existingNames={existingFoundationNames}
      />

      {/* Edit Foundation Modal */}
      <EditFoundationModal
        isOpen={!!editingFoundation}
        onClose={() => setEditingFoundation(null)}
        foundation={editingFoundation}
        onSave={handleSaveEdit}
        existingNames={existingFoundationNames}
      />

      {/* Delete Foundation Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingFoundation}
        onClose={() => setDeletingFoundation(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deletingFoundation?.name}"?`}
        message={`Are you sure you want to remove this foundation from the ${deletingFoundation?.region} division? All attached reusable components will also be deleted.`}
        confirmLabel="Delete Foundation"
      />

      {/* Reset Library Confirm Modal */}
      <DeleteConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetToDefaults}
        title="Reset Foundation Library to Defaults?"
        message="This will restore the standard initial healthcare foundations across CHI, Dignity, and Mountain divisions."
        confirmLabel="Reset Library"
      />

      {/* Manual Component Entry Modal */}
      {showAddElement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Add Component to {activeFoundation?.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {activeFoundation?.region} Division Library Block
                </p>
              </div>
              <button 
                onClick={() => setShowAddElement(false)} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Component Label
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Signature - Dr. Sarah Jenkins" 
                    value={newElem.label} 
                    onChange={e => setNewElem({ ...newElem, label: e.target.value })} 
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold focus:outline-none focus:border-slate-900 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Component Type
                  </label>
                  <select 
                    value={newElem.type} 
                    onChange={e => setNewElem({ ...newElem, type: e.target.value as ComponentType })} 
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                  >
                    {Object.values(ComponentType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Raw HTML Code Snippet
                </label>
                <textarea 
                  value={newElem.content} 
                  onChange={e => setNewElem({ ...newElem, content: e.target.value })} 
                  className="w-full p-4 border border-slate-200 rounded-xl bg-slate-900 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs h-64 resize-none scrollbar-thin scrollbar-thumb-slate-700" 
                  placeholder="Paste reusable <table> or <tr> block here..." 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddElement(false)} 
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={addElementToFoundation} 
                disabled={!newElem.label || !newElem.content}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                Save to Foundation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
