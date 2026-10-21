import React, { useState } from 'react';
import { EmailImage } from '../types';
import { 
  Sparkles, 
  Link2, 
  Link2Off, 
  ExternalLink, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Maximize2,
  Sliders,
  Check,
  Globe
} from 'lucide-react';

interface Props {
  image: EmailImage;
  index: number;
  onChange: (updated: EmailImage) => void;
  onGenerateAlt: (src: string) => Promise<string>;
}

export const ImageManagerCard: React.FC<Props> = ({
  image,
  index,
  onChange,
  onGenerateAlt
}) => {
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Quick preset helper
  const applyPreset = (width: string, height: string, maxWidth: string, maxHeight: string) => {
    onChange({
      ...image,
      width,
      height,
      maxWidth,
      maxHeight
    });
  };

  const handleWidthChange = (val: string) => {
    const cleanVal = val.trim();
    let newHeight = image.height;
    
    if (aspectRatioLocked && aspectRatio && !isNaN(Number(cleanVal)) && Number(cleanVal) > 0) {
      newHeight = Math.round(Number(cleanVal) / aspectRatio).toString();
    }

    onChange({
      ...image,
      width: cleanVal,
      height: newHeight,
      // also sync maxWidth if it was previously matching
      maxWidth: cleanVal ? (cleanVal.includes('%') ? cleanVal : `${cleanVal}px`) : image.maxWidth
    });
  };

  const handleHeightChange = (val: string) => {
    const cleanVal = val.trim();
    let newWidth = image.width;

    if (aspectRatioLocked && aspectRatio && !isNaN(Number(cleanVal)) && Number(cleanVal) > 0) {
      newWidth = Math.round(Number(cleanVal) * aspectRatio).toString();
    }

    onChange({
      ...image,
      height: cleanVal,
      width: newWidth
    });
  };

  const toggleAspectLock = () => {
    if (!aspectRatioLocked) {
      const numW = parseFloat(image.width);
      const numH = parseFloat(image.height);
      if (!isNaN(numW) && !isNaN(numH) && numH > 0) {
        setAspectRatio(numW / numH);
        setAspectRatioLocked(true);
      } else {
        setAspectRatioLocked(true);
      }
    } else {
      setAspectRatioLocked(false);
    }
  };

  const resetDimensions = () => {
    onChange({
      ...image,
      width: image.originalWidth || '600',
      height: image.originalHeight || 'auto',
      maxWidth: image.originalMaxWidth || '600px',
      maxHeight: image.originalMaxHeight || 'none'
    });
  };

  const toggleLinkStatus = () => {
    if (image.hasLink && !image.removeLink) {
      // User wants to remove the link
      onChange({
        ...image,
        removeLink: true,
        hasLink: false
      });
    } else {
      // User wants to add/restore a link
      onChange({
        ...image,
        hasLink: true,
        removeLink: false,
        linkUrl: image.linkUrl || image.originalLinkUrl || 'https://'
      });
    }
  };

  const isModifiedDimensions = 
    image.width !== (image.originalWidth || '600') ||
    image.height !== (image.originalHeight || 'auto') ||
    image.maxWidth !== (image.originalMaxWidth || '600px') ||
    image.maxHeight !== (image.originalMaxHeight || 'none');

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-5">
      {/* Header with Source & Image Preview */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Thumbnail Preview with badges */}
        <div className="w-full md:w-48 flex-shrink-0 flex flex-col items-center">
          <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner relative group bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]">
            <img
              src={image.keepOriginal ? image.originalSrc : (image.newSrc || image.originalSrc)}
              alt={image.newAlt || image.originalAlt || 'preview'}
              className="max-w-full max-h-full object-contain rounded transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const target = e.currentTarget;
                if (!aspectRatio && target.naturalWidth && target.naturalHeight) {
                  setAspectRatio(target.naturalWidth / target.naturalHeight);
                }
              }}
            />
          </div>

          <div className="w-full flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500 font-semibold">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="Rendered Target Dimensions">
              {image.width || 'auto'} × {image.height || 'auto'}
            </span>
            {image.hasLink && !image.removeLink ? (
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                <Link2 className="w-2.5 h-2.5" /> Linked
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                <Link2Off className="w-2.5 h-2.5" /> No Link
              </span>
            )}
          </div>
        </div>

        {/* Source URL & Controls */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Image Source URL (src)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id={`keep-orig-${image.id}`}
                    checked={image.keepOriginal}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange({
                        ...image,
                        keepOriginal: checked,
                        newSrc: checked ? image.originalSrc : image.newSrc
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                  />
                  <label 
                    htmlFor={`keep-orig-${image.id}`} 
                    className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer"
                  >
                    Keep Original
                  </label>
                </div>
              </div>
              <input
                type="text"
                value={image.newSrc}
                disabled={image.keepOriginal}
                onChange={(e) => {
                  onChange({
                    ...image,
                    newSrc: e.target.value,
                    keepOriginal: e.target.value === image.originalSrc
                  });
                }}
                placeholder="https://..."
                className={`w-full p-2.5 text-xs font-mono border rounded-xl transition-all focus:outline-none ${
                  image.keepOriginal
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Alt-Text input with AI Suggest */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Alt-Text (Accessibility & Screen Readers)
              </label>
              <button
                type="button"
                disabled={isGeneratingAlt}
                onClick={async () => {
                  setIsGeneratingAlt(true);
                  try {
                    const src = image.newSrc || image.originalSrc;
                    const alt = await onGenerateAlt(src);
                    onChange({
                      ...image,
                      newAlt: alt
                    });
                  } finally {
                    setIsGeneratingAlt(false);
                  }
                }}
                className="text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                {isGeneratingAlt ? 'Generating...' : 'AI Suggest Alt'}
              </button>
            </div>
            <input
              type="text"
              value={image.newAlt}
              onChange={(e) => onChange({ ...image, newAlt: e.target.value })}
              placeholder="e.g. Healthcare facility exterior under clear sky"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Sizing & Dimensions Control Block */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Dimension Controls (Width, Height, Max-Width, Max-Height)
            </span>
            {isModifiedDimensions && (
              <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full">
                Customized
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAspectLock}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                aspectRatioLocked
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Lock aspect ratio while adjusting width or height"
            >
              {aspectRatioLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
              <span>{aspectRatioLocked ? 'Ratio Locked' : 'Unlock Ratio'}</span>
            </button>

            {isModifiedDimensions && (
              <button
                type="button"
                onClick={resetDimensions}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1 rounded-lg transition-colors flex items-center gap-1"
                title="Reset dimensions to original template values"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* 4 Dimension Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
          {/* Width */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Width (HTML attr / px)
            </label>
            <input
              type="text"
              value={image.width}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder="e.g. 600"
              className="w-full p-2 bg-white text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Height */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Height (HTML attr / px)
            </label>
            <input
              type="text"
              value={image.height}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder="e.g. 250 or auto"
              className="w-full p-2 bg-white text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Max-Width */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Max-Width (CSS Style)
            </label>
            <input
              type="text"
              value={image.maxWidth}
              onChange={(e) => onChange({ ...image, maxWidth: e.target.value })}
              placeholder="e.g. 600px or 100%"
              className="w-full p-2 bg-white text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Max-Height */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Max-Height (CSS Style)
            </label>
            <input
              type="text"
              value={image.maxHeight}
              onChange={(e) => onChange({ ...image, maxHeight: e.target.value })}
              placeholder="e.g. 250px, auto, none"
              className="w-full p-2 bg-white text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* Quick Size Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Sizing Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('600', '250', '600px', '250px')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            Hero (600 × 250)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('600', 'auto', '600px', 'none')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            Full Width (600 × auto)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('280', 'auto', '280px', 'none')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            2-Column (280 × auto)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('200', '60', '200px', '60px')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            Logo / Nav (200 × 60)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('120', '120', '120px', '120px')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            Icon / Thumbnail (120 × 120)
          </button>
        </div>
      </div>

      {/* Hyperlink Wrapping Controls (<a href>) */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Image Hyperlink (&lt;a href&gt;)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLinkStatus}
              className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                image.hasLink && !image.removeLink
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {image.hasLink && !image.removeLink ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Clickable Link Active</span>
                </>
              ) : (
                <>
                  <Link2Off className="w-3 h-3" />
                  <span>No Link / Clickable</span>
                </>
              )}
            </button>
          </div>
        </div>

        {image.hasLink && !image.removeLink ? (
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-blue-900 uppercase tracking-wider">
                Click-Through Destination URL (href)
              </label>
              {image.linkUrl && image.linkUrl.startsWith('http') && (
                <a
                  href={image.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
                >
                  Test Link <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={image.linkUrl}
                onChange={(e) => {
                  onChange({
                    ...image,
                    linkUrl: e.target.value,
                    hasLink: true,
                    removeLink: false
                  });
                }}
                placeholder="https://giving.dignityhealth.org/..."
                className="flex-1 p-2 bg-white text-xs font-mono text-blue-950 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...image,
                    linkUrl: '',
                    hasLink: false,
                    removeLink: true
                  });
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                title="Remove <a> tag wrapping this image"
              >
                Remove Link
              </button>
            </div>
            <p className="text-[10px] text-blue-600 font-medium">
              This image will be wrapped in an accessible &lt;a href="..." target="_blank"&gt; anchor tag.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">
              Image is currently static (no &lt;a href&gt; anchor link wrapping it).
            </span>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...image,
                  hasLink: true,
                  removeLink: false,
                  linkUrl: image.linkUrl || 'https://'
                });
              }}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Link2 className="w-3.5 h-3.5" /> + Add Clickable Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageManagerCard;
