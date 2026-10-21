
import React from 'react';
import { Upload, FileCode, CheckCircle } from 'lucide-react';

interface Props {
  label: string;
  description: string;
  onFileSelect: (content: string) => void;
  hasFile: boolean;
}

const FileUploadZone: React.FC<Props> = ({ label, description, onFileSelect, hasFile }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onFileSelect(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all h-64 ${
      hasFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-slate-400 bg-white'
    }`}>
      {hasFile ? (
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h4 className="font-semibold text-green-700">File Received</h4>
          <p className="text-sm text-green-600">Content parsed successfully</p>
          <button 
            onClick={() => onFileSelect('')}
            className="mt-4 text-xs font-medium text-slate-500 underline"
          >
            Replace File
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 text-slate-400 mb-4 group-hover:text-slate-600 transition-colors" />
          <h4 className="font-semibold text-slate-700 text-lg">{label}</h4>
          <p className="text-sm text-slate-500 text-center mt-2 max-w-xs">{description}</p>
          <input
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </>
      )}
    </div>
  );
};

export default FileUploadZone;
