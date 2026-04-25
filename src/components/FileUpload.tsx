import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  description?: string;
}

export default function FileUpload({ onFileSelect, accept = ".xlsx, .xls", label = "上传 Excel 文件", description = "支持 Mercado Libre 导出的原始订单报表" }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 group cursor-pointer ${
          isDragActive 
            ? "border-sky-500 bg-sky-500/10" 
            : "border-slate-200 hover:border-sky-400 hover:bg-slate-50/50"
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept={accept}
          onChange={handleFileChange}
        />
        
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div 
              key="file-info"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">{file.name}</div>
              <div className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile(); }}
                className="mt-2 text-xs font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 移除并重新选择
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="upload-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">{label}</div>
              <div className="text-[11px] text-slate-500">{description}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
