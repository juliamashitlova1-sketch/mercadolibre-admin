import React from 'react';
import { 
  Edit2, Trash2, Image as ImageIcon, 
  ChevronDown, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SkuAnalyticsDashboard from './SkuAnalyticsDashboard';
import SkuAiAnalysis from '../SkuAiAnalysis';

interface SkuTableRowProps {
  item: any;
  index: number;
  isExpanded: boolean;
  onExpand: (index: number | null) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onStatusChange: (sku: string, status: string) => void;
  onExportPdf: (sku: string) => void;
  globalSkuMetrics: any;
  mlData: any;
  visitsHistory: any;
  adsHistory: any;
  operationLogs: any[];
}

const SkuTableRow: React.FC<SkuTableRowProps> = ({
  item,
  index,
  isExpanded,
  onExpand,
  onEdit,
  onDelete,
  onStatusChange,
  onExportPdf,
  globalSkuMetrics,
  mlData,
  visitsHistory,
  adsHistory,
  operationLogs
}) => {
  const listedInv = parseInt(item.inventory, 10) || 0;
  const replenishInv = parseInt(item.replenishInventory, 10) || 0;
  const totalSales = globalSkuMetrics[item.sku]?.totalUnits || 0;
  const currentInv = listedInv - totalSales;

  return (
    <React.Fragment key={index}>
      <tr 
        className={`v2-table-tr group cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} 
        onClick={() => onExpand(isExpanded ? null : index)}
      >
        <td className="v2-table-td border-l-4 border-transparent group-hover:border-sky-500 transition-all">
          {item.imageUrl ? (
            <div className="w-11 h-11 rounded-md border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
              <img 
                 src={item.imageUrl} 
                alt="SKU Preview" 
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-md border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400">
              <ImageIcon className="w-4 h-4" />
            </div>
          )}
        </td>
        <td className="v2-table-td font-semibold text-slate-800">
          <div className="flex items-center space-x-2">
            <span>{item.sku}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
          </div>
        </td>
        <td className="v2-table-td max-w-[180px] truncate text-slate-400" title={item.productName}>{item.productName}</td>
        <td className="v2-table-td text-emerald-600 font-mono">¥{item.costRMB}</td>
        <td className="v2-table-td text-sky-600 font-mono">${item.priceMXN}</td>
        <td className="v2-table-td text-slate-600 font-mono">{listedInv}</td>
        <td className="v2-table-td text-purple-600 font-mono">{replenishInv > 0 ? `+${replenishInv}` : '-'}</td>
        <td className="v2-table-td">
          <div className="font-bold text-emerald-600 bg-emerald-50 rounded px-2.5 py-1 inline-flex items-center justify-center min-w-[40px] text-xs">
            {currentInv}
          </div>
        </td>
        <td className="v2-table-td text-slate-500">{item.listedDate}</td>
        <td className="v2-table-td">
           <select 
             value={item.status || '活跃中'} 
             onChange={(e) => onStatusChange(item.sku, e.target.value)}
             onClick={(e) => e.stopPropagation()}
             className={`text-[10px] font-bold px-2 py-1 rounded bg-white border transition-all cursor-pointer outline-none ${
               item.status === '缺货' ? 'text-rose-600 border-rose-200' : 
               item.status === '补货中' ? 'text-yellow-600 border-yellow-200' : 
               'text-emerald-600 border-emerald-200'
             }`}
           >
              <option value="活跃中">活跃中</option>
              <option value="补货中">补货中</option>
              <option value="缺货">缺货</option>
           </select>
        </td>
        <td className="v2-table-td text-right">
          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(index)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(index)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr className="bg-slate-50/50 border-b border-slate-100 relative">
            <td colSpan={11} className="p-0">
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 w-full">
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 w-full">
                    {/* Left Column: Dashboard content (60%) */}
                    <div className="xl:col-span-3 w-full" id={`sku-dashboard-${item.sku}`}>
                      <div className="v2-card bg-white p-5 border-slate-100 w-full h-full shadow-2xl">
                         <SkuAnalyticsDashboard 
                            sku={item.sku}
                            priceMXN={item.priceMXN}
                            mlData={mlData}
                            visitsHistory={visitsHistory}
                            adsHistory={adsHistory}
                         />
                      </div>
                    </div>

                    {/* Right Column: AI Analysis */}
                    <div className="xl:col-span-2">
                       <SkuAiAnalysis 
                          sku={item.sku}
                          skuName={item.productName}
                          operationLogs={operationLogs}
                        />
                    </div>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </React.Fragment>
  );
};

export default SkuTableRow;
