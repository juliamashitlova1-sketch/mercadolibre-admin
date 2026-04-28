
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Package, TrendingUp, Search, Info, 
  Truck, Plane, ShoppingBag, CreditCard,
  RefreshCw, Calculator, AlertTriangle, Save, Box, Ruler, Scale
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SkuCostManagement() {
  const [skus, setSkus] = useState([]);
  const [pricingRecords, setPricingRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedData, setEditedData] = useState({}); // Stores locally edited state

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
      
      // Initialize local edited data with database values
      const initialEdited = {};
      skuData.forEach(s => {
        const p = priceMap[s.sku.toUpperCase()];
        initialEdited[s.sku.toUpperCase()] = {
          purchase_price_cny: parseFloat(s.cost_rmb) || p?.purchase_price_cny || 45,
          replenishment_qty: p?.replenishment_qty || 100,
          selling_price_mxn: parseFloat(s.price_mxn) || p?.selling_price_mxn || 450,
          exchange_rate: p?.exchange_rate || 0.3891,
          commission_rate: p?.commission_rate || 0.175,
          ad_rate: p?.ad_rate || 0.08,
          return_rate: p?.return_rate || 0.02,
          tax_rate: p?.tax_rate || 0.0905,
          box_length: p?.box_length || 40,
          box_width: p?.box_width || 30,
          box_height: p?.box_height || 30,
          pack_count: p?.pack_count || 100,
          box_weight: p?.box_weight || 15,
          unit_length: p?.unit_length || 10,
          unit_width: p?.unit_width || 5,
          unit_height: p?.unit_height || 5,
          product_weight: p?.product_weight || 0.15,
          logistics_mode: p?.logistics_mode || '海运',
          sea_freight_unit_price: p?.sea_freight_unit_price || 3100,
          air_freight_unit_price: p?.air_freight_unit_price || 95,
          fixed_fee: p?.fixed_fee || 0,
          last_mile_fee: p?.last_mile_fee || 0
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

  const calculateMetrics = (skuKey) => {
    const f = editedData[skuKey];
    if (!f) return null;

    // 1. Basic Dimensions
    const unitVolumetricWeight = (f.unit_length * f.unit_width * f.unit_height) / 6000;
    const ar59Weight = Math.max(f.product_weight, unitVolumetricWeight);
    
    // 2. Automatic Fees (Logic from Pricing.tsx)
    let calculatedFixed = 0;
    if (f.selling_price_mxn < 299) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);
      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];
      if (f.selling_price_mxn < 99) calculatedFixed = tableA[idx];
      else if (f.selling_price_mxn < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx];
    }

    let calculatedLastMile = 0;
    if (f.selling_price_mxn >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];
      if (f.selling_price_mxn <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }

    // 3. Platform Fees (MXN)
    const commissionMxn = f.selling_price_mxn * f.commission_rate;
    const adFeeMxn = f.selling_price_mxn * f.ad_rate;
    const returnFeeMxn = f.selling_price_mxn * f.return_rate;
    const taxMxn = f.selling_price_mxn * f.tax_rate;
    const totalFeesMxn = commissionMxn + calculatedFixed + calculatedLastMile + adFeeMxn + returnFeeMxn + taxMxn;
    const payoutMxn = f.selling_price_mxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchange_rate;

    // 4. Logistics (CNY)
    let logisticsCost = 0;
    if (f.logistics_mode === '空运') {
      const boxVolumetricWeight = (f.box_length * f.box_width * f.box_height) / 6000;
      const boxChargeableWeight = Math.max(f.box_weight, boxVolumetricWeight);
      logisticsCost = f.pack_count > 0 ? (boxChargeableWeight * f.air_freight_unit_price / f.pack_count) : 0;
    } else {
      const boxVolumeM3 = (f.box_length * f.box_width * f.box_height) / 1000000;
      logisticsCost = f.pack_count > 0 ? (boxVolumeM3 * f.sea_freight_unit_price / f.pack_count) : 0;
    }

    const unitProfitCny = payoutCny - f.purchase_price_cny - logisticsCost;
    const totalGrossProfitRmb = unitProfitCny * f.replenishment_qty;
    const margin = (f.selling_price_mxn * f.exchange_rate) > 0 ? (unitProfitCny / (f.selling_price_mxn * f.exchange_rate)) : 0;

    return {
      unitVolumetricWeight,
      ar59Weight,
      fixed_fee: calculatedFixed,
      last_mile_fee: calculatedLastMile,
      commissionMxn,
      adFeeMxn,
      taxMxn,
      totalFeesMxn,
      payoutCny,
      logisticsCost,
      unitProfitCny,
      totalGrossProfitRmb,
      margin
    };
  };

  const handleSave = async (sku) => {
    const skuKey = sku.toUpperCase();
    const f = editedData[skuKey];
    const m = calculateMetrics(skuKey);
    if (!f || !m) return;

    setIsSaving(true);
    try {
      const saveData = {
        sku: skuKey,
        purchase_price_cny: f.purchase_price_cny,
        replenishment_qty: f.replenishment_qty,
        selling_price_mxn: f.selling_price_mxn,
        exchange_rate: f.exchange_rate,
        commission_rate: f.commission_rate,
        ad_rate: f.ad_rate,
        return_rate: f.return_rate,
        tax_rate: f.tax_rate,
        box_length: f.box_length,
        box_width: f.box_width,
        box_height: f.box_height,
        pack_count: f.pack_count,
        box_weight: f.box_weight,
        unit_length: f.unit_length,
        unit_width: f.unit_width,
        unit_height: f.unit_height,
        product_weight: f.product_weight,
        logistics_mode: f.logistics_mode,
        sea_freight_unit_price: f.sea_freight_unit_price,
        air_freight_unit_price: f.air_freight_unit_price,
        fixed_fee: m.fixed_fee,
        last_mile_fee: m.last_mile_fee,
        margin: m.margin * 100,
        roi: (f.purchase_price_cny + m.logisticsCost) > 0 ? (m.unitProfitCny / (f.purchase_price_cny + m.logisticsCost)) : 0,
        status: 'priced'
      };

      const { error } = await supabase
        .from('sku_pricing')
        .upsert(saveData, { onConflict: 'sku' });

      if (error) throw error;
      alert(`SKU ${sku} 成本数据已保存`);
      fetchData();
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

  const inputCls = "w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-amber-500/50 transition-all";
  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 成本管理 (交互版)</h1>
              <p className="v2-header-subtitle">实时编辑参数并根据核价引擎分析利润</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索 SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-white outline-none focus:border-amber-500/50 transition-all w-64"
              />
            </div>
            <button onClick={fetchData} className="v2-button-secondary p-2"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </header>

        <div className="space-y-4">
          {isLoading ? (
            <div className="v2-card p-20 text-center">
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold">同步主档案与核价数据...</p>
            </div>
          ) : filteredSkus.map((skuItem) => {
            const skuKey = skuItem.sku.toUpperCase();
            const f = editedData[skuKey];
            const m = calculateMetrics(skuKey);
            if (!f || !m) return null;

            return (
              <motion.div 
                key={skuItem.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="v2-card bg-slate-900/40 border-slate-800 p-4 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Left: Info & Basic Inputs */}
                  <div className="xl:w-[250px] shrink-0 space-y-4 border-r border-slate-800 pr-6">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl border border-slate-700 overflow-hidden bg-slate-800 flex-shrink-0">
                        <img src={skuItem.image_url} alt="SKU" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{skuItem.sku}</div>
                        <div className="text-[10px] text-slate-500 font-bold truncate">{skuItem.product_name}</div>
                        <div className="mt-1 flex items-center gap-2">
                           <button onClick={() => handleSave(skuItem.sku)} disabled={isSaving} className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black hover:bg-emerald-500/20 transition-all">
                              <Save className="w-3 h-3" /> 保存修正
                           </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>采购价 (¥)</label>
                        <input type="number" step="0.1" value={f.purchase_price_cny} onChange={e => handleInputChange(skuItem.sku, 'purchase_price_cny', parseFloat(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>补货数量</label>
                        <input type="number" value={f.replenishment_qty} onChange={e => handleInputChange(skuItem.sku, 'replenishment_qty', parseInt(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>售价 (MXN)</label>
                        <input type="number" step="0.1" value={f.selling_price_mxn} onChange={e => handleInputChange(skuItem.sku, 'selling_price_mxn', parseFloat(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>物流模式</label>
                        <select value={f.logistics_mode} onChange={e => handleInputChange(skuItem.sku, 'logistics_mode', e.target.value)} className={inputCls}>
                          <option value="海运">海运模式</option>
                          <option value="空运">空运模式</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Fee Rates & Dimensions */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2"><CreditCard className="w-3 h-3" /> 费率参数 %</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {['佣金', '广告', '退货', '税率'].map((l, i) => {
                            const fields = ['commission_rate', 'ad_rate', 'return_rate', 'tax_rate'];
                            const field = fields[i];
                            return (
                              <div key={field}>
                                <label className={labelCls}>{l}</label>
                                <input type="number" step="0.01" value={(f[field] * 100).toFixed(1)} onChange={e => handleInputChange(skuItem.sku, field, parseFloat(e.target.value)/100)} className={inputCls} />
                              </div>
                            );
                          })}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2"><Ruler className="w-3 h-3" /> 单品规格</h4>
                       <div className="grid grid-cols-3 gap-1.5">
                          {['长', '宽', '高'].map((l, i) => {
                             const fields = ['unit_length', 'unit_width', 'unit_height'];
                             return <div key={l}><label className={labelCls}>{l}</label><input type="number" value={f[fields[i]]} onChange={e=>handleInputChange(skuItem.sku, fields[i], parseInt(e.target.value))} className={inputCls} /></div>
                          })}
                       </div>
                       <div>
                          <label className={labelCls}>单品实重 (kg)</label>
                          <input type="number" step="0.01" value={f.product_weight} onChange={e=>handleInputChange(skuItem.sku, 'product_weight', parseFloat(e.target.value))} className={inputCls} />
                       </div>
                    </div>

                    <div className="space-y-4 text-center border-x border-slate-800 px-4">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 justify-center"><Box className="w-3 h-3" /> 整箱计算</h4>
                       <div className="grid grid-cols-2 gap-3">
                          <div><label className={labelCls}>装箱数</label><input type="number" value={f.pack_count} onChange={e=>handleInputChange(skuItem.sku, 'pack_count', parseInt(e.target.value))} className={inputCls} /></div>
                          <div><label className={labelCls}>箱重 KG</label><input type="number" value={f.box_weight} onChange={e=>handleInputChange(skuItem.sku, 'box_weight', parseInt(e.target.value))} className={inputCls} /></div>
                       </div>
                       <div className="pt-2">
                          <label className={labelCls}>物流报价 (¥)</label>
                          <div className="flex gap-1">
                             <input type="number" value={f.logistics_mode === '海运' ? f.sea_freight_unit_price : f.air_freight_unit_price} onChange={e=>handleInputChange(skuItem.sku, f.logistics_mode === '海运' ? 'sea_freight_unit_price' : 'air_freight_unit_price', parseInt(e.target.value))} className={inputCls} />
                             <div className="px-1.5 py-1 bg-slate-800 rounded text-[9px] font-bold text-slate-500 whitespace-nowrap">{f.logistics_mode === '海运' ? '/m³' : '/kg'}</div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col justify-center">
                       <h4 className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2 mb-3"><Calculator className="w-3 h-3" /> 自动费用解析</h4>
                       <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between font-mono">
                             <span className="text-slate-500">固定费用 (Fixed)</span>
                             <span className="text-rose-400 font-bold">-${m.fixed_fee.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between font-mono">
                             <span className="text-slate-500">尾程费用 (L.M)</span>
                             <span className="text-rose-400 font-bold">-${m.last_mile_fee.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between font-mono pt-1 border-t border-slate-800">
                             <span className="text-slate-500">单品材积重 (kg)</span>
                             <span className="text-sky-400 font-bold">{m.unitVolumetricWeight.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between font-mono">
                             <span className="text-slate-500">物流分摊 (¥/P)</span>
                             <span className="text-indigo-400 font-bold">¥{m.logisticsCost.toFixed(1)}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Right: The Goal - Profit */}
                  <div className="xl:w-[220px] bg-gradient-to-br from-slate-900 to-black rounded-2xl p-5 border border-slate-800 relative overflow-hidden group/profit">
                     <div className="relative z-10 space-y-6">
                        <div className="space-y-1">
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">单品净利润</div>
                           <div className={`text-2xl font-mono font-black ${m.unitProfitCny > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              ¥{m.unitProfitCny.toFixed(1)}
                           </div>
                        </div>

                        <div className="space-y-1">
                           <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" /> 总毛利预估 (RMB)
                           </div>
                           <div className={`text-3xl font-mono font-black ${m.totalGrossProfitRmb > 0 ? 'text-amber-400 shadow-amber-900/20 drop-shadow-lg' : 'text-slate-300 opacity-50'}`}>
                              ¥{m.totalGrossProfitRmb.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                           </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-white/5">
                           <div className="text-center">
                              <div className="text-[9px] text-slate-500 font-bold uppercase">毛利率</div>
                              <div className="text-xs font-black text-slate-200">{(m.margin * 100).toFixed(1)}%</div>
                           </div>
                           <div className="text-center">
                              <div className="text-[9px] text-slate-500 font-bold uppercase">状态</div>
                              <div className={`text-xs font-black ${m.unitProfitCny > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {m.unitProfitCny > 10 ? '健康' : m.unitProfitCny > 0 ? '预警' : '亏损'}
                              </div>
                           </div>
                        </div>
                     </div>
                     {/* Decorative background glow */}
                     <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 transition-opacity -mr-16 -mt-16 ${m.unitProfitCny > 0 ? 'bg-emerald-500 group-hover/profit:opacity-20' : 'bg-rose-500 group-hover/profit:opacity-20'}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Footer Info */}
        <div className="mt-8 flex flex-wrap gap-4">
           <div className="flex-1 min-w-[300px] bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 flex gap-3 items-start">
             <Calculator className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-xs font-bold text-sky-300 mb-1">交互核价模式已就绪</h4>
                <p className="text-[10px] text-sky-400/70 leading-relaxed font-medium">
                  本模块现在允许直接在列表内调整任意运营参数。修改后点击 SKU 下方的 <strong>“保存修正”</strong> 即可将最新成本参数同步回云端数据库。所有计算逻辑已严格对齐 Mercado Libre 2026 最新官方费率梯度。
                </p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
