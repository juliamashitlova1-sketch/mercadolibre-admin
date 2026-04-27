import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, AlertCircle, Check, PackageX, TrendingDown, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CargoDamage, SKUStats } from '../types';
import { getMexicoDateString } from '../lib/time';

const REASONS = ['送仓差异', '货代丢失', '退货无法二次利用'] as const;

export default function CargoDamagePage() {
  const { skuData, managedSkus } = useOutletContext<{ skuData: SKUStats[], managedSkus: any[] }>();
  const [data, setData] = useState<CargoDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<CargoDamage>>({
    date: getMexicoDateString(),
    sku: '',
    skuName: '',
    reason: '送仓差异',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('cargo_damage')
      .select('*, skuName:sku_name, skuValueCNY:sku_value_cny')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching cargo damage:', error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!currentRecord.sku || !currentRecord.date || !currentRecord.reason) {
      alert('请填写完整信息');
      return;
    }

    const payload = {
      date: currentRecord.date,
      sku: currentRecord.sku,
      sku_name: currentRecord.skuName,
      quantity: currentRecord.quantity,
      reason: currentRecord.reason,
      sku_value_cny: currentRecord.skuValueCNY
    };

    let error;
    if (currentRecord.id) {
      const { error: err } = await supabase
        .from('cargo_damage')
        .update(payload)
        .eq('id', currentRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('cargo_damage')
        .insert([payload]);
      error = err;
    }

    if (error) {
      alert('保存失败: ' + error.message);
    } else {
      setIsEditing(false);
      setCurrentRecord({
        date: getMexicoDateString(),
        sku: '',
        skuName: '',
        reason: '送仓差异',
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const { error } = await supabase.from('cargo_damage').delete().eq('id', id);
    if (error) {
      alert('删除失败');
    } else {
      fetchData();
    }
  };

  const handleSkuSelect = (sku: string) => {
    const selectedManaged = managedSkus.find(s => s.sku === sku);
    const selectedStats = skuData.find(s => s.sku === sku);
    setCurrentRecord({
      ...currentRecord,
      sku: sku,
      skuName: selectedManaged?.name || selectedStats?.skuName || ''
    });
  };

  const calculateTotalQuantity = () => data.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const calculateTotalValue = () => data.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.skuValueCNY || 0)), 0).toFixed(2);

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-rose-500 to-pink-600">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">货损支出管理</h1>
              <p className="v2-header-subtitle">记录供应链中的库存损耗与异常成本</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCurrentRecord({
                date: getMexicoDateString(),
                sku: '',
                skuName: '',
                reason: '送仓差异',
              });
              setIsEditing(true);
            }}
            className="cursor-pointer bg-rose-600 hover:bg-rose-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>记录货损</span>
          </button>
        </header>

        {isEditing && (
          <div className="v2-card bg-rose-500/5 border-rose-500/20 animate-in fade-in slide-in-from-top-4 p-6">
            <h3 className="text-sm font-bold text-rose-400 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {currentRecord.id ? '编辑记录' : '新增货损记录'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-bold text-slate-500 uppercase">货损日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="v2-input"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-bold text-slate-500 uppercase">选择 SKU</Label>
                <Select value={currentRecord.sku} onValueChange={handleSkuSelect}>
                  <SelectTrigger className="v2-input">
                    <SelectValue placeholder="选择 SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    {managedSkus.map(s => (
                      <SelectItem key={s.sku} value={s.sku}>
                        <span className="font-bold">{s.sku}</span>
                        <span className="ml-2 text-xs text-slate-500 italic">({s.name})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-bold text-slate-500 uppercase">货损数量</Label>
                <Input 
                  type="number" 
                  step="any"
                  value={currentRecord.quantity ?? ''} 
                  onChange={e => setCurrentRecord({...currentRecord, quantity: e.target.value === '' ? undefined : Number(e.target.value)})}
                  className="v2-input"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-bold text-slate-500 uppercase">单件货值 (CNY)</Label>
                <Input 
                  type="number" 
                  step="any"
                  value={currentRecord.skuValueCNY ?? ''} 
                  onChange={e => setCurrentRecord({...currentRecord, skuValueCNY: e.target.value === '' ? undefined : Number(e.target.value)})}
                  className="v2-input"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg h-9 text-xs font-bold transition-all active:scale-95">保存</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg h-9 text-xs font-bold transition-all border border-slate-700">取消</button>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
               <Label className="text-xs font-bold text-slate-500 uppercase">原因分类</Label>
               <div className="flex flex-wrap gap-2">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setCurrentRecord({...currentRecord, reason: r})}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentRecord.reason === r 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                        : 'bg-slate-800/10 border-slate-800 text-slate-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="v2-stats-grid">
            <div className="v2-stat-card bg-slate-900/50 border-slate-800">
               <span className="v2-stat-label text-slate-500">异常记录数</span>
               <div className="v2-stat-value text-white">{data.length}</div>
            </div>
            <div className="v2-stat-card bg-rose-500/5 border-rose-500/20">
               <span className="v2-stat-label text-rose-500">总货损件数</span>
               <div className="v2-stat-value text-rose-400">{calculateTotalQuantity()} units</div>
            </div>
            <div className="v2-stat-card bg-red-500/10 border-red-500/30">
               <div className="flex justify-between items-center">
                 <div>
                   <span className="v2-stat-label text-red-500">损失估值 (CNY)</span>
                   <div className="v2-stat-value text-red-400">¥{calculateTotalValue()}</div>
                 </div>
                 <TrendingDown className="w-6 h-6 text-red-500/20" />
               </div>
            </div>
            <div className="v2-stat-card bg-slate-900/50 border-slate-800">
               <span className="v2-stat-label text-slate-500">最近活跃</span>
               <div className="v2-stat-value text-slate-400 text-sm">{data[0]?.date}</div>
            </div>
          </div>
        )}

        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title">
              <ClipboardList className="w-4 h-4 text-rose-400" />
              货损明细清单
            </h2>
          </div>
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">日期</th>
                  <th className="v2-table-th">货损 SKU</th>
                  <th className="v2-table-th">数量</th>
                  <th className="v2-table-th">原因分类</th>
                  <th className="v2-table-th">折合损失 (CNY)</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                       <Loader2 className="w-5 h-5 animate-spin mx-auto text-rose-400" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-500 italic">暂无记录</td>
                  </tr>
                ) : data.map((record) => (
                  <tr key={record.id} className="v2-table-tr group">
                    <td className="v2-table-td text-slate-400">{record.date}</td>
                    <td className="v2-table-td">
                       <div className="flex flex-col">
                         <span className="text-rose-400 font-bold">{record.sku}</span>
                         <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{record.skuName}</span>
                       </div>
                    </td>
                    <td className="v2-table-td text-white font-mono font-bold">{record.quantity}</td>
                    <td className="v2-table-td">
                       <div className="flex items-center gap-1 text-slate-400">
                         <AlertCircle className="w-3 h-3 text-rose-500/60" />
                         {record.reason}
                       </div>
                    </td>
                    <td className="v2-table-td">
                      <span className="font-bold text-rose-500">
                         ¥{(Number(record.quantity || 0) * Number(record.skuValueCNY || 0)).toFixed(2)}
                      </span>
                    </td>
                    <td className="v2-table-td text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => { setCurrentRecord(record); setIsEditing(true); }}
                          className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

