import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, Check, CreditCard, DollarSign, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FakeOrder, SKUStats } from '../types';
import { USD_TO_MXN, MXN_TO_CNY } from '../constants';
import { getMexicoDateString } from '../lib/time';

export default function FakeOrders() {
  const { skuData, managedSkus } = useOutletContext<{ skuData: SKUStats[], managedSkus: any[] }>();
  const [data, setData] = useState<FakeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<FakeOrder>>({
    date: getMexicoDateString(),
    sku: '',
    skuName: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('fake_orders')
      .select('*, reviewFeeCNY:review_fee_cny, refundAmountUSD:refund_amount_usd, skuName:sku_name')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching fake orders:', error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!currentRecord.sku || !currentRecord.date) {
      alert('请填写完整信息');
      return;
    }

    const payload = {
      date: currentRecord.date,
      sku: currentRecord.sku,
      sku_name: currentRecord.skuName,
      review_fee_cny: currentRecord.reviewFeeCNY,
      refund_amount_usd: currentRecord.refundAmountUSD
    };

    let error;
    if (currentRecord.id) {
      const { error: err } = await supabase
        .from('fake_orders')
        .update(payload)
        .eq('id', currentRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('fake_orders')
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
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const { error } = await supabase.from('fake_orders').delete().eq('id', id);
    if (error) {
      alert('删除失败');
    } else {
      fetchData();
    }
  };

  const calculateActualCostTotal = () => {
    return data.reduce((acc, curr) => {
        const fee = curr.reviewFeeCNY || 0;
        const refund = (curr.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY;
        return acc + (fee - refund);
    }, 0).toFixed(2);
  };

  const calculateTotalFees = () => {
    return data.reduce((acc, curr) => acc + (curr.reviewFeeCNY || 0), 0).toFixed(2);
  };

  const calculateTotalRefundsUSD = () => {
    return data.reduce((acc, curr) => acc + (curr.refundAmountUSD || 0), 0).toFixed(2);
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

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-indigo-500 to-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">刷单/测评支出管理</h1>
              <p className="v2-header-subtitle">追踪并核算站外测评支出的实际成本</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCurrentRecord({
                date: getMexicoDateString(),
                sku: '',
                skuName: '',
              });
              setIsEditing(true);
            }}
            className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white transition-all px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20 active:scale-95 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>新增记录</span>
          </button>
        </header>

        {isEditing && (
          <div className="v2-card bg-white/40 border-indigo-500/20 animate-slide-up p-8">
            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              {currentRecord.id ? '编辑测评记录' : '新增测评记录'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
              <div className="space-y-2 min-w-0">
                <Label className="stat-label">业务日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="v2-input"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="stat-label">选择 SKU</Label>
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
              <div className="space-y-2 min-w-0">
                <Label className="stat-label">测评费 (CNY)</Label>
                <Input 
                  type="number" 
                  step="any"
                  value={currentRecord.reviewFeeCNY ?? ''} 
                  onChange={e => setCurrentRecord({...currentRecord, reviewFeeCNY: e.target.value === '' ? undefined : Number(e.target.value)})}
                  className="v2-input"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="stat-label">回款额 (USD)</Label>
                <Input 
                  type="number" 
                  step="any"
                  value={currentRecord.refundAmountUSD ?? ''} 
                  onChange={e => setCurrentRecord({...currentRecord, refundAmountUSD: e.target.value === '' ? undefined : Number(e.target.value)})}
                  className="v2-input"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 text-sm font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95">保存</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl h-12 text-sm font-black transition-all border border-slate-200">取消</button>
              </div>
            </div>
            {currentRecord.skuName && (
              <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                自动匹配: <span className="text-indigo-500">{currentRecord.skuName}</span>
              </div>
            )}
          </div>
        )}

        {data.length > 0 && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="v2-stat-card border-slate-200/50">
               <span className="stat-label">记录总数</span>
               <div className="stat-value">{data.length}</div>
            </div>
            <div className="v2-stat-card border-indigo-200/50">
               <span className="stat-label">累计支出 (CNY)</span>
               <div className="stat-value text-indigo-600">¥{calculateTotalFees()}</div>
            </div>
            <div className="v2-stat-card border-amber-200/50">
               <span className="stat-label">累计回款 (USD)</span>
               <div className="stat-value text-amber-600">${calculateTotalRefundsUSD()}</div>
            </div>
            <div className="v2-stat-card border-emerald-200/50">
               <div className="flex justify-between items-center">
                 <div>
                   <span className="stat-label">实际总成 (CNY)</span>
                   <div className="stat-value text-emerald-600">¥{calculateActualCostTotal()}</div>
                 </div>
                 <RefreshCcw className="w-8 h-8 text-emerald-500/10" />
               </div>
            </div>
          </div>
        )}

        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title">
              <DollarSign className="w-4 h-4 text-amber-400" />
              测评支出明细
            </h2>
          </div>
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">日期</th>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th">测评费 (CNY)</th>
                  <th className="v2-table-th">回款 (USD)</th>
                  <th className="v2-table-th">实际成本 (CNY)</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                       <Loader2 className="w-5 h-5 animate-spin mx-auto text-sky-400" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-500 italic">暂无记录</td>
                  </tr>
                ) : data.map((record) => {
                  const actual = Number(record.reviewFeeCNY || 0) - (Number(record.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY);
                  return (
                    <tr key={record.id} className="v2-table-tr group">
                      <td className="v2-table-td text-slate-400">{record.date}</td>
                      <td className="v2-table-td">
                         <div className="flex flex-col">
                           <span className="text-sky-400 font-bold">{record.sku}</span>
                           <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{record.skuName}</span>
                         </div>
                      </td>
                      <td className="v2-table-td text-slate-300">¥{(record.reviewFeeCNY || 0).toLocaleString()}</td>
                      <td className="v2-table-td text-slate-300">${(record.refundAmountUSD || 0).toLocaleString()}</td>
                      <td className="v2-table-td">
                        <span className={`font-bold ${actual > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                           ¥{actual.toFixed(2)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

