import { useState, useEffect } from 'react';
import { Package, PlusCircle, PackageOpen, BarChart, Save, RefreshCw, X, ArrowRight, ChevronLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface ContextType {
  skuData: SKUStats[];
  refreshSkuData: () => void;
  onEditSku: (sku: SKUStats | null) => void;
}

export default function SkuManage() {
  const { skuData, refreshSkuData } = useOutletContext<ContextType>();
  const [step, setStep] = useState<'list' | 'new' | 'daily'>('list');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [skuList, setSkuList] = useState<{sku: string; name: string; purchasePrice: string}[]>([]);

  useEffect(() => {
    const unique = new Map<string, {sku: string; name: string; purchasePrice: string}>();
    skuData.forEach(s => {
      if (!unique.has(s.sku)) {
        unique.set(s.sku, { sku: s.sku, name: s.skuName || '', purchasePrice: String(s.purchasePrice || '') });
      }
    });
    setSkuList(Array.from(unique.values()));
  }, [skuData]);

  if (step === 'new') {
    return <CreateSkuView onBack={() => setStep('list')} onSuccess={() => setStep('list')} onSaveSuccess={refreshSkuData} />;
  }

  if (step === 'daily') {
    return <DailyDataView 
      selectedSku={selectedSku} 
      onBack={() => setStep('list')}
      existingData={skuData.find(s => s.sku === selectedSku)}
      onSaveSuccess={refreshSkuData}
    />;
  }

  return <SkuListView 
    skuList={skuList} 
    onCreateNew={() => setStep('new')} 
    onFillDaily={(sku) => { setSelectedSku(sku); setStep('daily'); }}
    onSaveSuccess={refreshSkuData}
  />;
}

// --- 子组件1：SKU列表 ---
function SkuListView({ skuList, onCreateNew, onFillDaily, onSaveSuccess }: {
  skuList: {sku: string; name: string; purchasePrice: string}[],
  onCreateNew: () => void, onFillDaily: (sku: string) => void, onSaveSuccess: () => void
}) {
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (sku: string) => {
    if (!confirm(`确认删除 SKU「${sku}」的所有记录？`)) return;
    setDeleting(sku);
    const { error } = await supabase.from('sku_stats').delete().like('doc_id', `${sku}_%`);
    if (error) setMsg(`删除失败: ${error.message}`);
    else { setMsg('已删除'); onSaveSuccess(); setTimeout(() => setMsg(''), 2000); }
    setDeleting(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-5xl mx-auto py-6 space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center animate-glow">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-heading">SKU Master Control</h2>
            <p className="text-sm text-slate-400 mt-1">Manage definitions and log daily operations</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {msg && (
            <motion.span initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {msg}
            </motion.span>
          )}
          <button onClick={onCreateNew} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> <span>Deploy New SKU</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skuList.length === 0 ? (
          <div className="col-span-full glass-card p-16 text-center border-dashed border-white/20">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-white font-medium">No active SKUs detected.</p>
            <p className="text-sm text-slate-500 mt-2">Deploy your first SKU to begin monitoring.</p>
          </div>
        ) : skuList.map(item => (
          <motion.div variants={{hidden: {y:20, opacity:0}, visible: {y:0, opacity:1}}} key={item.sku}
            className="group glass-card p-0 flex flex-col relative overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between relative z-10">
                <div className="min-w-0 pr-4">
                  <div className="font-mono text-xl font-bold text-white tracking-widest">{item.sku}</div>
                  <div className="text-sm text-slate-400 mt-1 truncate">{item.name || 'Unnamed Asset'}</div>
                </div>
                <button onClick={() => handleDelete(item.sku)} disabled={deleting === item.sku}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-300 text-xs font-mono font-medium border border-white/5">
                  <span className="text-primary mr-1.5">CP</span> ¥{Number(item.purchasePrice).toFixed(2)}
                </span>
                <span className="inline-flex items-center px-2 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>

            <button onClick={() => onFillDaily(item.sku)}
              className="w-full px-6 py-4 bg-white/[0.02] border-t border-white/5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center justify-between group/btn relative z-10">
              <span>Log Daily Intel</span>
              <ArrowRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all text-primary" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// --- 子组件2：新建SKU档案 ---
function CreateSkuView({ onBack, onSuccess, onSaveSuccess }: {
  onBack: () => void, onSuccess: () => void, onSaveSuccess: () => void
}) {
  const [form, setForm] = useState({ sku: '', skuName: '', purchasePrice: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const inputGroupCls = "relative rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all";
  const inputCls = "w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600";

  const handleSave = async () => {
    if (!form.sku.trim()) { setMsg('SKU is required.'); setMsgType('error'); return; }
    setSaving(true); setMsg('');
    try {
      const docId = `${form.sku.trim()}_${format(new Date(), 'yyyy-MM-dd')}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: form.sku.trim(),
        sku_name: form.skuName.trim() || '未命名',
        date: format(new Date(), 'yyyy-MM-dd'),
        purchase_price: Number(form.purchasePrice) || 0,
        sales: 0, orders: 0, stock: 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;
      setMsg('SKU Deployed Successfully.'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto py-6 space-y-8 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Matrix
      </button>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center animate-glow shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <PlusCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white font-heading">Deploy SKU Asset</h2>
          <p className="text-sm text-slate-400 mt-1">Initialize base parameters for long-term tracking.</p>
        </div>
      </div>

      <div className="glass-panel p-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-8 space-y-6 relative z-10">
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Asset UID (SKU) *</label>
            <div className={inputGroupCls}>
              <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                className={`${inputCls} font-mono text-primary font-bold placeholder:font-sans placeholder:font-normal`} placeholder="e.g. A16-PRO" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Asset Designation</label>
            <div className={inputGroupCls}>
              <input value={form.skuName} onChange={e => setForm(p => ({ ...p, skuName: e.target.value }))}
                className={inputCls} placeholder="e.g. Wireless Earbuds v2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
              Procurement Base <span className="font-normal text-slate-500 normal-case">(CNY/RMB)</span>
            </label>
            <div className={inputGroupCls}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">¥</div>
              <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))}
                className={`${inputCls} pl-8 font-mono`} placeholder="0.00" />
            </div>
          </div>

          <AnimatePresence>
            {msg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
                  msgType === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                {msgType === 'success' ? <Save className="w-4 h-4" /> : <X className="w-4 h-4" />} {msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 py-5 bg-white/[0.02] border-t border-white/5 flex justify-end gap-4 relative z-10">
          <button onClick={onBack} className="px-6 h-11 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[140px] flex justify-center">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Execute Deployment'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- 子组件3：每日数据录入 ---
function DailyDataView({ selectedSku, onBack, existingData, onSaveSuccess }: {
  selectedSku: string, onBack: () => void, existingData?: SKUStats, onSaveSuccess: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    sales: '', orders: '', stock: '', inTransitStock: '', inProductionStock: '',
    avgSalesSinceListing: '', leadTimeDays: '7', slowStock: '',
    sellingPrice: '', unitProfitExclAds: '',
    adSpend: '', impressions: '', clicks: '', adOrders: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const imp = Number(form.impressions) || 0;
  const cli = Number(form.clicks) || 0;
  const spendUsd = Number(form.adSpend) || 0;
  const spendMxn = spendUsd * 17.15;
  const salesVal = Number(form.sales) || 0;
  
  const autoCpc = spendUsd > 0 && cli > 0 ? (spendUsd / cli).toFixed(2) + ' USD' : '0.00 USD';
  const autoRoas = spendMxn > 0 && salesVal > 0 ? (salesVal / spendMxn).toFixed(2) : '0.00';
  const autoAcos = spendMxn > 0 && salesVal > 0 ? ((spendMxn / salesVal) * 100).toFixed(2) + '%' : '0.00%';

  const inputGroupCls = "relative rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all";
  const inputCls = "w-full h-11 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600 font-mono";
  const labelCls = "text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-wider";

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const docId = `${selectedSku}_${today}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: selectedSku, date: today,
        sales: Number(form.sales) || 0, orders: Number(form.orders) || 0,
        stock: Number(form.stock) || 0, in_transit_stock: Number(form.inTransitStock) || 0,
        in_production_stock: Number(form.inProductionStock) || 0,
        avg_sales_since_listing: Number(form.avgSalesSinceListing) || 0,
        lead_time_days: Number(form.leadTimeDays) || 7,
        slow_stock: Number(form.slowStock) || 0,
        selling_price: Number(form.sellingPrice) || 0, unit_profit_excl_ads: Number(form.unitProfitExclAds) || 0,
        ad_spend: spendMxn, impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0, ad_orders: Number(form.adOrders) || 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;

      const cpcNum = cli > 0 ? (spendUsd / cli) : 0;
      const roasNum = spendMxn > 0 ? (salesVal / spendMxn) : 0;
      const acosNum = salesVal > 0 ? ((spendMxn / salesVal) * 100) : 0;
      await supabase.from('sku_stats').update({ cpc: cpcNum, roas: roasNum, acos: acosNum }).eq('doc_id', docId);

      setMsg('Intel logged successfully.'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => setMsg(''), 2500);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto py-6 space-y-8 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Matrix
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <BarChart className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-heading tracking-wide">Terminal Input</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
              <span className="text-primary font-bold">{selectedSku}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">{today}</span>
            </div>
          </div>
        </div>
        {msg && (
          <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`px-4 py-2 rounded-xl text-xs font-medium border ${
            msgType === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>{msg}</motion.span>
        )}
      </div>

      <div className="glass-panel p-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 pb-10 space-y-10 relative z-10">
          {/* Section 1 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <span className="text-indigo-400 text-xs font-bold font-mono">01</span>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-widest font-heading">Sales & Inventory Core</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><label className={labelCls}>Gross Revenue (MXN)</label><div className={inputGroupCls}><input type="number" value={form.sales} onChange={e=>handleChange('sales',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>Order Volume</label><div className={inputGroupCls}><input type="number" value={form.orders} onChange={e=>handleChange('orders',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div><label className={labelCls}>On-Hand Stock</label><div className={inputGroupCls}><input type="number" value={form.stock} onChange={e=>handleChange('stock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>In-Transit Stock</label><div className={inputGroupCls}><input type="number" value={form.inTransitStock} onChange={e=>handleChange('inTransitStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>In-Production Stock</label><div className={inputGroupCls}><input type="number" value={form.inProductionStock} onChange={e=>handleChange('inProductionStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className={labelCls}>Avg. Velocity (per day)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.avgSalesSinceListing} onChange={e=>handleChange('avgSalesSinceListing',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>Lead Time (Days)</label><div className={inputGroupCls}><input type="number" value={form.leadTimeDays} onChange={e=>handleChange('leadTimeDays',e.target.value)} className={inputCls} placeholder="7"/></div></div>
              <div><label className={labelCls}>Stagnant Stock (&gt;60d)</label><div className={inputGroupCls}><input type="number" value={form.slowStock} onChange={e=>handleChange('slowStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
          </section>

          <div className="border-t border-white/5" />

          {/* Section 2 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <span className="text-amber-400 text-xs font-bold font-mono">02</span>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-widest font-heading">Financial Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className={labelCls}>Current Price (MXN)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.sellingPrice} onChange={e=>handleChange('sellingPrice',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>Unit Profit Excl. Ads (MXN)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.unitProfitExclAds} onChange={e=>handleChange('unitProfitExclAds',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
            </div>
          </section>

          <div className="border-t border-white/5" />

          {/* Section 3 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <span className="text-emerald-400 text-xs font-bold font-mono">03</span>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-widest font-heading">Marketing & Ads</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div><label className={labelCls}>Ad Spend (USD)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.adSpend} onChange={e=>handleChange('adSpend',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>Impressions</label><div className={inputGroupCls}><input type="number" value={form.impressions} onChange={e=>handleChange('impressions',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>Clicks</label><div className={inputGroupCls}><input type="number" value={form.clicks} onChange={e=>handleChange('clicks',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>Ad Config Orders</label><div className={inputGroupCls}><input type="number" value={form.adOrders} onChange={e=>handleChange('adOrders',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            
            <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
              <p className="text-[10px] text-primary mb-4 font-bold uppercase tracking-widest flex items-center gap-2"><BarChart className="w-3 h-3"/> Auto-Calculated Metrics</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">CPC</label>
                  <div className="h-10 px-4 bg-white/[0.03] rounded-lg flex items-center border border-white/[0.05] text-slate-300 font-mono text-sm">{autoCpc}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">ROAS</label>
                  <div className="h-10 px-4 bg-white/[0.03] rounded-lg flex items-center border border-white/[0.05] text-emerald-400 font-mono text-sm font-bold">{autoRoas}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">ACOS</label>
                  <div className="h-10 px-4 bg-white/[0.03] rounded-lg flex items-center border border-white/[0.05] text-amber-400 font-mono text-sm font-bold">{autoAcos}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between relative z-10">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Supabase DB Connection Active
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[200px] flex justify-center py-3">
            {saving ? (<span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Transmitting...</span>) :
             (<span className="flex items-center gap-2"><Save className="w-4 h-4"/> Sync to Cloud</span>)}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
