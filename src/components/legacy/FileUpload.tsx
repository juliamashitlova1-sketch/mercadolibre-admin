import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { UploadCloud, FileType, CheckCircle2 } from 'lucide-react';
import { processMercadoLibreOrders } from '../../utils/legacy/mercadoLibreEngineV1';

export default function FileUpload({ onDataProcessed }: { onDataProcessed: (data: any) => void }) {

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const processFile = (file) => {
    setError('');
    setFileName(file.name);
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('请上传 Excel (.xlsx/.xls) 或 CSV 文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (!result || typeof result === 'string') return;
        const data = new Uint8Array(result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const processedData = processMercadoLibreOrders(rawRows);
        onDataProcessed(processedData);
      } catch (err: any) {
        setError(err.message || '解析文件时发生错误，请检查文件格式。');
      }
    };
    reader.readAsArrayBuffer(file);

  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-8 w-full max-w-2xl mx-auto border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/20'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {fileName ? (
          <CheckCircle2 className="w-16 h-16 text-green-400 mb-2" />
        ) : (
          <UploadCloud className={`w-16 h-16 ${isDragging ? 'text-blue-400' : 'text-gray-400'} mb-2`} />
        )}
        
        <h3 className="text-xl font-medium text-white">
          {fileName ? "文件已处理" : "拖拽美客多订单表格至此上传"}
        </h3>
        
        <p className="text-sm text-gray-400">
          {fileName ? `当前文件: ${fileName}` : "支持的格式: .xlsx, .xls, .csv"}
        </p>

        {error && (
          <div className="text-red-400 bg-red-400/10 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <label className="cursor-pointer mt-4 inline-flex items-center gap-2 glass-button">
          <FileType className="w-5 h-5" />
          <span>{fileName ? "重新上传" : "选择文件"}</span>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleChange}
          />
        </label>
      </div>
    </motion.div>
  );
};
