import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, AlertTriangle, ShieldCheck, Edit, Trash2, HeartPulse, History } from 'lucide-react';
import { DailyStats, Claim } from '../types';
import { useOutletContext } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContextType {
  dailyData: DailyStats[];
  claims: Claim[];
  onAddClaim: () => void;
  onUpdateReputation: (status: string) => Promise<void>;
  onEditClaim: (claim: Claim) => void;
  onDeleteClaim: (id: string) => Promise<void>;
}

export default function Health() {
  const { dailyData, claims, onAddClaim, onUpdateReputation, onEditClaim, onDeleteClaim } = useOutletContext<ContextType>();
  const latestStats = (dailyData[dailyData.length - 1] || { claims: 0, reputation: '绿色店铺' }) as DailyStats;

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
           <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">账号申诉/纠纷处理</h1>
              <p className="v2-header-subtitle">监控店铺信誉、处理退款纠纷与申诉记录</p>
            </div>
          </div>
          <button 
            onClick={onAddClaim}
            className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>记录新纠纷</span>
          </button>
        </header>

        <div className="v2-stats-grid">
           <div className="v2-stat-card bg-emerald-500/5 border-emerald-500/20 col-span-1 md:col-span-2">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                     <ShieldCheck className="w-6 h-6 text-emerald-500" />
                   </div>
                   <div>
                     <span className="v2-stat-label text-emerald-500">店铺信誉状态</span>
                     <div className="v2-stat-value text-white">{latestStats.reputation || '绿色店铺'}</div>
                   </div>
                </div>
                <Select 
                  defaultValue={latestStats.reputation} 
                  onValueChange={(val) => onUpdateReputation(val)}
                >
                  <SelectTrigger className="w-40 bg-slate-900/50 border-slate-700 text-xs h-9 text-slate-300">
                    <SelectValue placeholder="更新状态" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="绿色店铺">绿色店铺</SelectItem>
                    <SelectItem value="领导者店铺">领导者店铺</SelectItem>
                    <SelectItem value="白银店铺">白银店铺</SelectItem>
                    <SelectItem value="黄金店铺">黄金店铺</SelectItem>
                    <SelectItem value="铂金店铺">铂金店铺</SelectItem>
                    <SelectItem value="Verde (极佳)">Verde (极佳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
           </div>
           <div className="v2-stat-card bg-rose-500/10 border-rose-500/20">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                   <AlertTriangle className="w-6 h-6 text-rose-500" />
                 </div>
                 <div>
                    <span className="v2-stat-label text-rose-500">待处理纠纷 (Reclamos)</span>
                    <div className="v2-stat-value text-rose-400">{latestStats.claims}</div>
                 </div>
              </div>
           </div>
        </div>

        <div className="v2-card mt-6">
          <div className="v2-card-header flex justify-between items-center">
            <h2 className="v2-card-title">
              <History className="w-4 h-4 text-emerald-400" />
              近期纠纷处理记录
            </h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">共 {claims.length} 条记录</span>
          </div>
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">订单号</th>
                  <th className="v2-table-th">商品信息</th>
                  <th className="v2-table-th">客户诉求</th>
                  <th className="v2-table-th">处理方案</th>
                  <th className="v2-table-th">处理时间</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {claims.length > 0 ? (
                  claims.map((claim) => (
                    <tr key={claim.id} className="v2-table-tr group">
                      <td className="v2-table-td text-sky-400 font-mono font-bold tracking-tight">{claim.orderId}</td>
                      <td className="v2-table-td text-slate-300 max-w-[200px] truncate">{claim.productName}</td>
                      <td className="v2-table-td">
                         <span className="text-rose-400 font-medium">{claim.request}</span>
                      </td>
                      <td className="v2-table-td">
                         <div className="flex items-center gap-1.5 text-emerald-400">
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           {claim.handlingMethod}
                         </div>
                      </td>
                      <td className="v2-table-td text-slate-500">{claim.handlingTime}</td>
                      <td className="v2-table-td text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => onEditClaim(claim)}
                            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onDeleteClaim(claim.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-500 italic">暂无纠纷记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

