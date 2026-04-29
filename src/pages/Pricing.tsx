import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Save, History, Box, Truck, BarChart3, AlertCircle, Trash2, ExternalLink, CheckCircle, Inbox, PlusCircle, Filter, Ruler, Scale, DollarSign, Wallet, Package, Search, Plane, ArrowLeftCircle, Info, X, RefreshCw, Clock, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Pricing() {
  const location = useLocation();
  const path = location.pathname;
  
  const isCalculatorView = path === '/pricing/new' || path === '/pricing';
  const isListView = path === '/pricing/list';
  const isSuccessView = path === '/pricing/success';
  const isStagingView = path === '/pricing/staging';

  const [form, setForm] = useState({
    sku: '',
    name: '',
    model: '',
    replenishmentQty: 100,
    purchaseLink: '',
    competitorLink: '',
    competitorPriceMxn: 0,
    imageUrl: '',
    sellingPriceMxn: 450,
    purchasePriceCny: 45,
    exchangeRate: 0.3891,
    commissionRate: 0.175,
    fixedFee: 0,
    lastMileFee: 85,
    adRate: 0.08,
    returnRate: 0.02,
    taxRate: 0.0905,
    boxLength: 40, boxWidth: 30, boxHeight: 30, 
    packCount: 100,
    boxWeight: 15,
    unitLength: 10, unitWidth: 5, unitHeight: 5, productWeight: 0.15,
    logisticsProvider: '顺丰美线',
    seaFreightUnitPrice: 3100,
    airFreightUnitPrice: 95,
    auditor: '',
    logisticsMode: '海运'
  });

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', order: 'desc' });
  const [allSkus, setAllSkus] = useState<any[]>([]);
  const [selectedSyncSku, setSelectedSyncSku] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const metrics = useMemo(() => {
    const f = form;
    const totalPurchaseCost = f.purchasePriceCny * f.replenishmentQty;
    const boxCount = f.packCount > 0 ? (f.replenishmentQty / f.packCount) : 0;
    const singleBoxVolumeM3 = (f.boxLength * f.boxWidth * f.boxHeight) / 1000000;
    const singleBoxVolumetricWeight = (f.boxLength * f.boxWidth * f.boxHeight) / 6000;
    const singleBoxChargeableWeight = Math.max(f.boxWeight, singleBoxVolumetricWeight);
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalWeight = f.boxWeight * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    const seaFreightTotal = totalVolume * f.seaFreightUnitPrice;
    const seaFreightPerUnit = f.replenishmentQty > 0 ? (seaFreightTotal / f.replenishmentQty) : 0;
    const airFreightTotal = totalChargeableWeight * f.airFreightUnitPrice;
    const airFreightPerUnit = f.replenishmentQty > 0 ? (airFreightTotal / f.replenishmentQty) : 0;

    const commissionMxn = f.sellingPriceMxn * f.commissionRate;
    const adFeeMxn = f.sellingPriceMxn * f.adRate;
    const returnFeeMxn = f.sellingPriceMxn * f.returnRate;
    const taxMxn = f.sellingPriceMxn * f.taxRate;
    const totalFeesMxn = commissionMxn + f.fixedFee + f.lastMileFee + adFeeMxn + returnFeeMxn + taxMxn;
    const payoutMxn = f.sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchangeRate;

    const profitSeaUnit = payoutCny - f.purchasePriceCny - seaFreightPerUnit;
    const marginSea = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (profitSeaUnit / (f.sellingPriceMxn * f.exchangeRate)) : 0;
    const roiSea = (f.purchasePriceCny + seaFreightPerUnit) > 0 ? (profitSeaUnit / (f.purchasePriceCny + seaFreightPerUnit)) : 0;

    const profitAirUnit = payoutCny - f.purchasePriceCny - airFreightPerUnit;
    const marginAir = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (profitAirUnit / (f.sellingPriceMxn * f.exchangeRate)) : 0;
    const roiAir = (f.purchasePriceCny + airFreightPerUnit) > 0 ? (profitAirUnit / (f.purchasePriceCny + airFreightPerUnit)) : 0;

    const singleUnitVolumetricWeight = (f.unitLength * f.unitWidth * f.unitHeight) / 6000;
    const feeRateSum = f.commissionRate + f.adRate + f.returnRate + f.taxRate;
    const costCny = f.purchasePriceCny + seaFreightPerUnit;
    const breakEvenSellingMxn = (1 - feeRateSum) > 0 
      ? ( (costCny / f.exchangeRate) + f.fixedFee + f.lastMileFee ) / (1 - feeRateSum)
      : 0;

    return {
      totalPurchaseCost, boxCount, singleBoxVolumetricWeight, totalVolume, totalWeight, totalChargeableWeight,
      seaFreightTotal, seaFreightPerUnit, airFreightTotal, airFreightPerUnit,
      commissionMxn, adFeeMxn, taxMxn, totalFeesMxn, payoutMxn, payoutCny,
      profitSeaUnit, marginSea, roiSea, profitAirUnit, marginAir, roiAir,
      singleUnitVolumetricWeight, breakEvenSellingMxn
    };
  }, [form]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const { key, order } = sortConfig;
      let valA = a[key];
      let valB = b[key];
      if (key === 'total_purchase') {
        valA = a.replenishment_qty * a.purchase_price_cny;
        valB = b.replenishment_qty * b.purchase_price_cny;
      }
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortConfig]);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase.from('sku_pricing').select('*').order('created_at', { ascending: false });
    if (isSuccessView) query = query.eq('status', 'success');
    else if (isStagingView) query = query.eq('status', 'staging');
    else if (isListView) query = query.eq('status', 'priced');
    const { data, error } = await query;
    if (!error && data) setRecords(data);
    setLoading(false);
  };

  const fetchAllSkus = async () => {
    const { data } = await supabase.from('skus').select('sku, product_name').order('sku');
    if (data) setAllSkus(data);
  };

  useEffect(() => { 
    fetchRecords(); 
    fetchAllSkus();
  }, [path]);

  const handleSave = async () => {
    setSaving(true);
    const saveData = {
      sku: form.name || 'NEW_PRODUCT',
      name: form.name, model: form.model, replenishment_qty: form.replenishmentQty, purchase_link: form.purchaseLink, 
      competitor_link: form.competitorLink, competitor_price: form.competitorPriceMxn, image_url: form.imageUrl,
      selling_price_mxn: form.sellingPriceMxn, purchase_price_cny: form.purchasePriceCny, exchange_rate: form.exchangeRate,
      commission_rate: form.commissionRate, fixed_fee: form.fixedFee, last_mile_fee: form.lastMileFee, ad_rate: form.adRate, 
      return_rate: form.returnRate, tax_rate: form.taxRate, box_length: form.boxLength, box_width: form.boxWidth, 
      box_height: form.boxHeight, pack_count: form.packCount, box_weight: form.boxWeight,
      logistics_provider: form.logisticsProvider, sea_freight_unit_price: form.seaFreightUnitPrice, air_freight_unit_price: form.airFreightUnitPrice,
      roi: form.logisticsMode === '空运' ? metrics.roiAir : metrics.roiSea, 
      margin: (form.logisticsMode === '空运' ? metrics.marginAir : metrics.marginSea) * 100,
      unit_length: form.unitLength, unit_width: form.unitWidth, unit_height: form.unitHeight, product_weight: form.productWeight,
      status: 'priced', auditor: form.auditor, logistics_mode: form.logisticsMode
    };
    const { error } = await supabase.from('sku_pricing').insert([saveData]);
    if (error) setErrorMessage(`保存失败: ${error.message}`);
    else { 
      setForm({ ...form, sku: '', name: '', model: '', imageUrl: '', competitorLink: '', purchaseLink: '' }); 
      setErrorMessage('');
      fetchRecords(); 
      alert('核价结果已成功保存！'); 
    }
    setSaving(false);
  };

  const handleSyncToCostManagement = async () => {
    if (!selectedSyncSku) { alert('请先选择要同步的目标 SKU'); return; }
    setIsSyncing(true);
    try {
      const syncData = {
        sku: selectedSyncSku.toUpperCase(), purchase_price_cny: form.purchasePriceCny, replenishment_qty: form.replenishmentQty,
        selling_price_mxn: form.sellingPriceMxn, exchange_rate: form.exchangeRate, commission_rate: form.commissionRate,
        ad_rate: form.adRate, return_rate: form.returnRate, tax_rate: form.taxRate, box_length: form.boxLength,
        box_width: form.boxWidth, box_height: form.boxHeight, pack_count: form.packCount, box_weight: form.boxWeight,
        unit_length: form.unitLength, unit_width: form.unitWidth, unit_height: form.unitHeight, product_weight: form.productWeight,
        logistics_mode: form.logisticsMode, sea_freight_unit_price: form.seaFreightUnitPrice, air_freight_unit_price: form.airFreightUnitPrice,
        fixed_fee: form.fixedFee, last_mile_fee: form.lastMileFee, margin: (form.logisticsMode === '空运' ? metrics.marginAir : metrics.marginSea) * 100,
        roi: form.logisticsMode === '空运' ? metrics.roiAir : metrics.roiSea, status: 'priced'
      };
      await supabase.from('sku_pricing').delete().eq('sku', syncData.sku);
      const { error } = await supabase.from('sku_pricing').insert([syncData]);
      if (error) throw error;
      alert(`已成功同步到 ${selectedSyncSku}`);
    } catch (err: any) { alert('同步失败: ' + err.message); }
    finally { setIsSyncing(false); }
  };

  useEffect(() => {
    const price = form.sellingPriceMxn;
    const unitActualWeight = form.productWeight || 0;
    const unitVolumetricWeight = (form.unitLength * form.unitWidth * form.unitHeight) / 6000;
    const ar59Weight = Math.max(unitActualWeight, unitVolumetricWeight);
    let calculatedFixed = 0;
    if (price < 299) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);
      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];
      if (price < 99) calculatedFixed = tableA[idx];
      else if (price < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx];
    }
    if (form.fixedFee !== calculatedFixed) setForm(prev => ({ ...prev, fixedFee: calculatedFixed }));
    let calculatedLastMile = 0;
    if (price >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];
      if (price <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }
    if (form.lastMileFee !== calculatedLastMile) setForm(prev => ({ ...prev, lastMileFee: calculatedLastMile }));
  }, [form.sellingPriceMxn, form.productWeight, form.unitLength, form.unitWidth, form.unitHeight, form.fixedFee, form.lastMileFee]);

  const [detailRecord, setDetailRecord] = useState<any>(null);

  const inputCls = "v2-input";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-0.5";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title text-slate-900">
                {isCalculatorView ? '新品深度核价' : '核价历史记录'}
              </h1>
              <p className="v2-header-subtitle font-medium">精确测算单品利润、ROI 及盈亏平衡点</p>
            </div>
          </div>
          
          {isCalculatorView && (
             <div className="flex items-center gap-4 ml-auto">
                <div className="v2-stat-card bg-white/80 border-slate-200/60 px-5 py-3 flex flex-col items-center min-w-[120px] shadow-sm">
                   <span className="v2-stat-label text-slate-400 font-bold uppercase tracking-wider">当前汇率</span>
                   <input type="number" step="0.0001" value={form.exchangeRate} onChange={e=>setForm({...form, exchangeRate: Number(e.target.value)})} className="text-xl font-mono font-black text-indigo-600 outline-none w-full text-center bg-transparent mt-0.5" />
                </div>
                
                <button 
                  onClick={() => setForm({...form, logisticsMode: '海运'})}
                  className={`v2-stat-card px-6 py-3 flex flex-col items-center min-w-[150px] transition-all shadow-sm ${
                    form.logisticsMode === '海运' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
                  }`}
                >
                   <span className={`v2-stat-label font-bold uppercase ${form.logisticsMode === '海运' ? 'text-indigo-600' : 'text-slate-400'}`}>海运毛利 (推荐)</span>
                   <span className={`text-2xl font-mono font-black mt-0.5 ${form.logisticsMode === '海运' ? 'text-slate-900' : 'text-slate-300'}`}>{(metrics.marginSea * 100).toFixed(1)}%</span>
                </button>

                <button 
                  onClick={() => setForm({...form, logisticsMode: '空运'})}
                  className={`v2-stat-card px-6 py-3 flex flex-col items-center min-w-[150px] transition-all shadow-sm ${
                    form.logisticsMode === '空运' ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-100'
                  }`}
                >
                   <span className={`v2-stat-label font-bold uppercase ${form.logisticsMode === '空运' ? 'text-sky-600' : 'text-slate-400'}`}>空运毛利率</span>
                   <span className={`text-2xl font-mono font-black mt-0.5 ${form.logisticsMode === '空运' ? 'text-slate-900' : 'text-slate-300'}`}>{(metrics.marginAir * 100).toFixed(1)}%</span>
                </button>
             </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {isCalculatorView ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <section className="v2-card p-6 shadow-xl shadow-slate-200/50">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                     <div className="lg:col-span-1">
                        <label className={labelCls}>产品品名</label>
                        <input className={inputCls} placeholder="输入名称..." value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                     </div>
                     <div className="lg:col-span-1">
                        <label className={labelCls}>核价人</label>
                        <input className={`${inputCls} bg-amber-50/30 border-amber-100`} placeholder="核价员姓名..." value={form.auditor} onChange={e=>setForm({...form, auditor: e.target.value})} />
                     </div>
                     <div className="lg:col-span-1">
                        <label className={labelCls}>采购价 (¥)</label>
                        <input className={`${inputCls} bg-sky-50 font-black border-sky-200 text-sky-700`} type="number" step="0.1" value={form.purchasePriceCny} onChange={e=>setForm({...form, purchasePriceCny: Number(e.target.value)})} />
                     </div>
                     <div className="lg:col-span-1">
                        <label className={labelCls}>墨西哥售价 ($)</label>
                        <input className={`${inputCls} bg-emerald-50 font-black border-emerald-200 text-emerald-700`} type="number" step="0.1" value={form.sellingPriceMxn} onChange={e=>setForm({...form, sellingPriceMxn: Number(e.target.value)})} />
                     </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-8 border-t border-slate-50">
                     <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Package className="w-3.5 h-3.5" /> 产品实物规格</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <input className={inputCls} type="number" placeholder="长" value={form.unitLength} onChange={e=>setForm({...form, unitLength: Number(e.target.value)})} />
                          <input className={inputCls} type="number" placeholder="宽" value={form.unitWidth} onChange={e=>setForm({...form, unitWidth: Number(e.target.value)})} />
                          <input className={inputCls} type="number" placeholder="高" value={form.unitHeight} onChange={e=>setForm({...form, unitHeight: Number(e.target.value)})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                           <div><label className={labelCls}>重量 (KG)</label><input className={inputCls} type="number" step="0.01" value={form.productWeight} onChange={e=>setForm({...form, productWeight: Number(e.target.value)})} /></div>
                           <div><label className={labelCls}>抛重体积</label><div className="px-3 py-2 bg-slate-50 rounded-xl text-xs font-mono font-bold text-slate-500 border border-slate-100">{metrics.singleUnitVolumetricWeight.toFixed(2)}</div></div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Box className="w-3.5 h-3.5" /> 物流打包规格</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <input className={inputCls} type="number" placeholder="箱长" value={form.boxLength} onChange={e=>setForm({...form, boxLength: Number(e.target.value)})} />
                          <input className={inputCls} type="number" placeholder="箱宽" value={form.boxWidth} onChange={e=>setForm({...form, boxWidth: Number(e.target.value)})} />
                          <input className={inputCls} type="number" placeholder="箱高" value={form.boxHeight} onChange={e=>setForm({...form, boxHeight: Number(e.target.value)})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className={labelCls}>装箱数</label><input className={inputCls} type="number" value={form.packCount} onChange={e=>setForm({...form, packCount: Number(e.target.value)})} /></div>
                           <div><label className={labelCls}>整箱重</label><input className={inputCls} type="number" value={form.boxWeight} onChange={e=>setForm({...form, boxWeight: Number(e.target.value)})} /></div>
                        </div>
                     </div>

                     <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> 实时物流分摊</h4>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-500">海运分摊:</span> <span className="text-indigo-600 font-mono">¥{metrics.seaFreightPerUnit.toFixed(2)}</span></div>
                           <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-500">空运分摊:</span> <span className="text-sky-600 font-mono">¥{metrics.airFreightPerUnit.toFixed(2)}</span></div>
                           <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-black uppercase text-slate-400"><span>总批次方数:</span> <span>{metrics.totalVolume.toFixed(3)} m³</span></div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 lg:grid-cols-6 gap-4 pt-8 border-t border-slate-50">
                     {['佣金 %', '固定费', '尾程费', '广告 %', '退货 %', '税率 %'].map((l, i) => {
                       const fields = ['commissionRate', 'fixedFee', 'lastMileFee', 'adRate', 'returnRate', 'taxRate'];
                       const field = fields[i] as keyof typeof form;
                       const isRate = l.includes('%');
                       const isAuto = l === '固定费' || l === '尾程费';
                       return (
                         <div key={l}>
                            <label className={labelCls}>{l} {isAuto && '(联动)'}</label>
                            <input 
                              className={`${inputCls} ${isAuto ? 'bg-slate-100 border-transparent text-slate-400 font-bold shadow-none' : ''}`} 
                              type="number" 
                              value={isRate ? (form[field] as number)*100 : form[field]} 
                              readOnly={isAuto}
                              onChange={e=>setForm({...form, [field]: isRate ? Number(e.target.value)/100 : Number(e.target.value)})} 
                            />
                         </div>
                       );
                     })}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <section className="v2-card p-6 border-indigo-100 shadow-lg shadow-indigo-500/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-black">SYNC</div>
                        <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">同步到现有档案</h4>
                      </div>
                      <div className="space-y-4">
                        <select value={selectedSyncSku} onChange={e => setSelectedSyncSku(e.target.value)} className={`${inputCls} h-12 bg-white border-slate-200 text-sm font-bold`}>
                          <option value="">-- 选择目标 SKU 覆盖 --</option>
                          {allSkus.map(s => <option key={s.sku} value={s.sku}>{s.sku} | {s.product_name}</option>)}
                        </select>
                        <button 
                          onClick={handleSyncToCostManagement} disabled={isSyncing || !selectedSyncSku}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-40"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 执行参数同步
                        </button>
                      </div>
                   </section>

                   <section className="v2-card p-6 border-emerald-100 shadow-lg shadow-emerald-500/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><TrendingUp className="w-6 h-6" /></div>
                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">盈亏建议与保存</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-inner">
                            <span className="text-xs font-black text-emerald-700">建议盈亏平衡价 (MXN)</span>
                            <span className="text-3xl font-mono font-black text-emerald-600">${metrics.breakEvenSellingMxn.toFixed(0)}</span>
                         </div>
                         <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">
                           <Save className="w-5 h-5" /> {saving ? '提交中...' : '正式提交核价结果'}
                         </button>
                      </div>
                   </section>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <section className="v2-card bg-slate-900/90 p-8 text-white relative overflow-hidden shadow-2xl border-none">
                  <div className="relative z-10 space-y-10">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3"><BarChart3 className="w-6 h-6" /> 利润分析看板</h3>
                    
                    <div className="space-y-8">
                       <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase">海运模式 / 预计单盈 (¥)</span>
                          <div className="text-5xl font-mono font-black text-emerald-400 tracking-tighter">¥{metrics.profitSeaUnit.toFixed(1)}</div>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg italic">ROI: {(metrics.roiSea*100).toFixed(0)}%</span>
                             <span className="text-[10px] font-bold text-slate-500">{(metrics.marginSea*100).toFixed(1)}% 净利率</span>
                          </div>
                       </div>
                       <div className="space-y-2 opacity-40">
                          <span className="text-[10px] font-black text-slate-500 uppercase">空运模式 / 预计单盈 (¥)</span>
                          <div className="text-4xl font-mono font-black text-sky-400 tracking-tighter">¥{metrics.profitAirUnit.toFixed(1)}</div>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[10px] font-black px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-lg italic">ROI: {(metrics.roiAir*100).toFixed(0)}%</span>
                             <span className="text-[10px] font-bold text-slate-500">{(metrics.marginAir*100).toFixed(1)}% 净利率</span>
                          </div>
                       </div>
                    </div>

                    <div className="pt-10 border-t border-slate-800 space-y-6">
                       <div className="flex justify-between items-center p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
                          <span className="text-xs font-black text-indigo-300 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> 总结汇回款 (CNY)</span>
                          <span className="text-3xl font-mono font-black text-white">¥{metrics.payoutCny.toFixed(2)}</span>
                       </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
                </section>
                
                <div className="v2-card p-5 border-amber-100 bg-amber-50 shadow-sm">
                   <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 font-bold leading-relaxed uppercase">核心算法已与 2024.Q4 官方费率库对齐。单品抛重按照 6000 基数计算，尾程费用已包含各档位加权平均值。</p>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="v2-card shadow-xl overflow-hidden">
              <div className="v2-table-wrapper max-h-[750px] custom-scrollbar">
                <table className="v2-table">
                  <thead className="v2-table-thead">
                    <tr>
                      <th className="v2-table-th">核价对象信息</th>
                      <th className="v2-table-th text-center">预估毛利 (单)</th>
                      <th className="v2-table-th text-center">利润率 (ROI)</th>
                      <th className="v2-table-th text-center">物流配置</th>
                      <th className="v2-table-th text-center">结汇到账</th>
                      <th className="v2-table-th text-right">核价详情与管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.length === 0 ? (
                      <tr><td colSpan={6} className="py-40 text-center text-slate-400 font-bold italic text-sm uppercase tracking-widest opacity-30">暂无历史核价记录</td></tr>
                    ) : sortedRecords.map(rec => (
                      <tr key={rec.id} className="v2-table-tr group">
                        <td className="v2-table-td">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 overflow-hidden shadow-md">
                                <img src={rec.image_url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                 <div className="text-base font-black text-slate-900 truncate tracking-tight">{rec.name || '未命名新品'}</div>
                                 <div className="text-[10px] text-slate-400 font-black uppercase mt-0.5 flex items-center gap-2">
                                    <span>{rec.model || '标准型号'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span>{rec.auditor || '系统归档'}</span>
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className={`text-sm font-black font-mono ${rec.margin > 15 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ¥{(rec.margin / 100 * rec.selling_price_mxn * rec.exchange_rate).toFixed(1)}
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-black text-slate-900">{rec.margin.toFixed(1)}%</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase italic">ROI: {(rec.roi*100).toFixed(0)}%</span>
                           </div>
                        </td>
                        <td className="v2-table-td text-center">
                           <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border shadow-sm inline-flex items-center gap-1.5 ${
                             rec.logistics_mode === '空运' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                           }`}>
                             {rec.logistics_mode === '空运' ? <Plane className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                             {rec.logistics_mode || '海运'}
                           </div>
                        </td>
                        <td className="v2-table-td text-center">
                           <div className="text-xs font-mono font-black text-slate-600">¥{(rec.selling_price_mxn * rec.exchange_rate * 0.7).toFixed(1)}</div>
                        </td>
                        <td className="v2-table-td text-right">
                           <div className="flex items-center justify-end gap-3">
                              <button onClick={() => setDetailRecord(rec)} className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"><Search className="w-4 h-4" /></button>
                              <button onClick={() => deleteRecord(rec.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
