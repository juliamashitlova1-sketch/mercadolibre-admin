import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, AlertTriangle, ShieldCheck, Edit, Trash2, HeartPulse, History, Filter, Clock } from 'lucide-react';
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
           <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">店铺健康与纠纷管理</h1>
              <p className="v2-header-subtitle font-medium">监控店铺信誉评级，闭环处理退款纠纷与申诉</p>
            </div>
          </div>
          <button 
            onClick={onAddClaim}
            className="bg-slate-900 hover:bg-slate-800 text-white transition-all px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>记录新纠纷</span>
          </button>
        </header>

        <div className="v2-stats-grid">
           <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg col-span-1 md:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner">
                     <ShieldCheck className="w-7 h-7 text-emerald-500" />
                   </div>
                   <div>
                      <span className="v2-stat-label text-slate-400 font-bold uppercase tracking-wider">店铺当前信誉等级</span>
                      <div className="v2-stat-value text-slate-900 flex items-center gap-2">
                        {latestStats.reputation || '绿色店铺'}
                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] py-0 px-2">优秀</Badge>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">快速更新状态</span>
                  <Select 
                    defaultValue={latestStats.reputation} 
                    onValueChange={(val) => onUpdateReputation(val)}
                  >
                    <SelectTrigger className="w-40 bg-slate-50 border-slate-200 text-slate-600 text-xs h-10 font-bold rounded-xl focus:ring-emerald-500/20">
                      <SelectValue placeholder="更新状态" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl">
                      <SelectItem value="绿色店铺" className="text-xs font-bold text-emerald-600 focus:bg-emerald-50">绿色店铺</SelectItem>
                      <SelectItem value="领导者店铺" className="text-xs font-bold text-sky-600 focus:bg-sky-50">领导者店铺</SelectItem>
                      <SelectItem value="白银店铺" className="text-xs font-bold text-slate-400 focus:bg-slate-50">白银店铺</SelectItem>
                      <SelectItem value="黄金店铺" className="text-xs font-bold text-amber-500 focus:bg-amber-50">黄金店铺</SelectItem>
                      <SelectItem value="铂金店铺" className="text-xs font-bold text-indigo-600 focus:bg-indigo-50">铂金店铺</SelectItem>
                      <SelectItem value="Verde (极佳)" className="text-xs font-bold text-emerald-700 focus:bg-emerald-50">Verde (极佳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
           </div>
           <div className="v2-stat-card bg-rose-500/5 border-rose-500/20 shadow-lg">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                   <AlertTriangle className="w-7 h-7 text-rose-500" />
                 </div>
                 <div>
                    <span className="v2-stat-label text-rose-600 font-bold">待处理纠纷</span>
                    <div className="v2-stat-value text-rose-600">{latestStats.claims}</div>
                 </div>
              </div>
           </div>
        </div>

        <div className="v2-card mt-6">
          <div className="v2-card-header">
            <h2 className="v2-card-title text-slate-800">
              <History className="w-4 h-4 text-emerald-500" />
              近期纠纷处理记录明细
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">共 {claims.length} 条</span>
            </div>
          </div>
          <div className="v2-table-wrapper max-h-[600px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">订单编号</th>
                  <th className="v2-table-th">受影响商品</th>
                  <th className="v2-table-th">客户核心诉求</th>
                  <th className="v2-table-th">最终处理方案</th>
                  <th className="v2-table-th">处理完成时间</th>
                  <th className="v2-table-th text-right">操作管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.length > 0 ? (
                  claims.map((claim) => (
                    <tr key={claim.id} className="v2-table-tr group">
                      <td className="v2-table-td text-sky-600 font-mono font-bold tracking-tight">{claim.orderId}</td>
                      <td className="v2-table-td text-slate-600 max-w-[200px] truncate font-medium" title={claim.productName}>{claim.productName}</td>
                      <td className="v2-table-td">
                         <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[10px]">{claim.request}</span>
                      </td>
                      <td className="v2-table-td">
                         <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           {claim.handlingMethod}
                         </div>
                      </td>
                      <td className="v2-table-td text-slate-400">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Clock className="w-3 h-3 opacity-50" />
                          {claim.handlingTime}
                        </div>
                      </td>
                      <td className="v2-table-td text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => onEditClaim(claim)}
                            className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteClaim(claim.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-32 text-center text-slate-400 italic">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-5" />
                      <p className="text-sm font-bold opacity-60">暂无纠纷处理记录</p>
                    </td>
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
