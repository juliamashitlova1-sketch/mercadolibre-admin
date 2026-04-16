import { useState, useEffect } from 'react';
import { Package, PlusCircle, PackageOpen, BarChart, Save, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';

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

  return (
    <div className="max-w-4xl mx-auto py-3 space-y-5 w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">SKU 每日管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理 SKU 档案并录入每日运营数据</p>
        </div>
        {msg && (
          <span className="ml-auto px-4 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</span>
        )}
      </div>

      <button onClick={onCreateNew}
        className="flex items-center gap-2 px-5 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
        <PlusCircle className="w-4 h-4" /> 新建 SKU 档案
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skuList.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 font-medium">暂无 SKU 档案</p>
            <p className="text-sm text-slate-300 mt-1">点击上方按钮创建你的第一个 SKU</p>
          </div>
        ) : skuList.map(item => (
          <div key={item.sku}
            className="group bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-base font-bold text-primary tracking-wide">{item.sku}</div>
                  <div className="text-sm text-slate-600 mt-0.5 truncate">{item.name || '未命名'}</div>
                </div>
                <div className="shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.sku); }} disabled={deleting === item.sku}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="删除此 SKU">✕
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 pb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                💰 采购价 ¥{Number(item.purchasePrice).toFixed(2)}
              </span>
            </div>

            <button onClick={() => onFillDaily(item.sku)}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-100 text-sm font-semibold text-blue-600 hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center justify-center gap-2 group/btn">
              <span>填写今日数据</span>
              <span className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
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
  const inputCls = "w-full h-11 px-4 text-sm border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]";

  const handleSave = async () => {
    if (!form.sku.trim()) { setMsg('请输入SKU编码'); setMsgType('error'); return; }
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
      setMsg('创建成功！'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto py-3 space-y-5 w-full">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        ← 返回 SKU 列表
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <PlusCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">新建 SKU 档案</h2>
          <p className="text-xs text-slate-400 mt-0.5">填写基本信息后，即可开始每日数据录入</p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-white to-emerald-50/20 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 space-y-6">
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">SKU 编码 *</label>
            <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
              className={`${inputCls} font-mono`} placeholder="例如: A16 / B07 / 蓝牙耳机Pro" autoFocus />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">SKU 中文名称</label>
            <input value={form.skuName} onChange={e => setForm(p => ({ ...p, skuName: e.target.value }))}
              className={inputCls} placeholder="例如: 蓝牙耳机 Pro Max - 黑色" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">
              采购价 <span className="font-normal text-slate-400">(元/CNY)</span>
            </label>
            <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))}
              className={inputCls} placeholder="例如: 25.00" />
          </div>

          {msg && (
            <div className={`px-4 py-2.5 rounded-xl text-sm text-center ${msgType === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {msgType === 'success' ? '✅ ' : '❌ '}{msg}
            </div>
          )}
        </div>

        <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200/60 flex justify-end gap-3">
          <button onClick={onBack}
            className="px-6 h-11 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-8 h-11 rounded-xl text-sm font-semibold transition-all ${
              saving ? 'bg-slate-300 text-slate-500' :
              'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-200 active:scale-[0.98]'
            }`}>
            {saving ? '创建中...' : '创建 SKU'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 子组件3：每日数据录入 ---
function DailyDataView({ selectedSku, onBack, existingData, onSaveSuccess }: {
  selectedSku: string, onBack: () => void,
  existingData?: SKUStats, onSaveSuccess: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    sales: '', orders: '',
    stock: '', inTransitStock: '', inProductionStock: '',
    avgSalesSinceListing: '', leadTimeDays: '7', slowStock: '',
    sellingPrice: '', unitProfitExclAds: '',
    adSpend: '', impressions: '', clicks: '', adOrders: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const imp = Number(form.impressions) || 0;
  const cli = Number(form.clicks) || 0;
  const spend = Number(form.adSpend) || 0;
  const salesVal = Number(form.sales) || 0;
  const autoCpc = spend > 0 && cli > 0 ? ((spend * 7.2) / cli).toFixed(2) + '美元' : '0.00美元';
  const autoRoas = spend > 0 && salesVal > 0 ? (salesVal / spend).toFixed(2) : '0.00';
  const autoAcos = spend > 0 && salesVal > 0 ? (spend / salesVal * 100).toFixed(2) + '%' : '0.00%';

  const inputCls = "w-full h-11 px-4 text-sm border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]";
  const autoInputCls = "w-full h-11 px-4 text-sm bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/50 rounded-xl font-mono tracking-wide";
  const labelCls = "text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide";

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const docId = `${selectedSku}_${today}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: selectedSku,
        date: today,
        sales: Number(form.sales) || 0, orders: Number(form.orders) || 0,
        stock: Number(form.stock) || 0,
        in_transit_stock: Number(form.inTransitStock) || 0,
        in_production_stock: Number(form.inProductionStock) || 0,
        avg_sales_since_listing: Number(form.avgSalesSinceListing) || 0,
        lead_time_days: Number(form.leadTimeDays) || 7,
        slow_stock: Number(form.slowStock) || 0,
        selling_price: Number(form.sellingPrice) || 0,
        unit_profit_excl_ads: Number(form.unitProfitExclAds) || 0,
        ad_spend: Number(form.adSpend) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        ad_orders: Number(form.adOrders) || 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;

      const cpcNum = cli > 0 ? (spend * 7.2 / cli) : 0;
      const roasNum = salesVal > 0 ? (salesVal / spend) : 0;
      const acosNum = salesVal > 0 ? (spend / salesVal * 100) : 0;
      await supabase.from('sku_stats').update({ cpc: cpcNum, roas: roasNum, acos: acosNum }).eq('doc_id', docId);

      setMsg('保存成功！'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => { setMsg(''); }, 2500);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto py-3 space-y-5 w-full">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        ← 返回 SKU 列表
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <BarChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[18px] font-bold text-slate-800">每日数据录入</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span className="font-mono font-bold text-primary">{selectedSku}</span>
            <span className="text-slate-300">|</span>
            <span>{existingData?.skuName || ''}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{today}</span>
          </div>
        </div>
        {msg && (
          <span className={`ml-auto px-4 py-2 rounded-lg text-xs font-medium ${
            msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>{msgType === 'success' ? '✅ ' : '❌ '}{msg}</span>
        )}
      </div>

      <div className="bg-gradient-to-b from-white to-blue-50/20 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 pb-10 space-y-8">
          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center"><span className="text-indigo-600 text-xs font-bold">01</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">销售与库存</span>
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div><label className={labelCls}>今日销售额（MXN）</label><input type="number" step="0.01" value={form.sales} onChange={e=>handleChange('sales',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>今日订单量</label><input type="number" value={form.orders} onChange={e=>handleChange('orders',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><label className={labelCls}>当前全部库存</label><input type="number" value={form.stock} onChange={e=>handleChange('stock',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>在途库存（在途）</label><input type="number" value={form.inTransitStock} onChange={e=>handleChange('inTransitStock',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>生产中库存（生产）</label><input type="number" value={form.inProductionStock} onChange={e=>handleChange('inProductionStock',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelCls}>上架至今均销</label><input type="number" step="0.001" value={form.avgSalesSinceListing} onChange={e=>handleChange('avgSalesSinceListing',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>头程时效（天）</label><input type="number" value={form.leadTimeDays} onChange={e=>handleChange('leadTimeDays',e.target.value)} className={inputCls} defaultValue="7"/></div>
              <div><label className={labelCls}>滞销库存（&gt;60d）</label><input type="number" value={form.slowStock} onChange={e=>handleChange('slowStock',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
          </section>

          <div className="border-t border-slate-200/60"/>

          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><span className="text-amber-600 text-xs font-bold">02</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">财务成本</span>
            </h3>
            <div className="grid grid-cols-3 gap-5">
              <div><label className={labelCls}>当时售价（MXN）</label><input type="number" step="0.01" value={form.sellingPrice} onChange={e=>handleChange('sellingPrice',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>单品利润-透明广告(MXN)</label><input type="number" step="0.01" value={form.unitProfitExclAds} onChange={e=>handleChange('unitProfitExclAds',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
          </section>

          <div className="border-t border-slate-200/60"/>

          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><span className="text-emerald-600 text-xs font-bold">03</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">广告与竞争</span>
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div><label className={labelCls}>广告消耗</label><input type="number" value={form.adSpend} onChange={e=>handleChange('adSpend',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>曝光</label><input type="number" value={form.impressions} onChange={e=>handleChange('impressions',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>点击</label><input type="number" value={form.clicks} onChange={e=>handleChange('clicks',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>广告订单</label><input type="number" value={form.adOrders} onChange={e=>handleChange('adOrders',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-3 font-medium uppercase tracking-widest">自动计算指标</p>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">CPC <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoCpc} className={autoInputCls}/></div>
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">ROAS <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoRoas} className={autoInputCls}/></div>
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">ACOS % <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoAcos} className={autoInputCls}/></div>
              </div>
            </div>
          </section>
        </div>

        <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">数据将同步至 Supabase 云端数据库</div>
          <button onClick={handleSave} disabled={saving}
            className={`px-10 h-12 rounded-xl text-sm font-semibold transition-all shadow-lg ${
              saving ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' :
              'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]'
            }`}>
            {saving ? (<span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> 保存中...</span>) :
             (<span className="flex items-center gap-2"><Save className="w-4 h-4"/> 保 存</span>)}
          </button>
        </div>
      </div>
    </div>
  );
}
