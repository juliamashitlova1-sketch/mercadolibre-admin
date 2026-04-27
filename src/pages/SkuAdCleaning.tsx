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
    return skuData.find(s => s.sku === selectedSku);
  }, [selectedSku, skuData]);

  const calculations = useMemo(() => {
    const spend = parseFloat(formData.adSpend) || 0;
    const clicks = parseFloat(formData.clicks) || 0;
    const orders = parseFloat(formData.adOrders) || 0;
    const price = currentSkuInfo?.sellingPrice || 0;
    const revenue = orders * price;
    // Assuming MXN for selling price, need to convert or clarify currency
    // For now, let's assume ROAS and ACOS calculations use direct inputs if revenue is in USD or convert
    // Usually ad_spend is USD, revenue might be MXN. Let's use a standard 20:1 rate for display ROAs if needed, 
    // but better to keep it simple or use USD revenue if available.
    // Based on SKUEntry.tsx: adSalesUsd = (watchedAdOrders * watchedPrice) / USD_TO_MXN;
    const USD_TO_MXN = 20; // Constant fallback
    const revenueUsd = revenue / USD_TO_MXN;

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
    } catch (err: any) {
      console.error('Save error:', err);
      setSyncStatus({ type: 'error', message: '保存失败: ' + err.message });
    } finally {
      setIsSaving(false);
    }
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
        <header className="flex justify-between items-center bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-700 rounded-xl shadow-lg ring-1 ring-white/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200 tracking-tight">
                各 SKU 每日广告数据清洗
              </h1>
              <p className="text-xs text-slate-200 mt-1">手动填写 SKU 广告消耗、效果及设定值</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">最后同步时间</span>
                <span className="text-xs text-sky-400 font-mono font-bold">刚刚</span>
             </div>
          </div>
        </header>

        {/* Aggregated Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">今日总消耗 (USD)</p>
                <p className="text-2xl font-black text-white">${summary.totalSpend.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Wallet className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">今日总转化 (件)</p>
                <p className="text-2xl font-black text-sky-400 font-mono">{summary.totalOrders}</p>
              </div>
              <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">总曝光 / 总点击</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-black text-white">{summary.totalImps}</p>
                  <span className="text-slate-600">/</span>
                  <p className="text-lg font-black text-slate-300">{summary.totalClicks}</p>
                </div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <MousePointer2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">全店平均 CPC (USD)</p>
                <p className="text-2xl font-black text-orange-400 font-mono">${summary.avgCpc.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <BarChart3 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Input Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-slate-900/60 border-slate-800 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-sky-400" />
                  手动录入每日数据
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-200 uppercase font-bold">选择日期</Label>
                      <Input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-950/50 border-slate-800 text-xs h-9 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-200 uppercase font-bold">选择 SKU</Label>
                      <Select value={selectedSku} onValueChange={setSelectedSku}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-xs h-9">
                          <SelectValue placeholder="搜索/选择 SKU" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                        className="bg-slate-950/50 border-emerald-900/30 text-xs h-9 font-bold text-emerald-400" 
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
                        className="bg-slate-950/50 border-sky-900/30 text-xs h-9 font-bold text-sky-400" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-200 font-bold">今日曝光量 (Impressions)</Label>
                    <Input 
                      name="impressions" 
                      type="number"
                      placeholder="0"
                      value={formData.impressions}
                      onChange={handleInputChange}
                      className="bg-slate-950/50 border-slate-800 text-xs h-9" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-200 font-bold">点击数 (Clicks)</Label>
                      <Input 
                        name="clicks" 
                        type="number"
                        placeholder="0"
                        value={formData.clicks}
                        onChange={handleInputChange}
                        className="bg-slate-950/50 border-slate-800 text-xs h-9" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-200 font-bold">广告成交件数</Label>
                      <Input 
                        name="adOrders" 
                        type="number"
                        placeholder="0"
                        value={formData.adOrders}
                        onChange={handleInputChange}
                        className="bg-slate-950/50 border-slate-800 text-xs h-9" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-rose-400 font-bold uppercase tracking-widest">广告总消耗 (USD)</Label>
                    <Input 
                      name="adSpend" 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.adSpend}
                      onChange={handleInputChange}
                      className="bg-slate-950/50 border-rose-900/30 text-xs h-9 font-bold text-rose-400" 
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2 mt-4 relative group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                  </div>
                  <h4 className="text-xs text-slate-300 font-black uppercase tracking-wider mb-2">实时预估数据</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 font-bold">CPC</span>
                      <span className="text-sm font-mono font-black text-white">${calculations.cpc}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 font-bold">ROAS</span>
                      <span className="text-sm font-mono font-black text-emerald-400">{calculations.roas}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 font-bold">ACOS</span>
                      <span className="text-sm font-mono font-black text-rose-400">{calculations.acos}%</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !selectedSku}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-10 mt-2 shadow-lg shadow-sky-900/30 transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  保存当日广告数据
                </Button>

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
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-hidden shadow-sm h-full">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
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
                <table className="w-full text-left">
                  <thead className="bg-slate-800/40 text-slate-300 text-xs font-black uppercase tracking-widest sticky top-0 z-10 backdrop-blur-xl border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">日期</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3 text-right">ROAS / 预算</th>
                      <th className="px-4 py-3 text-right">消耗 (USD)</th>
                      <th className="px-4 py-3 text-right">点击 / 曝光</th>
                      <th className="px-4 py-3 text-right">订单</th>
                      <th className="px-4 py-3 text-right">实际 ROAS / ACOS</th>
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
                        // Calculate real-time metrics for table display
                        const skuInfo = allSkuData.find(s => s.sku === row.sku);
                        const revUsd = (row.adOrders * (skuInfo?.sellingPrice || 0)) / USD_TO_MXN;
                        const actualRoas = row.adSpend > 0 ? (revUsd / row.adSpend).toFixed(2) : '0.00';
                        const actualAcos = revUsd > 0 ? ((row.adSpend / revUsd) * 100).toFixed(1) : '0.0';

                        return (
                          <tr key={row.id} className="text-[11px] hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-3 font-mono text-slate-400">{row.date}</td>
                            <td className="px-4 py-3 font-black text-white">{row.sku}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col">
                                <span className="text-emerald-400 font-bold">{row.targetRoas}</span>
                                <span className="text-[10px] text-slate-400">${row.budgetUsd}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-rose-400">${row.adSpend.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col">
                                <span className="text-white font-bold">{row.clicks}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{row.impressions}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-sky-400">{row.adOrders}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col">
                                <span className={`font-black ${Number(actualRoas) >= row.targetRoas ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {actualRoas}
                                </span>
                                <span className="text-[10px] text-slate-400">{actualAcos}%</span>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
