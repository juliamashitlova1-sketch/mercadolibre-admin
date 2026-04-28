
import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Save, History, Box, Truck, BarChart3, AlertCircle, Trash2, ExternalLink, CheckCircle, Inbox, PlusCircle, Filter, Ruler, Scale, DollarSign, Wallet, Package, Search, Plane, ArrowLeftCircle, Info, X, RefreshCw } from 'lucide-react';
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
    // 物流核心规格
    boxLength: 40, boxWidth: 30, boxHeight: 30, 
    packCount: 100, // 每箱装多少个
    boxWeight: 15,  // 单箱实重
    unitLength: 10, unitWidth: 5, unitHeight: 5, productWeight: 0.15,
    logisticsProvider: '顺丰美线',
    seaFreightUnitPrice: 3100, // 每方价格
    airFreightUnitPrice: 95,    // 每KG价格
    auditor: '', // 核价人员
    logisticsMode: '海运' // 物流模式: 海运 | 空运
  });

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', order: 'desc' });
  const [allSkus, setAllSkus] = useState<any[]>([]);
  const [selectedSyncSku, setSelectedSyncSku] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const operationStatuses = ['待采购', '已采购', '已转运', '已上架'];

  // 深度对齐 Excel 的计算逻辑
  const metrics = useMemo(() => {
    const f = form;
    
    // 1. 基本财务数据
    const totalPurchaseCost = f.purchasePriceCny * f.replenishmentQty;
    
    // 2. 物流核心计算 (关键逻辑对齐)
    const boxCount = f.packCount > 0 ? (f.replenishmentQty / f.packCount) : 0;
    const singleBoxVolumeM3 = (f.boxLength * f.boxWidth * f.boxHeight) / 1000000;
    const singleBoxVolumetricWeight = (f.boxLength * f.boxWidth * f.boxHeight) / 6000;
    const singleBoxChargeableWeight = Math.max(f.boxWeight, singleBoxVolumetricWeight);
    
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalWeight = f.boxWeight * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    // 2a. 海运与空运费用拆解
    const seaFreightTotal = totalVolume * f.seaFreightUnitPrice;
    const seaFreightPerUnit = f.replenishmentQty > 0 ? (seaFreightTotal / f.replenishmentQty) : 0;
    
    const airFreightTotal = totalChargeableWeight * f.airFreightUnitPrice;
    const airFreightPerUnit = f.replenishmentQty > 0 ? (airFreightTotal / f.replenishmentQty) : 0;

    // 3. 平台费用 (比索 MXN)
    const commissionMxn = f.sellingPriceMxn * f.commissionRate;
    const adFeeMxn = f.sellingPriceMxn * f.adRate;
    const returnFeeMxn = f.sellingPriceMxn * f.returnRate;
    const taxMxn = f.sellingPriceMxn * f.taxRate;
    
    const totalFeesMxn = commissionMxn + f.fixedFee + f.lastMileFee + adFeeMxn + returnFeeMxn + taxMxn;
    const payoutMxn = f.sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchangeRate;

    // 4. 盈亏结果对比 (海运 vs 空运)
    const profitSeaUnit = payoutCny - f.purchasePriceCny - seaFreightPerUnit;
    const marginSea = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (profitSeaUnit / (f.sellingPriceMxn * f.exchangeRate)) : 0;
    const roiSea = (f.purchasePriceCny + seaFreightPerUnit) > 0 ? (profitSeaUnit / (f.purchasePriceCny + seaFreightPerUnit)) : 0;

    const profitAirUnit = payoutCny - f.purchasePriceCny - airFreightPerUnit;
    const marginAir = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (profitAirUnit / (f.sellingPriceMxn * f.exchangeRate)) : 0;
    const roiAir = (f.purchasePriceCny + airFreightPerUnit) > 0 ? (profitAirUnit / (f.purchasePriceCny + airFreightPerUnit)) : 0;

    // 6. 单品抛重计算
    const singleUnitVolumetricWeight = (f.unitLength * f.unitWidth * f.unitHeight) / 6000;

    // 7. 盈亏平衡点 (海运模式)
    const feeRateSum = f.commissionRate + f.adRate + f.returnRate + f.taxRate;
    const costCny = f.purchasePriceCny + seaFreightPerUnit;
    const breakEvenSellingMxn = (1 - feeRateSum) > 0 
      ? ( (costCny / f.exchangeRate) + f.fixedFee + f.lastMileFee ) / (1 - feeRateSum)
      : 0;

    return {
      totalPurchaseCost,
      boxCount, singleBoxVolumetricWeight, totalVolume, totalWeight, totalChargeableWeight,
      seaFreightTotal, seaFreightPerUnit,
      airFreightTotal, airFreightPerUnit,
      commissionMxn, adFeeMxn, taxMxn, totalFeesMxn,
      payoutMxn, payoutCny,
      profitSeaUnit, marginSea, roiSea,
      profitAirUnit, marginAir, roiAir,
      singleUnitVolumetricWeight,
      breakEvenSellingMxn
    };
  }, [form]);

  // 排序后的记录
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const { key, order } = sortConfig;
      let valA = a[key];
      let valB = b[key];
      
      // 特殊处理计算字段
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
      sku: form.name || 'NEW_PRODUCT', // 使用品名作为 SKU 标识
      name: form.name, 
      model: form.model, 
      replenishment_qty: form.replenishmentQty, 
      purchase_link: form.purchaseLink, 
      competitor_link: form.competitorLink, 
      competitor_price: form.competitorPriceMxn, 
      image_url: form.imageUrl,
      selling_price_mxn: form.sellingPriceMxn, 
      purchase_price_cny: form.purchasePriceCny, 
      exchange_rate: form.exchangeRate,
      commission_rate: form.commissionRate, 
      fixed_fee: form.fixedFee, 
      last_mile_fee: form.lastMileFee, 
      ad_rate: form.adRate, 
      return_rate: form.returnRate, 
      tax_rate: form.taxRate,
      box_length: form.boxLength, 
      box_width: form.boxWidth, 
      box_height: form.boxHeight, 
      pack_count: form.packCount, 
      box_weight: form.boxWeight,
      logistics_provider: form.logisticsProvider, 
      sea_freight_unit_price: form.seaFreightUnitPrice, 
      air_freight_unit_price: form.airFreightUnitPrice,
      roi: form.logisticsMode === '空运' ? metrics.roiAir : metrics.roiSea, 
      margin: (form.logisticsMode === '空运' ? metrics.marginAir : metrics.marginSea) * 100,
      unit_length: form.unitLength,
      unit_width: form.unitWidth,
      unit_height: form.unitHeight,
      product_weight: form.productWeight,
      status: 'priced',
      auditor: form.auditor,
      logistics_mode: form.logisticsMode
    };
    const { error } = await supabase.from('sku_pricing').insert([saveData]);
    if (error) {
      console.error(error);
      setErrorMessage(`保存失败: ${error.message}. 请确保已运行最新的 SQL 脚本。`);
    }
    else { 
      setForm({ ...form, sku: '', name: '', model: '', imageUrl: '', competitorLink: '', purchaseLink: '' }); 
      setErrorMessage('');
      fetchRecords(); 
      alert('核价结果已成功保存！'); 
    }
    setSaving(false);
  };

  const handleSyncToCostManagement = async () => {
    if (!selectedSyncSku) {
      alert('请先选择要同步的目标 SKU');
      return;
    }
    
    setIsSyncing(true);
    try {
      const syncData = {
        sku: selectedSyncSku.toUpperCase(),
        purchase_price_cny: form.purchasePriceCny,
        replenishment_qty: form.replenishmentQty,
        selling_price_mxn: form.sellingPriceMxn,
        exchange_rate: form.exchangeRate,
        commission_rate: form.commissionRate,
        ad_rate: form.adRate,
        return_rate: form.returnRate,
        tax_rate: form.taxRate,
        box_length: form.boxLength,
        box_width: form.boxWidth,
        box_height: form.boxHeight,
        pack_count: form.packCount,
        box_weight: form.boxWeight,
        unit_length: form.unitLength,
        unit_width: form.unitWidth,
        unit_height: form.unitHeight,
        product_weight: form.productWeight,
        logistics_mode: form.logisticsMode,
        sea_freight_unit_price: form.seaFreightUnitPrice,
        air_freight_unit_price: form.airFreightUnitPrice,
        fixed_fee: form.fixedFee,
        last_mile_fee: form.lastMileFee,
        margin: (form.logisticsMode === '空运' ? metrics.marginAir : metrics.marginSea) * 100,
        roi: form.logisticsMode === '空运' ? metrics.roiAir : metrics.roiSea,
        status: 'priced'
      };

      // 避开 upsert 对 UNIQUE 约束的依赖，改用先删后增
      await supabase.from('sku_pricing').delete().eq('sku', syncData.sku);

      const { error } = await supabase
        .from('sku_pricing')
        .insert([syncData]);

      if (error) throw error;
      alert(`已成功将当前核定参数覆盖同步到 SKU成本管理 中的 ${selectedSyncSku}`);
    } catch (err: any) {
      console.error(err);
      alert('同步失败: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 自动化费用计算 (对齐图片逻辑)
  useEffect(() => {
    const price = form.sellingPriceMxn;
    const unitActualWeight = form.productWeight || 0;
    const unitVolumetricWeight = (form.unitLength * form.unitWidth * form.unitHeight) / 6000;
    const ar59Weight = Math.max(unitActualWeight, unitVolumetricWeight);

    // 1. 固定费用 (Fixed Fee) 自动化
    let calculatedFixed = 0;
    if (price < 299) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);

      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];

      if (price < 99) calculatedFixed = tableA[idx];
      else if (price < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx]; // 199 - 298
    }

    if (form.fixedFee !== calculatedFixed) {
      setForm(prev => ({ ...prev, fixedFee: calculatedFixed }));
    }

    // 2. 尾程费 (Last Mile Fee) 自动化
    let calculatedLastMile = 0;
    if (price >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];  // 299-499
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320]; // > 499

      if (price <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }

    if (form.lastMileFee !== calculatedLastMile) {
      setForm(prev => ({ ...prev, lastMileFee: calculatedLastMile }));
    }
  }, [form.sellingPriceMxn, form.productWeight, form.unitLength, form.unitWidth, form.unitHeight, form.fixedFee, form.lastMileFee]);

  const [detailRecord, setDetailRecord] = useState<any>(null);

  const handleRollback = async (rec: any) => {
    // 1. 将数据填回表单
    setForm({
      sku: rec.sku || '',
      name: rec.name || '',
      model: rec.model || '',
      replenishmentQty: rec.replenishment_qty || 100,
      purchaseLink: rec.purchase_link || '',
      competitorLink: rec.competitor_link || '',
      competitorPriceMxn: rec.competitor_price || 0,
      imageUrl: rec.image_url || '',
      sellingPriceMxn: rec.selling_price_mxn || 0,
      purchasePriceCny: rec.purchase_price_cny || 0,
      exchangeRate: rec.exchange_rate || 0.3891,
      commissionRate: rec.commission_rate || 0.175,
      fixedFee: rec.fixed_fee || 0,
      lastMileFee: rec.last_mile_fee || 0,
      adRate: rec.ad_rate || 0.08,
      returnRate: rec.return_rate || 0.02,
      taxRate: rec.tax_rate || 0.0905,
      boxLength: rec.box_length || 0, 
      boxWidth: rec.box_width || 0, 
      boxHeight: rec.box_height || 0, 
      packCount: rec.pack_count || 1, 
      boxWeight: rec.box_weight || 0,
      unitLength: rec.unit_length || 10,
      unitWidth: rec.unit_width || 5,
      unitHeight: rec.unit_height || 5,
      productWeight: rec.product_weight || 0,
      logisticsProvider: rec.logistics_provider || '',
      logisticsMode: rec.logistics_mode || '海运',
      seaFreightUnitPrice: rec.sea_freight_unit_price || 3100,
      airFreightUnitPrice: rec.air_freight_unit_price || 95,
      auditor: rec.auditor || ''
    });
    
    // 2. 从数据库删除当前记录 (既然要回退重新核价)
    const { error } = await supabase.from('sku_pricing').delete().eq('id', rec.id);
    if (!error) {
       fetchRecords();
       // 3. 跳转到计算器页面
       window.location.hash = '#/pricing/new';
       alert('已将数据回退到计算器，请进行修改。');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('sku_pricing').update({ status: newStatus }).eq('id', id);
    if (!error) fetchRecords();
  };

  const updateOperationStatus = async (id: string, newOpStatus: string) => {
    const { error } = await supabase.from('sku_pricing').update({ operation_status: newOpStatus }).eq('id', id);
    if (!error) fetchRecords();
  };

  const deleteRecord = async (id: string) => {
    if (confirm('确定删除？')) {
      const { error } = await supabase.from('sku_pricing').delete().eq('id', id);
      if (!error) fetchRecords();
    }
  };

  const inputCls = "v2-input";
  const labelCls = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 px-1";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
      {/* 顶部标题与状态总览 */}
      <header className="v2-header flex-col lg:flex-row items-start lg:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="v2-header-icon bg-gradient-to-br from-indigo-500 to-purple-600">
             <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="v2-header-title">
               {isCalculatorView ? '新品深度核价 (计算器)' : isListView ? '已核价历史清单' : isSuccessView ? '核价成功区' : '暂存箱'}
            </h1>
            <p className="v2-header-subtitle">跨境物流成本核算与利润分析模型</p>
          </div>
        </div>
        
        {isCalculatorView && (
           <div className="flex items-center gap-4">
              <div className="v2-stat-card bg-slate-900/50 border-slate-800 px-4 py-3 flex flex-col items-center min-w-[110px]">
                 <span className="v2-stat-label text-slate-500">当前汇率</span>
                 <input type="number" step="0.0001" value={form.exchangeRate} onChange={e=>setForm({...form, exchangeRate: Number(e.target.value)})} className="text-lg font-mono font-bold text-indigo-400 outline-none w-full text-center bg-transparent mt-0.5" />
              </div>
              
              {/* 海运推荐 */}
              <button 
                onClick={() => setForm({...form, logisticsMode: '海运'})}
                className={`v2-stat-card px-6 py-3 flex flex-col items-center min-w-[140px] transition-all ${
                  form.logisticsMode === '海运' 
                    ? 'bg-indigo-500/20 border-indigo-500/40' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                 <span className={`v2-stat-label ${form.logisticsMode === '海运' ? 'text-indigo-400' : 'text-slate-500'}`}>海运毛利率 (推荐)</span>
                 <span className="text-2xl font-mono font-black mt-0.5">{(metrics.marginSea * 100).toFixed(1)}%</span>
              </button>

              {/* 空运推荐 */}
              <button 
                onClick={() => setForm({...form, logisticsMode: '空运'})}
                className={`v2-stat-card px-6 py-3 flex flex-col items-center min-w-[140px] transition-all ${
                  form.logisticsMode === '空运' 
                    ? 'bg-sky-500/20 border-sky-500/40' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                 <span className={`v2-stat-label ${form.logisticsMode === '空运' ? 'text-sky-400' : 'text-slate-500'}`}>空运毛利率</span>
                 <span className="text-2xl font-mono font-black mt-0.5">{(metrics.marginAir * 100).toFixed(1)}%</span>
              </button>
           </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {isCalculatorView ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* 左侧：核心参数输入 */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* 第一板块：产品与财务基础 */}
              <section className="v2-card p-5">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                   <div className="col-span-1">
                      <label className={labelCls}>产品名称</label>
                      <input className={inputCls} placeholder="输入品名..." value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>型号 / 规格</label>
                      <input className={inputCls} placeholder="型号..." value={form.model} onChange={e=>setForm({...form, model: e.target.value})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>核价人员</label>
                      <input className={`${inputCls} bg-amber-50/20 border-amber-100`} placeholder="核价人..." value={form.auditor} onChange={e=>setForm({...form, auditor: e.target.value})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>采购价 (¥)</label>
                      <input className={`${inputCls} bg-sky-50/30 font-bold border-sky-100`} type="number" step="0.1" value={form.purchasePriceCny} onChange={e=>setForm({...form, purchasePriceCny: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>补货数量</label>
                      <input className={inputCls} type="number" step="0.1" value={form.replenishmentQty} onChange={e=>setForm({...form, replenishmentQty: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="col-span-1">
                      <label className={labelCls}>售价 (比索)</label>
                      <input className={`${inputCls} bg-emerald-50/30 font-bold border-emerald-100`} type="number" step="0.1" value={form.sellingPriceMxn} onChange={e=>setForm({...form, sellingPriceMxn: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>竞品价格 (比索)</label>
                      <input className={inputCls} type="number" placeholder="竞品售价..." value={form.competitorPriceMxn} onChange={e=>setForm({...form, competitorPriceMxn: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-2">
                      <label className={labelCls}>产品图片 URL</label>
                      <div className="flex gap-2">
                         <input className={inputCls} placeholder="粘贴图片链接..." value={form.imageUrl} onChange={e=>setForm({...form, imageUrl: e.target.value})} />
                         {form.imageUrl && (
                           <img 
                             src={form.imageUrl} 
                             referrerPolicy="no-referrer"
                             className="w-12 h-12 rounded-lg object-cover border border-slate-200" 
                           />
                         )}
                      </div>
                   </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                   <div className="col-span-1">
                      <label className={labelCls}>采购链接</label>
                      <input className={inputCls} placeholder="https://..." value={form.purchaseLink} onChange={e=>setForm({...form, purchaseLink: e.target.value})} />
                   </div>
                   <div className="col-span-1">
                      <label className={labelCls}>竞品链接</label>
                      <input className={inputCls} placeholder="https://..." value={form.competitorLink} onChange={e=>setForm({...form, competitorLink: e.target.value})} />
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-6 pt-6 border-t border-slate-50">
                   {['佣金 %', '固定费', '尾程费', '广告 %', '退货 %', '税率 %'].map((l, i) => {
                     const fields = ['commissionRate', 'fixedFee', 'lastMileFee', 'adRate', 'returnRate', 'taxRate'];
                     const field = fields[i] as keyof typeof form;
                     const isRate = l.includes('%');
                     const isAutomated = l === '固定费' || l === '尾程费';
                     return (
                       <div key={l}>
                          <label className={labelCls}>{l} {isAutomated && '(自动)'}</label>
                          <input 
                            className={`${inputCls} ${isAutomated ? 'bg-slate-100 font-bold text-slate-500 cursor-not-allowed shadow-none' : ''}`} 
                            type="number" 
                            step="any" 
                            value={isRate ? (form[field] as number)*100 : form[field]} 
                            readOnly={isAutomated}
                            onChange={e=>setForm({...form, [field]: isRate ? Number(e.target.value)/100 : Number(e.target.value)})} 
                          />
                       </div>
                     );
                   })}
                </div>
              </section>

              {/* 第二板块：物流细节 (Excel 核心) */}
              <section className="v2-card p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-3"><Package className="w-3 h-3" /> 单品规格</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <input className={inputCls} type="number" step="any" placeholder="长" value={form.unitLength} onChange={e=>setForm({...form, unitLength: Number(e.target.value)})} />
                        <input className={inputCls} type="number" step="any" placeholder="宽" value={form.unitWidth} onChange={e=>setForm({...form, unitWidth: Number(e.target.value)})} />
                        <input className={inputCls} type="number" step="any" placeholder="高" value={form.unitHeight} onChange={e=>setForm({...form, unitHeight: Number(e.target.value)})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                           <label className={labelCls}>单品重量 (kg)</label>
                           <input className={inputCls} type="number" step="any" value={form.productWeight} onChange={e=>setForm({...form, productWeight: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className={labelCls}>尾程体积重</label>
                           <div className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-500">
                              {metrics.singleUnitVolumetricWeight.toFixed(2)}
                           </div>
                        </div>
                      </div>
                   </div>

                   <div>
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-3"><Box className="w-3 h-3" /> 整箱规格</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <input className={inputCls} type="number" step="any" placeholder="长" value={form.boxLength} onChange={e=>setForm({...form, boxLength: Number(e.target.value)})} />
                        <input className={inputCls} type="number" step="any" placeholder="宽" value={form.boxWidth} onChange={e=>setForm({...form, boxWidth: Number(e.target.value)})} />
                        <input className={inputCls} type="number" step="any" placeholder="高" value={form.boxHeight} onChange={e=>setForm({...form, boxHeight: Number(e.target.value)})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                           <label className={labelCls}>装箱数 (PSC)</label>
                           <input className={inputCls} type="number" step="any" value={form.packCount} onChange={e=>setForm({...form, packCount: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className={labelCls}>箱重 (KG)</label>
                           <input className={inputCls} type="number" step="any" value={form.boxWeight} onChange={e=>setForm({...form, boxWeight: Number(e.target.value)})} />
                        </div>
                      </div>
                   </div>
                   
                   <div className="bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                      <h4 className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase mb-3"><Truck className="w-3 h-3" /> 物流报价</h4>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 italic">海运 (/m³)</span>
                            <div className="flex items-center gap-1">
                               <span className="text-xs text-slate-400">¥</span>
                               <input className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-900" type="number" value={form.seaFreightUnitPrice} onChange={e=>setForm({...form, seaFreightUnitPrice: Number(e.target.value)})} />
                            </div>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 italic">空运 (/KG)</span>
                            <div className="flex items-center gap-1">
                               <span className="text-xs text-slate-400">¥</span>
                               <input className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-900" type="number" value={form.airFreightUnitPrice} onChange={e=>setForm({...form, airFreightUnitPrice: Number(e.target.value)})} />
                            </div>
                         </div>
                         <div className="pt-2 border-t border-amber-200/30 mt-2 grid grid-cols-2 gap-2">
                            <div className="text-center">
                               <div className="text-[8px] text-slate-400">箱数</div>
                               <div className="text-xs font-bold text-amber-600">{metrics.boxCount.toFixed(1)}</div>
                            </div>
                            <div className="text-center">
                               <div className="text-[8px] text-slate-400">总方数</div>
                               <div className="text-xs font-bold text-amber-600">{metrics.totalVolume.toFixed(3)}</div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex flex-col gap-3">

                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-indigo-700">海运分摊 (¥/Psc)</span>
                            <span className="text-xs font-mono font-black text-indigo-800">¥{metrics.seaFreightPerUnit.toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-indigo-700">空运分摊 (¥/Psc)</span>
                            <span className="text-xs font-mono font-black text-indigo-800">¥{metrics.airFreightPerUnit.toFixed(2)}</span>
                         </div>
                      </div>
                   </div>
                </div>
              </section>
            </div>

            {/* 右侧：结果分析与操作 */}
            <div className="lg:col-span-4 space-y-5">
              <section className="v2-card bg-slate-900/80 p-6 text-white relative overflow-hidden border-slate-800">
                <div className="relative z-10 space-y-8">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                    <BarChart3 className="w-5 h-5" /> 深度利润分析模型
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="text-xs uppercase font-black text-slate-500 tracking-tighter">海运模式 / 总毛利 (¥)</div>
                      <div className="text-4xl font-mono font-black text-emerald-400">¥{metrics.profitSeaUnit.toFixed(1)}</div>
                      <div className="flex items-center gap-3 pt-1">
                         <span className="text-xs font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg italic">ROI: {(metrics.roiSea*100).toFixed(0)}%</span>
                         <span className="text-xs font-bold text-slate-500">{(metrics.marginSea*100).toFixed(1)}% 利率</span>
                      </div>
                    </div>
                    <div className="space-y-2 opacity-50 transition-opacity hover:opacity-100">
                      <div className="text-xs uppercase font-black text-slate-500 tracking-tighter">空运模式 / 总毛利 (¥)</div>
                      <div className="text-3xl font-mono font-black text-sky-400">¥{metrics.profitAirUnit.toFixed(1)}</div>
                      <div className="flex items-center gap-3 pt-1">
                         <span className="text-xs font-black px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-lg italic">ROI: {(metrics.roiAir*100).toFixed(0)}%</span>
                         <span className="text-xs font-bold text-slate-500">{(metrics.marginAir*100).toFixed(1)}% 利率</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-800 space-y-5">
                     <div className="flex justify-between items-center text-indigo-400 bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                        <span className="text-sm font-black flex items-center gap-2"><CheckCircle className="w-5 h-5" /> 最终结汇到账 (¥)</span>
                        <span className="text-3xl font-mono font-black tracking-tight drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">¥{metrics.payoutCny.toFixed(2)}</span>
                     </div>
                  </div>

                  <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 shadow-inner">
                     <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                           <span className="text-xs text-emerald-500 font-black uppercase tracking-widest mb-1 text-shadow-sm">盈亏平衡建议售价 (MXN)</span>
                           <span className="text-xs text-slate-500 italic font-medium">在此价格成交 利润刚好对冲所有成本</span>
                        </div>
                        <span className="text-4xl font-mono font-black text-emerald-400 drop-shadow-sm">${metrics.breakEvenSellingMxn.toFixed(0)}</span>
                     </div>
                  </div>
                </div>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
              </section>

                <button 
                onClick={handleSave} disabled={saving}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                   <Save className="w-8 h-8" /> 
                   <span className="text-2xl">{saving ? '正在提交...' : '提交核价结果'}</span>
                </div>
                {!saving && <span className="text-xs opacity-70">结果将保存至“已核价清单”供后续审阅</span>}
              </button>

              {/* 同步到 SKU成本管理 区域 */}
              <div className="mt-8 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-inner group">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs shadow-sm shadow-indigo-500/10">SYNC</div>
                    <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest leading-none">同步到 SKU成本管理</h4>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                       <label className={labelCls}>选择目标 SKU 位置</label>
                       <select 
                         value={selectedSyncSku} 
                         onChange={e => setSelectedSyncSku(e.target.value)}
                         className={`${inputCls} h-12 bg-slate-900 border-slate-700 text-sm font-bold focus:border-indigo-500/50 shadow-inner transition-all`}
                       >
                         <option value="">-- 请选择现有 SKU 档案 --</option>
                         {allSkus.map(s => (
                           <option key={s.sku} value={s.sku}>{s.sku} | {s.product_name}</option>
                         ))}
                       </select>
                    </div>

                    <button 
                      onClick={handleSyncToCostManagement}
                      disabled={isSyncing || !selectedSyncSku}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:grayscale text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? '同步处理中...' : '快速覆盖同步核价'}
                    </button>
                    
                    <p className="text-[10px] text-indigo-400/50 font-bold italic text-center">
                      * 同步将立即更新“SKU成本管理”侧边栏中该 SKU 的所有成本细节
                    </p>
                 </div>
              </div>
              
              {errorMessage && (
                <div className="v2-card bg-rose-500/5 border-rose-500/20 p-4 flex gap-3 items-start">
                   <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                   <div>
                      <h4 className="text-xs font-bold text-rose-400 mb-1">保存失败</h4>
                      <p className="text-xs text-rose-400/80 leading-relaxed">{errorMessage}</p>
                   </div>
                </div>
              )}
              
              <div className="v2-card bg-amber-500/5 border-amber-500/20 p-4 flex gap-3 items-start">
                 <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-xs text-amber-400/80 font-medium leading-relaxed">
                   提示：核价逻辑已严格对齐跨境物流现实。抛重按照长宽高/6000计算，海运按照单方运价，空运取实重与抛重之大者。
                 </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {isSuccessView && (
              <div className="v2-card bg-slate-900/30 p-3 flex items-center gap-3 mb-4">
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Filter className="w-4 h-4" /> 排序方式:
                </div>
                {[
                  { label: '按时间', key: 'created_at' },
                  { label: '按利润', key: 'margin' },
                  { label: '按采购额', key: 'total_purchase' },
                  { label: '按状态', key: 'operation_status' }
                ].map(sort => (
                  <button
                    key={sort.key}
                    onClick={() => setSortConfig({ 
                      key: sort.key, 
                      order: sortConfig.key === sort.key && sortConfig.order === 'desc' ? 'asc' : 'desc' 
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      sortConfig.key === sort.key 
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                        : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    {sort.label} {sortConfig.key === sort.key && (sortConfig.order === 'desc' ? '↓' : '↑')}
                  </button>
                ))}
              </div>
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="v2-card overflow-hidden">
            <div className="v2-table-wrapper">
              <table className="v2-table">
                <thead className="v2-table-thead">
                  <tr>
                    <th className="v2-table-th">产品信息 (点击预览)</th>
                    <th className="v2-table-th">利润率</th>
                    <th className="v2-table-th">采购详情 (总额/数量/单价)</th>
                    <th className="v2-table-th">物流模式</th>
                    <th className="v2-table-th">比索售价</th>
                    <th className="v2-table-th">核价人</th>
                    {isSuccessView && <th className="v2-table-th">当前状态</th>}
                    <th className="v2-table-th text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {records.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-20 text-center text-slate-500 italic text-xs">NO RECORDS FOUND</td></tr>
                  ) : sortedRecords.map(rec => (
                    <tr key={rec.id} className="v2-table-tr group">
                      <td className="v2-table-td">
                         <div className="flex items-center gap-3">
                            <div className="relative group/img cursor-pointer" onClick={() => setDetailRecord(rec)}>
                              <img 
                                src={rec.image_url || 'https://via.placeholder.com/80'} 
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-lg object-cover border border-slate-700 shadow-sm transition-all group-hover/img:ring-2 group-hover/img:ring-indigo-400/50" 
                              />
                              <div className="absolute inset-0 bg-indigo-500/0 group-hover/img:bg-indigo-500/10 flex items-center justify-center rounded-lg transition-all">
                                 <Search className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100" />
                              </div>
                            </div>
                            <div className="max-w-[180px]">
                               <div className="text-sm font-bold text-slate-200 truncate" title={rec.name}>{rec.name || '未命名产品'}</div>
                               <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5 uppercase">
                                  <span>型号: {rec.model || '--'}</span>
                                  {rec.competitor_link && (
                                     <a href={rec.competitor_link} target="_blank" className="text-sky-400 hover:text-sky-300"><ExternalLink className="w-3 h-3" /></a>
                                  )}
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="v2-table-td">
                         <div className="inline-flex flex-col">
                            <div className="text-base font-mono font-bold text-emerald-400 leading-none">{(rec.margin || 0).toFixed(1)}%</div>
                            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter mt-1">MARGIN ONLY</div>
                         </div>
                      </td>
                      <td className="v2-table-td">
                         <div className="space-y-0.5">
                            <div className="text-xs font-mono font-bold text-sky-300">总额: ¥{(rec.replenishment_qty * rec.purchase_price_cny).toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                               {rec.replenishment_qty} PSC × ¥{rec.purchase_price_cny}
                            </div>
                         </div>
                      </td>
                      <td className="v2-table-td">
                         <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                            rec.logistics_mode === '空运' 
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                         }`}>
                            {rec.logistics_mode === '空运' ? <Plane className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                            <span className="uppercase tracking-wide whitespace-nowrap">
                               {rec.logistics_mode === '空运' ? '空运模式' : '海运模式'}
                            </span>
                         </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="space-y-0.5">
                           <div className="text-sm font-mono font-bold text-slate-200">{rec.selling_price_mxn} MXN</div>
                           <div className="text-xs text-slate-600 font-bold italic">EX: {rec.exchange_rate}</div>
                        </div>
                      </td>
                      <td className="v2-table-td">
                         <span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-bold text-slate-400">{rec.auditor || '系统'}</span>
                      </td>
                      {isSuccessView && (
                        <td className="v2-table-td">
                          <select 
                            value={rec.operation_status || '待采购'} 
                            onChange={(e) => updateOperationStatus(rec.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-slate-300 outline-none focus:border-sky-500/50 transition-colors"
                          >
                            {operationStatuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="v2-table-td text-right">
                         <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleRollback(rec)} 
                              className="px-2.5 py-1 bg-slate-800 text-sky-400 hover:bg-sky-500/10 rounded flex items-center gap-1 text-xs font-bold transition-all"
                            >
                               <ArrowLeftCircle className="w-3 h-3" /> 回退
                            </button>
                            {isListView && (
                               <>
                                 <button onClick={() => updateStatus(rec.id, 'success')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-emerald-500/20 transition-all"><CheckCircle className="w-3 h-3" /> 确认</button>
                                 <button onClick={() => updateStatus(rec.id, 'staging')} className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-amber-500/20 transition-all"><Inbox className="w-3 h-3" /> 暂存</button>
                               </>
                            )}
                            <button onClick={() => deleteRecord(rec.id)} className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* 详情侧边栏 (Details Drawer) */}
          <AnimatePresence>
            {detailRecord && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setDetailRecord(null)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                />
                <motion.div 
                  initial={{ x: '100%' }} 
                  animate={{ x: 0 }} 
                  exit={{ x: '100%' }}
                  className="fixed top-0 right-0 h-full w-[500px] bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[60] overflow-y-auto border-l border-slate-800"
                >
                  <div className="p-6">
                     <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                           <Info className="w-5 h-5 text-indigo-400" /> 核价原始数据详情
                        </h3>
                        <button onClick={() => setDetailRecord(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                           <X className="w-5 h-5 text-slate-500" />
                        </button>
                     </div>

                     <div className="space-y-5">
                        {/* 产品预览 */}
                        <div className="flex gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-800">
                           <img src={detailRecord.image_url} referrerPolicy="no-referrer" className="w-20 h-20 rounded-lg object-cover bg-slate-700" />
                           <div className="flex flex-col justify-center">
                              <div className="text-base font-bold text-white">{detailRecord.name}</div>
                              <div className="text-xs text-slate-400 uppercase mt-1">型号: {detailRecord.model || '--'}</div>
                              <div className="text-xs font-mono text-slate-600 mt-2 uppercase tracking-tighter">ID: {detailRecord.id}</div>
                           </div>
                        </div>

                        {/* 数据网格 */}
                        {[
                          { title: '基础采购信息', items: [
                              { l: 'SKU 编码', v: detailRecord.sku },
                              { l: '补货数量', v: `${detailRecord.replenishment_qty} PCS` },
                              { l: '采购单价', v: `¥${detailRecord.purchase_price_cny}` },
                              { l: '总采购额', v: `¥${(detailRecord.replenishment_qty * detailRecord.purchase_price_cny).toLocaleString()}`, highlight: true },
                              { l: '核价人员', v: detailRecord.auditor || '系统' },
                              { l: '采购链接', v: detailRecord.purchase_link, isLink: true },
                              { l: '竞品链接', v: detailRecord.competitor_link, isLink: true },
                          ]},
                          { title: '平台财务策略', items: [
                              { l: '售价 (比索)', v: `$${detailRecord.selling_price_mxn}` },
                              { l: '当前汇率', v: detailRecord.exchange_rate },
                              { l: '佣金率', v: `${(detailRecord.commission_rate * 100).toFixed(1)}%` },
                              { l: '固定费 (自动)', v: `$${detailRecord.fixed_fee}` },
                              { l: '尾程费 (自动)', v: `$${detailRecord.last_mile_fee}` },
                              { l: '投放比例', v: `${(detailRecord.ad_rate * 100).toFixed(1)}%` },
                              { l: '税率', v: `${(detailRecord.tax_rate * 100).toFixed(2)}%` },
                          ]},
                          { title: '物流物理指标', items: [
                              { l: '单品尺寸', v: `${detailRecord.unit_length}x${detailRecord.unit_width}x${detailRecord.unit_height} cm` },
                              { l: '单品重量', v: `${detailRecord.product_weight} kg` },
                              { l: '整箱规格', v: `${detailRecord.box_length}x${detailRecord.box_width}x${detailRecord.box_height} cm` },
                              { l: '装箱数量', v: `${detailRecord.pack_count} PSC/箱` },
                              { l: '整箱重量', v: `${detailRecord.box_weight} kg` },
                          ]}
                        ].map(sec => (
                          <div key={sec.title} className="space-y-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">{sec.title}</h4>
                             <div className="bg-slate-800/50 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/50">
                                {sec.items.map(item => (
                                  <div key={item.l} className="flex items-center justify-between p-3 px-4">
                                     <span className="text-[11px] font-medium text-slate-500">{item.l}</span>
                                     {item.isLink && item.v ? (
                                        <a href={item.v} target="_blank" className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1">访问链接 <ExternalLink className="w-3 h-3" /></a>
                                     ) : (
                                        <span className={`text-sm font-mono font-bold ${item.highlight ? 'text-indigo-400' : 'text-slate-200'}`}>{item.v || '--'}</span>
                                     )}
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}

                        <div className="pt-6 space-y-3">
                           <button 
                             onClick={() => { handleRollback(detailRecord); setDetailRecord(null); }}
                             className="w-full py-3 bg-indigo-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                           >
                              <ArrowLeftCircle className="w-5 h-5" /> 回退至计算器重新编辑
                           </button>
                        </div>
                     </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
