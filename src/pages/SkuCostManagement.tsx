
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Package, TrendingUp, Search, Info, 
  Truck, Plane, ShoppingBag, CreditCard,
  RefreshCw, Calculator, AlertTriangle, Save, Box, Ruler, Scale, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SkuCostManagement() {
  const [skus, setSkus] = useState([]);
  const [pricingRecords, setPricingRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedData, setEditedData] = useState({});
  const [expandedSkus, setExpandedSkus] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: skuData, error: skuError } = await supabase
        .from('skus')
        .select('*')
        .order('created_at', { ascending: false });
      if (skuError) throw skuError;

      const { data: priceData, error: priceError } = await supabase
        .from('sku_pricing')
        .select('*');
      if (priceError) throw priceError;

      const priceMap = {};
      priceData.forEach(item => {
        if (item.sku) priceMap[item.sku.toUpperCase()] = item;
      });

      setSkus(skuData || []);
      setPricingRecords(priceMap);
      
      const initialEdited = {};
      skuData.forEach(s => {
        const p = priceMap[s.sku.toUpperCase()];
        initialEdited[s.sku.toUpperCase()] = {
          purchasePriceCny: parseFloat(s.cost_rmb) || p?.purchase_price_cny || 45,
          replenishmentQty: p?.replenishment_qty || 100,
          sellingPriceMxn: parseFloat(s.price_mxn) || p?.selling_price_mxn || 450,
          exchangeRate: p?.exchange_rate || 0.3891,
          commissionRate: p?.commission_rate !== undefined ? p.commission_rate : 0.175,
          adRate: p?.ad_rate !== undefined ? p.ad_rate : 0.08,
          returnRate: p?.return_rate !== undefined ? p.return_rate : 0.02,
          taxRate: p?.tax_rate !== undefined ? p.tax_rate : 0.0905,
          boxLength: p?.box_length || 40,
          boxWidth: p?.box_width || 30,
          boxHeight: p?.box_height || 30,
          packCount: p?.pack_count || 100,
          boxWeight: p?.box_weight || 15,
          unitLength: p?.unit_length || 10,
          unitWidth: p?.unit_width || 5,
          unitHeight: p?.unit_height || 5,
          productWeight: p?.product_weight || 0.15,
          logisticsMode: p?.logistics_mode || '海运',
          seaFreightUnitPrice: p?.sea_freight_unit_price || 3100,
          airFreightUnitPrice: p?.air_freight_unit_price || 95,
          fixedFee: p?.fixed_fee || 0,
          lastMileFee: p?.last_mile_fee || 0
        };
      });
      setEditedData(initialEdited);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (sku, field, value) => {
    const skuKey = sku.toUpperCase();
    setEditedData(prev => ({
      ...prev,
      [skuKey]: {
        ...prev[skuKey],
        [field]: value
      }
    }));
  };

  const toggleExpand = (sku) => {
    setExpandedSkus(prev => ({
      ...prev,
      [sku]: !prev[sku]
    }));
  };

  // 完全对齐 Pricing.tsx 的 metrics 计算引擎
  const calculateSkuMetrics = (skuKey) => {
    const f = editedData[skuKey];
    if (!f) return null;

    // 1. 单品规格与抛重 (AR59)
    const singleUnitVolumetricWeight = (f.unitLength * f.unitWidth * f.unitHeight) / 6000;
    const ar59Weight = Math.max(f.productWeight, singleUnitVolumetricWeight);
    
    // 2. 自动化费用 (Fixed / Last Mile) - 严格对齐 Pricing.tsx 第 212-247 行
    let calculatedFixed = 0;
    if (f.sellingPriceMxn < 299) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);
      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];
      if (f.sellingPriceMxn < 99) calculatedFixed = tableA[idx];
      else if (f.sellingPriceMxn < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx]; // 199-298
    }

    let calculatedLastMile = 0;
    if (f.sellingPriceMxn >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];
      if (f.sellingPriceMxn <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }

    // 3. 平台费用 (MXN)
    const commissionMxn = f.sellingPriceMxn * f.commissionRate;
    const adFeeMxn = f.sellingPriceMxn * f.adRate;
    const returnFeeMxn = f.sellingPriceMxn * f.returnRate;
    const taxMxn = f.sellingPriceMxn * f.taxRate;
    const totalFeesMxn = commissionMxn + calculatedFixed + calculatedLastMile + adFeeMxn + returnFeeMxn + taxMxn;
    
    const payoutMxn = f.sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchangeRate;

    // 4. 物流分摊 (CNY) - 严格对齐 Pricing.tsx 第 61-77 行
    const boxCount = f.packCount > 0 ? (f.replenishmentQty / f.packCount) : 0;
    const singleBoxVolumeM3 = (f.boxLength * f.boxWidth * f.boxHeight) / 1000000;
    const singleBoxVolumetricWeight = (f.boxLength * f.boxWidth * f.boxHeight) / 6000;
    const singleBoxChargeableWeight = Math.max(f.boxWeight, singleBoxVolumetricWeight);
    
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    const seaFreightTotal = totalVolume * f.seaFreightUnitPrice;
    const seaFreightPerUnit = f.replenishmentQty > 0 ? (seaFreightTotal / f.replenishmentQty) : 0;
    
    const airFreightTotal = totalChargeableWeight * f.airFreightUnitPrice;
    const airFreightPerUnit = f.replenishmentQty > 0 ? (airFreightTotal / f.replenishmentQty) : 0;

    const currentFreightPerUnit = f.logisticsMode === '空运' ? airFreightPerUnit : seaFreightPerUnit;

    // 5. 盈亏指标
    const unitProfitCny = payoutCny - f.purchasePriceCny - currentFreightPerUnit;
    const totalGrossProfitRmb = unitProfitCny * f.replenishmentQty;
    const margin = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (unitProfitCny / (f.sellingPriceMxn * f.exchangeRate)) : 0;

    return {
      fixedFee: calculatedFixed,
      lastMileFee: calculatedLastMile,
      singleUnitVolumetricWeight,
      ar59Weight,
      commissionMxn,
      adFeeMxn,
      taxMxn,
      totalFeesMxn,
      payoutCny,
      freightPerUnit: currentFreightPerUnit,
      unitProfitCny,
      totalGrossProfitRmb,
      margin
    };
  };

  const handleSave = async (sku) => {
    const skuKey = sku.toUpperCase();
    const f = editedData[skuKey];
    const m = calculateSkuMetrics(skuKey);
    if (!f || !m) return;

    setIsSaving(true);
    try {
      const saveData = {
        sku: skuKey,
        purchase_price_cny: f.purchasePriceCny,
        replenishment_qty: f.replenishmentQty,
        selling_price_mxn: f.sellingPriceMxn,
        exchange_rate: f.exchangeRate,
        commission_rate: f.commissionRate,
        ad_rate: f.adRate,
        return_rate: f.returnRate,
        tax_rate: f.taxRate,
        box_length: f.boxLength,
        box_width: f.boxWidth,
        box_height: f.boxHeight,
        pack_count: f.packCount,
        box_weight: f.boxWeight,
        unit_length: f.unitLength,
        unit_width: f.unitWidth,
        unit_height: f.unitHeight,
        product_weight: f.productWeight,
        logistics_mode: f.logisticsMode,
        sea_freight_unit_price: f.seaFreightUnitPrice,
        air_freight_unit_price: f.airFreightUnitPrice,
        fixed_fee: m.fixedFee,
        last_mile_fee: m.lastMileFee,
        margin: m.margin * 100,
        roi: (f.purchasePriceCny + m.freightPerUnit) > 0 ? (m.unitProfitCny / (f.purchasePriceCny + m.freightPerUnit)) : 0,
        status: 'priced'
      };

      const { error } = await supabase
        .from('sku_pricing')
        .upsert(saveData, { onConflict: 'sku' });

      if (error) throw error;
      alert(`SKU ${sku} 数据同步成功`);
    } catch (err) {
      console.error('Error saving data:', err);
      alert('保存失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSkus = useMemo(() => {
    return skus.filter(s => 
      s.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skus, searchTerm]);

  const inputCls = "w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all";
  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-indigo-600">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 成本精密管理 (完全对齐核价模型)</h1>
              <p className="v2-header-subtitle">实时应用新品核价逻辑进行全流程成本穿透分析</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索 SKU 实名或代号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-white outline-none focus:border-sky-500/50 transition-all w-64"
              />
            </div>
            <button onClick={fetchData} className="v2-button-secondary p-2"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </header>

        <div className="space-y-4">
          {isLoading ? (
            <div className="v2-card p-20 text-center">
              <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest">正在加载跨表精密数据...</p>
            </div>
          ) : filteredSkus.map((skuItem) => {
            const skuKey = skuItem.sku.toUpperCase();
            const f = editedData[skuKey];
            const m = calculateSkuMetrics(skuKey);
            if (!f || !m) return null;
            const isExpanded = expandedSkus[skuKey];

            return (
              <motion.div 
                key={skuItem.id}
                layout
                className="v2-card bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
              >
                {/* Main Condensed View */}
                <div className="p-4 flex flex-col lg:flex-row items-center gap-6">
                  {/* Part 1: Identity & Vital Profit */}
                  <div className="lg:w-[280px] shrink-0 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-800 shadow-xl flex-shrink-0">
                      <img src={skuItem.image_url} alt="SKU" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate group-hover:text-sky-400 transition-colors uppercase tracking-tight">{skuItem.sku}</div>
                      <div className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">{skuItem.product_name}</div>
                      <div className="mt-2 flex items-center gap-2">
                         <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${m.unitProfitCny > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            ¥{m.unitProfitCny.toFixed(1)} / Psc
                         </div>
                         <button onClick={()=>toggleExpand(skuKey)} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
                           {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                         </button>
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Top Level Core Inputs */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className={labelCls}>采购单价 (¥)</label><input type="number" step="0.1" value={f.purchasePriceCny} onChange={e => handleInputChange(skuItem.sku, 'purchasePriceCny', parseFloat(e.target.value))} className={inputCls} /></div>
                    <div><label className={labelCls}>补货数量</label><input type="number" value={f.replenishmentQty} onChange={e => handleInputChange(skuItem.sku, 'replenishmentQty', parseInt(e.target.value))} className={inputCls} /></div>
                    <div><label className={labelCls}>Mercado 售价</label><input type="number" step="0.1" value={f.sellingPriceMxn} onChange={e => handleInputChange(skuItem.sku, 'sellingPriceMxn', parseFloat(e.target.value))} className={`${inputCls} border-emerald-500/30 text-emerald-400 font-bold`} /></div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                       <label className={labelCls}>总结汇 (¥)</label>
                       <div className="text-xl font-mono font-black text-sky-400">¥{m.payoutCny.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Part 3: Total Profit Highlight */}
                  <div className="lg:w-[240px] px-6 py-3 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-2xl shadow-lg relative overflow-hidden group">
                     <div className="relative z-10">
                        <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">本批次总毛利 (RMB)</div>
                        <div className="text-2xl font-mono font-black text-white drop-shadow-md">
                           ¥{m.totalGrossProfitRmb.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                           <span className="text-[9px] font-black text-white/70 uppercase">Margin: {(m.margin*100).toFixed(1)}%</span>
                           <button onClick={() => handleSave(skuItem.sku)} disabled={isSaving} className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-black shadow-sm active:scale-95 transition-all">
                              {isSaving ? '...' : '保存修改'}
                           </button>
                        </div>
                     </div>
                     <TrendingUp className="absolute -bottom-2 -right-2 w-16 h-16 text-white/10 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                {/* Expanded Sections: Dimensional & Fees Analysis */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 'auto' }} 
                      exit={{ height: 0 }}
                      className="border-t border-slate-800 bg-slate-950/30 overflow-hidden"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Dimensional Subgrid */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><Ruler className="w-3 h-3" /> 单品 & 物流模式</h4>
                           <div className="flex gap-2 mb-3">
                              <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '海运')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg border text-[10px] font-black transition-all ${f.logisticsMode === '海运' ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><Truck className="w-3.5 h-3.5" /> 海运</button>
                              <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '空运')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg border text-[10px] font-black transition-all ${f.logisticsMode === '空运' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><Plane className="w-3.5 h-3.5" /> 空运</button>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                             <div><label className={labelCls}>计费单价 (¥)</label><input type="number" value={f.logisticsMode === '海运' ? f.seaFreightUnitPrice : f.airFreightUnitPrice} onChange={e=>handleInputChange(skuItem.sku, f.logisticsMode==='海运'?'seaFreightUnitPrice':'airFreightUnitPrice', parseFloat(e.target.value))} className={inputCls} /></div>
                             <div><label className={labelCls}>实重 (kg)</label><input type="number" step="0.01" value={f.productWeight} onChange={e=>handleInputChange(skuItem.sku, 'productWeight', parseFloat(e.target.value))} className={inputCls} /></div>
                           </div>
                           <div className="grid grid-cols-3 gap-1.5">
                              {['长', '宽', '高'].map((l, i) => {
                                 const fields = ['unitLength', 'unitWidth', 'unitHeight'];
                                 return <div key={l}><label className={labelCls}>{l}</label><input type="number" value={f[fields[i]]} onChange={e=>handleInputChange(skuItem.sku, fields[i], parseInt(e.target.value))} className={inputCls} /></div>
                              })}
                           </div>
                        </div>

                        {/* Fee Tiers Grid */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><CreditCard className="w-3 h-3" /> 运营费率剖析 %</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {['平台佣金', '广告比例', '退货比例', '税率比'].map((l, i) => {
                                 const fNames = ['commissionRate', 'adRate', 'returnRate', 'taxRate'];
                                 const fn = fNames[i];
                                 return <div key={l}><label className={labelCls}>{l}</label><input type="number" value={(f[fn]*100).toFixed(1)} onChange={e=>handleInputChange(skuItem.sku, fn, parseFloat(e.target.value)/100)} className={inputCls} /></div>
                              })}
                           </div>
                           <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                              <div className="flex justify-between text-[10px]"><span className="text-slate-500">自动解析固定费:</span> <span className="text-rose-400 font-bold">-${m.fixedFee.toFixed(1)}</span></div>
                              <div className="flex justify-between text-[10px]"><span className="text-slate-500">自动解析尾程费:</span> <span className="text-rose-400 font-bold">-${m.lastMileFee.toFixed(1)}</span></div>
                              <div className="flex justify-between text-[10px] border-t border-slate-800 pt-1.5 mt-1.5"><span className="text-slate-500">此模式物流分摊:</span> <span className="text-sky-400 font-bold">¥{m.freightPerUnit.toFixed(1)}</span></div>
                           </div>
                        </div>

                        {/* Box Specifics Grid */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><Box className="w-3 h-3" /> 装箱精密数据</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className={labelCls}>装箱数量</label><input type="number" value={f.packCount} onChange={e=>handleInputChange(skuItem.sku, 'packCount', parseInt(e.target.value))} className={inputCls} /></div>
                              <div><label className={labelCls}>整箱实重 KG</label><input type="number" step="0.1" value={f.boxWeight} onChange={e=>handleInputChange(skuItem.sku, 'boxWeight', parseFloat(e.target.value))} className={inputCls} /></div>
                           </div>
                           <div className="grid grid-cols-3 gap-1.5">
                              {['箱长', '箱宽', '箱高'].map((l, i) => {
                                 const fields = ['boxLength', 'boxWidth', 'boxHeight'];
                                 return <div key={l}><label className={labelCls}>{l}</label><input type="number" value={f[fields[i]]} onChange={e=>handleInputChange(skuItem.sku, fields[i], parseInt(e.target.value))} className={inputCls} /></div>
                              })}
                           </div>
                        </div>

                        {/* Analytic Context */}
                        <div className="bg-slate-800/20 rounded-2xl p-4 flex flex-col justify-between border border-slate-800/50">
                           <div>
                              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-3"><Scale className="w-3 h-3" /> 材积重校验</h4>
                              <div className="space-y-2">
                                 <div className="text-[11px] text-slate-400 flex justify-between font-mono"><span>单品抛重:</span> <span className="text-white">{m.singleUnitVolumetricWeight.toFixed(3)} kg</span></div>
                                 <div className="text-[11px] text-slate-400 flex justify-between font-mono"><span>尾程权重:</span> <span className="text-white">{m.ar59Weight.toFixed(3)} kg</span></div>
                                 <div className="mt-4 p-2 bg-indigo-500/10 rounded-lg text-[9px] text-indigo-300 italic font-medium leading-relaxed">
                                    根据 Mercado Libre 算法，当重量或材积超过对应梯度时，将自动切换费用策略。
                                 </div>
                              </div>
                           </div>
                           <button onClick={()=>handleSave(skuItem.sku)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                              <Save className="w-3.5 h-3.5 text-sky-400" /> 同步逻辑数据
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Legend / Info Section */}
        <div className="mt-6 flex flex-wrap gap-4">
           <div className="flex-1 min-w-[300px] bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 flex gap-3 items-start shadow-sm">
             <Calculator className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-xs font-bold text-sky-300 mb-1">精密核价引擎已同步完成</h4>
                <p className="text-[10px] text-sky-400/70 leading-relaxed font-medium">
                  本模块计算算法现已 <strong>100% 对齐“侧边栏新品核价”</strong> 模块。包括单品材积重计算、多梯度固定费、五阶尾程费、海空运分摊策略等。所有输入项均支持实时生效。点击各个 SKU 可展开详细的规格参数编辑界面。
                </p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
