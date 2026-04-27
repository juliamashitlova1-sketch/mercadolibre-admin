import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  TrendingUp, Search, PlusCircle, Save, 
  Trash2, AlertCircle, CheckCircle, Loader2,
  DollarSign, MousePointer2, Eye, ShoppingBag,
  BarChart3, Target, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { SKUStats, SkuAdStats } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { USD_TO_MXN } from '../constants';

export default function SkuAdCleaning() {
  const { skuData, allSkuData, managedSkus, uiVersion } = useOutletContext<{ 
    skuData: SKUStats[], 
    allSkuData: SKUStats[], 
    managedSkus: any[],
    uiVersion: string 
  }>();

  const [adData, setAdData] = useState<SkuAdStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Form state
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    targetRoas: '',
    budgetUsd: '',
    impressions: '',
    clicks: '',
    adOrders: '',
    adSpend: ''
  });
  const [editingRecord, setEditingRecord] = useState<SkuAdStats | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAdData();
  }, []);

  const fetchAdData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sku_ads')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      if (data) {
        setAdData(data.map(row => ({
          id: row.id,
          date: row.date,
          sku: row.sku,
          targetRoas: Number(row.target_roas) || 0,
          budgetUsd: Number(row.budget_usd) || 0,
          impressions: Number(row.impressions) || 0,
          clicks: Number(row.clicks) || 0,
          adOrders: Number(row.ad_orders) || 0,
          adSpend: Number(row.ad_spend) || 0
        })));
      }
    } catch (err: any) {
      console.error('Error fetching ad data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSkuInfo = useMemo(() => {
    return managedSkus.find(s => s.sku === selectedSku);
  }, [selectedSku, managedSkus]);

  const calculations = useMemo(() => {
    const spend = parseFloat(formData.adSpend) || 0;
    const clicks = parseFloat(formData.clicks) || 0;
    const orders = parseFloat(formData.adOrders) || 0;
    const price = currentSkuInfo?.priceMXN || 0;
    const revenue = orders * price;
    // Assuming MXN for selling price, need to convert or clarify currency
    // For now, let's assume ROAS and ACOS calculations use direct inputs if revenue is in USD or convert
    // Usually ad_spend is USD, revenue might be MXN. Let's use a standard 20:1 rate for display ROAs if needed, 
    // but better to keep it simple or use USD revenue if available.
    // Based on SKUEntry.tsx: adSalesUsd = (watchedAdOrders * watchedPrice) / USD_TO_MXN;
    const USD_TO_MXN_VAL = USD_TO_MXN || 17.31; // Use constant from imports
    const revenueUsd = revenue / USD_TO_MXN_VAL;

    const cpc = clicks > 0 ? spend / clicks : 0;
    const roas = spend > 0 ? revenueUsd / spend : 0;
    const acos = revenueUsd > 0 ? (spend / revenueUsd) * 100 : 0;

    return {
      cpc: cpc.toFixed(2),
      roas: roas.toFixed(2),
      acos: acos.toFixed(2)
    };
  }, [formData, currentSkuInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || !selectedDate) {
      setSyncStatus({ type: 'error', message: '请选择 SKU 和 日期' });
      return;
    }

    setIsSaving(true);
    setSyncStatus({ type: null, message: '正在同步数据...' });

    try {
      const payload = {
        sku: selectedSku,
        date: selectedDate,
        target_roas: parseFloat(formData.targetRoas) || 0,
        budget_usd: parseFloat(formData.budgetUsd) || 0,
        impressions: parseInt(formData.impressions) || 0,
        clicks: parseInt(formData.clicks) || 0,
        ad_orders: parseInt(formData.adOrders) || 0,
        ad_spend: parseFloat(formData.adSpend) || 0
      };

      const { error } = await supabase
        .from('sku_ads')
        .upsert(payload, { onConflict: 'sku,date' });

      if (error) throw error;

      setSyncStatus({ type: 'success', message: '数据保存成功！' });
      fetchAdData();
      // Reset form partially
      setFormData(prev => ({
        ...prev,
        impressions: '',
        clicks: '',
        adOrders: '',
        adSpend: ''
      }));
      setEditingRecord(null);
    } catch (err: any) {
      console.error('Save error:', err);
      setSyncStatus({ type: 'error', message: '保存失败: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('确定要删除这条广告记录吗？')) return;
    
    setSyncStatus({ type: null, message: '正在删除...' });
    try {
      const { error } = await supabase
        .from('sku_ads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSyncStatus({ type: 'success', message: '数据已删除' });
      fetchAdData();
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: '删除失败: ' + err.message });
    }
  };

  const openEdit = (record: SkuAdStats) => {
    setEditingRecord(record);
    setSelectedSku(record.sku);
    setSelectedDate(record.date);
    setFormData({
      targetRoas: String(record.targetRoas),
      budgetUsd: String(record.budgetUsd),
      impressions: String(record.impressions),
      clicks: String(record.clicks),
      adOrders: String(record.adOrders),
      adSpend: String(record.adSpend)
    });
    // Scroll to top or ensure form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setFormData({
      targetRoas: '',
      budgetUsd: '',
      impressions: '',
      clicks: '',
      adOrders: '',
      adSpend: ''
    });
  };

  const summary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = adData.filter(d => d.date === today);
    const dataToSummarize = todayData.length > 0 ? todayData : adData.slice(0, 10); // Show today's or recent 10

    const totalSpend = dataToSummarize.reduce((acc, curr) => acc + curr.adSpend, 0);
    const totalOrders = dataToSummarize.reduce((acc, curr) => acc + curr.adOrders, 0);
    const totalClicks = dataToSummarize.reduce((acc, curr) => acc + curr.clicks, 0);
    const totalImps = dataToSummarize.reduce((acc, curr) => acc + curr.impressions, 0);
    
    // Weighted averages
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    
    return {
      totalSpend,
      totalOrders,
      totalClicks,
      totalImps,
      avgCpc
    };
  }, [adData]);

  return (
    <div className="flex-1 overflow-y-auto min-h-screen py-6 px-4 bg-transparent custom-scrollbar">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header Section */}
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-blue-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">
                各 SKU 每日广告数据清洗
              </h1>
              <p className="v2-header-subtitle">手动填写 SKU 广告消耗、效果及设定值</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">最后同步时间</span>
                <span className="text-[10px] text-sky-600 font-mono font-bold">刚刚</span>
             </div>
          </div>
        </header>


        {/* Input Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Card className="v2-card border-none shadow-xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
              <CardHeader className="v2-card-header">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-sky-400" />
                    {editingRecord ? '编辑广告数据' : '手动录入每日数据'}
                  </div>
                  {editingRecord && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">
                      编辑模式
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">选择日期</Label>
                      <Input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        disabled={!!editingRecord}
                        className="bg-slate-50 border-slate-200 text-xs h-9 [color-scheme:light] disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">选择 SKU</Label>
                      <Select value={selectedSku} onValueChange={setSelectedSku} disabled={!!editingRecord}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-xs h-9 disabled:opacity-50">
                          <SelectValue placeholder="搜索/选择 SKU" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-800">
                          {managedSkus.map(s => (
                            <SelectItem key={s.sku} value={s.sku} className="text-xs focus:bg-sky-500/20 focus:text-sky-200">
                              {s.sku} - {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-slate-800/50" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
                        <Target className="w-3 h-3" />
                        设定 ROAS 值
                      </Label>
                      <Input 
                        name="targetRoas" 
                        placeholder="0.00" 
                        value={formData.targetRoas}
                        onChange={handleInputChange}
                        className="bg-emerald-50/50 border-emerald-100 text-xs h-9 font-bold text-emerald-600" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-sky-400 font-bold flex items-center gap-1.5">
                        <Wallet className="w-3 h-3" />
                        设定预算 (USD)
                      </Label>
                      <Input 
                        name="budgetUsd" 
                        placeholder="0.00"
                        value={formData.budgetUsd}
                        onChange={handleInputChange}
                        className="bg-sky-50/50 border-sky-100 text-xs h-9 font-bold text-sky-600" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500 font-bold uppercase">今日曝光量 (Impressions)</Label>
                    <Input 
                      name="impressions" 
                      type="number"
                      placeholder="0"
                      value={formData.impressions}
                      onChange={handleInputChange}
                      className="v2-input" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">点击数 (Clicks)</Label>
                      <Input 
                        name="clicks" 
                        type="number"
                        placeholder="0"
                        value={formData.clicks}
                        onChange={handleInputChange}
                        className="v2-input" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">广告成交件数</Label>
                      <Input 
                        name="adOrders" 
                        type="number"
                        placeholder="0"
                        value={formData.adOrders}
                        onChange={handleInputChange}
                        className="v2-input" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">广告总消耗 (USD)</Label>
                    <Input 
                      name="adSpend" 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.adSpend}
                      onChange={handleInputChange}
                      className="bg-rose-50/50 border-rose-100 text-xs h-9 font-bold text-rose-600" 
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2 mt-4 relative group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                  </div>
                  <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2">实时预估数据</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold">CPC</span>
                      <span className="text-sm font-mono font-black text-slate-800">${calculations.cpc}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold">ROAS</span>
                      <span className="text-sm font-mono font-black text-emerald-600">{calculations.roas}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold">ACOS</span>
                      <span className="text-sm font-mono font-black text-rose-600">{calculations.acos}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || !selectedSku}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold h-10 mt-2 shadow-lg shadow-sky-900/30 transition-all active:scale-95"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingRecord ? '更新数据' : '保存当日广告数据'}
                  </Button>
                  {editingRecord && (
                    <Button 
                      variant="outline"
                      onClick={cancelEdit}
                      className="mt-2 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 h-10"
                    >
                      取消
                    </Button>
                  )}
                </div>

                {syncStatus.message && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-2 rounded text-xs font-bold text-center border ${
                      syncStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      syncStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      'bg-sky-500/10 border-sky-500/20 text-sky-400'
                    }`}
                  >
                    {syncStatus.message}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="v2-card shadow-sm h-full">
              <div className="v2-card-header">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  历史广告数据记录
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[9px] bg-sky-500/5 text-sky-400 border-sky-500/20 h-5">
                    最近 {adData.length} 条
                  </Badge>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="v2-table">
                  <thead className="v2-table-thead">
                    <tr>
                      <th className="px-4 py-3">日期</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3 text-right">ROAS / 预算</th>
                      <th className="px-4 py-3 text-right">消耗 (USD)</th>
                      <th className="px-4 py-3 text-right">点击 / 曝光</th>
                      <th className="px-4 py-3 text-right">订单</th>
                      <th className="px-4 py-3 text-right">实际 ROAS / ACOS</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          载入中...
                        </td>
                      </tr>
                    ) : adData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                          暂无历史记录，开始填写吧
                        </td>
                      </tr>
                    ) : (
                      adData.map((row) => {
                        const skuInfo = managedSkus.find(s => s.sku === row.sku);
                        const revUsd = (row.adOrders * (skuInfo?.priceMXN || 0)) / USD_TO_MXN;
                        const actualRoas = row.adSpend > 0 ? (revUsd / row.adSpend).toFixed(2) : '0.00';
                        const actualAcos = revUsd > 0 ? ((row.adSpend / revUsd) * 100).toFixed(1) : '0.0';

                        return (
                          <tr key={row.id} className="v2-table-tr">
                            <td className="v2-table-td font-mono font-medium">{row.date}</td>
                            <td className="v2-table-td font-black">{row.sku}</td>
                            <td className="v2-table-td text-right">
                              <div className="flex flex-col">
                                <span className="text-emerald-600 font-bold">{row.targetRoas}</span>
                                <span className="text-[10px] text-slate-400">${row.budgetUsd}</span>
                              </div>
                            </td>
                            <td className="v2-table-td text-right font-black text-rose-600">${row.adSpend.toFixed(2)}</td>
                            <td className="v2-table-td text-right">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-bold">{row.clicks}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{row.impressions}</span>
                              </div>
                            </td>
                            <td className="v2-table-td text-right font-black text-sky-600">{row.adOrders}</td>
                            <td className="v2-table-td text-right">
                              <div className="flex flex-col">
                                <span className={`font-black ${Number(actualRoas) >= row.targetRoas ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {actualRoas}
                                </span>
                                <span className="text-[10px] text-slate-400">{actualAcos}%</span>
                              </div>
                            </td>
                            <td className="v2-table-td text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openEdit(row)}
                                  className="p-1 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded transition-colors"
                                  title="修改"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(row.id)}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}
