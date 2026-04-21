import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Package, PlusCircle, PackageOpen, BarChart, Save, RefreshCw, X, ArrowRight, ChevronLeft, Trash2, ImagePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getMexicoDateString } from '../lib/time';
import { USD_TO_MXN } from '../constants';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  refreshSkuData: () => void;
  onEditSku: (sku: SKUStats | null, mode?: 'full' | 'competitors') => void;
}

const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400;
      let width = img.width;
      let height = img.height;
      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export default function SkuManage() {
  const { skuData, allSkuData, refreshSkuData } = useOutletContext<ContextType>();
  const [step, setStep] = useState<'list' | 'new' | 'daily'>('list');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [skuList, setSkuList] = useState<{sku: string; name: string; purchasePrice: string; imageUrl: string}[]>([]);

  useEffect(() => {
    let metaDict: Record<string, { listedAt?: string; name?: string; purchasePrice?: string }> = {};
    try { metaDict = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}'); } catch {}

    const unique = new Map<string, {sku: string; name: string; purchasePrice: string; imageUrl: string}>();
    skuData.forEach(s => {
      if (!unique.has(s.sku)) {
        const m = metaDict[s.sku];
        unique.set(s.sku, { 
          sku: s.sku, 
          name: m?.name || s.skuName || '', 
          purchasePrice: m?.purchasePrice || String(s.purchasePrice || ''),
          imageUrl: s.imageUrl || ''
        });
      }
    });
    setSkuList(Array.from(unique.values()));
  }, [skuData]);

  if (step === 'new') {
    return <CreateSkuView onBack={() => setStep('list')} onSuccess={() => setStep('list')} onSaveSuccess={refreshSkuData} />;
  }

  if (step === 'daily') {
    const existing = selectedDate 
      ? allSkuData.find(s => s.sku === selectedSku && s.date === selectedDate)
      : undefined;

    return <DailyDataView 
      selectedSku={selectedSku} 
      onBack={() => setStep('list')}
      existingData={existing}
      onSaveSuccess={refreshSkuData}
    />;
  }

  return <SkuListView 
    skuList={skuList} 
    allSkuData={allSkuData}
    skuData={skuData}
    onCreateNew={() => setStep('new')} 
    onFillDaily={(sku) => { setSelectedSku(sku); setSelectedDate(null); setStep('daily'); }}
    onEditDaily={(sku, date) => { setSelectedSku(sku); setSelectedDate(date); setStep('daily'); }}
    onSaveSuccess={refreshSkuData}
  />;
}

// --- 状态下拉选择器 (Portal-based to escape overflow:hidden) ---
function StatusDropdown({ sku, current, options, style, onChange }: {
  sku: string;
  current: string;
  options: { value: string; color: string }[];
  style: { value: string; color: string };
  onChange: (sku: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const DOT_COLORS: Record<string, string> = {
    '在售': 'bg-emerald-500',
    '在途': 'bg-sky-500',
    '未采购': 'bg-amber-500',
    '补货中': 'bg-violet-500',
    '停售': 'bg-rose-500',
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border cursor-pointer transition-colors ${style.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[current] || 'bg-slate-400'}`} />
        {current}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className="fixed w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-2"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(sku, opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2.5 hover:bg-slate-50 ${opt.value === current ? 'bg-sky-50' : ''}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLORS[opt.value] || 'bg-slate-400'}`} />
              <span>{opt.value}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// --- 子组件1：SKU列表 ---
function SkuListView({ skuList, allSkuData, skuData, onCreateNew, onFillDaily, onEditDaily, onSaveSuccess }: {
  skuList: {sku: string; name: string; purchasePrice: string; imageUrl: string}[],
  allSkuData: SKUStats[],
  skuData: SKUStats[],
  onCreateNew: () => void, onFillDaily: (sku: string) => void, onEditDaily: (sku: string, date: string) => void, onSaveSuccess: () => void
}) {
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const STATUS_OPTIONS = [
    { value: '在售', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { value: '在途', color: 'bg-sky-50 text-sky-600 border-sky-200' },
    { value: '未采购', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { value: '补货中', color: 'bg-violet-50 text-violet-600 border-violet-200' },
    { value: '停售', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  ];

  useEffect(() => {
    const statuses: Record<string, string> = {};
    skuList.forEach(item => {
      // Find the status from skuData
      const s = skuData.find(d => d.sku === item.sku);
      if (s?.status) statuses[item.sku] = s.status;
      else if (!statuses[item.sku]) statuses[item.sku] = '在售';
    });
    setSkuStatuses(statuses);
  }, [skuList, skuData]);

  const [skuStatuses, setSkuStatuses] = useState<Record<string, string>>({});

  const handleStatusChange = async (sku: string, status: string) => {
    // 1. Optimistic UI update
    setSkuStatuses(prev => ({ ...prev, [sku]: status }));
    
    // 2. Persist to shared DB
    try {
      const { error } = await supabase
        .from('sku_metadata')
        .upsert({ sku, status, updated_at: new Date().toISOString() }, { onConflict: 'sku' });
      
      if (error) throw error;
      
      // Secondary backup for responsiveness
      const next = { ...skuStatuses, [sku]: status };
      localStorage.setItem('milyfly_sku_statuses', JSON.stringify(next));
      
      onSaveSuccess(); // Trigger refresh to sync all computers
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getStatusStyle = (sku: string) => {
    const status = skuStatuses[sku] || '在售';
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const [uploading, setUploading] = useState<string | null>(null);

  const handleImageUpload = async (sku: string, files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(sku);
    
    compressImage(files[0], async (base64) => {
      try {
        // 1. Save base64 directly to the shared sku_metadata table
        const { error: imgUpsertError } = await supabase
          .from('sku_metadata')
          .upsert({ sku, image_url: base64, updated_at: new Date().toISOString() }, { onConflict: 'sku' });
        
        if (imgUpsertError) throw imgUpsertError;
        
        // 2. Local cache for instant availability
        try {
          const meta = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
          if (!meta[sku]) meta[sku] = {};
          meta[sku].image = base64;
          localStorage.setItem('milyfly_sku_metadata', JSON.stringify(meta));
        } catch {}

        onSaveSuccess();
      } catch (err: any) {
        console.error("Upload failed:", err);
        alert(`图片上传失败: ${err.message}`);
      } finally {
        setUploading(null);
      }
    });
  };

  const handleImageDelete = async (sku: string) => {
    if (!confirm(`确定要删除 SKU 「${sku}」的图片吗？`)) return;
    setUploading(sku);
    try {
      // 1. Delete from shared metadata
      const { error: imgDeleteError } = await supabase
        .from('sku_metadata')
        .update({ image_url: null })
        .eq('sku', sku);
      
      if (imgDeleteError) throw imgDeleteError;
      
      // 2. Remove from local storage to keep sync
      try {
        const meta = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
        if (meta[sku] && meta[sku].image) {
          delete meta[sku].image;
          localStorage.setItem('milyfly_sku_metadata', JSON.stringify(meta));
        }
      } catch {}
      
      onSaveSuccess();
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert(`图片删除失败: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`确认删除 SKU「${sku}」的所有记录？`)) return;
    setDeleting(sku);
    const { error } = await supabase.from('sku_stats').delete().like('doc_id', `${sku}_%`);
    // Also delete from shared metadata
    await supabase.from('sku_metadata').delete().eq('sku', sku);
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
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
            <Package className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-heading">SKU 全局控制面板</h2>
            <p className="text-sm text-slate-500 mt-1">管理 SKU 档案定义并录入每日运营数据</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {msg && (
            <motion.span initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
              {msg}
            </motion.span>
          )}
          <button onClick={onCreateNew} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> <span>新建 SKU 档案</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skuList.length === 0 ? (
          <div className="col-span-full glass-card p-16 text-center border-dashed border-slate-200">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-800 font-medium">未检测到任何活动的 SKU。</p>
            <p className="text-sm text-slate-500 mt-2">新建您的第一个 SKU 档案以开始监控。</p>
          </div>
        ) : skuList.map(item => (
          <motion.div variants={{hidden: {y:20, opacity:0}, visible: {y:0, opacity:1}}} key={item.sku}
            className="group glass-card p-0 flex flex-col relative overflow-hidden transition-all duration-300 hover:border-sky-300">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-6 pr-4 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xl font-bold text-slate-800 tracking-widest leading-tight">{item.sku}</div>
                    <div className="text-sm text-slate-500 mt-1 truncate">{item.name || '未命名资产'}</div>
                  </div>
                  <div className="relative group/img w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 transition-colors hover:border-sky-400 shadow-sm hover:shadow-sky-100">
                    {uploading === item.sku ? (
                       <RefreshCw className="w-5 h-5 text-sky-500 animate-spin" />
                    ) : item.imageUrl ? (
                       <div className="relative w-full h-full group/del">
                          <img src={item.imageUrl} alt="sku" className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleImageDelete(item.sku); }}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/del:opacity-100 transition-opacity hover:bg-rose-600 shadow-sm z-20"
                            title="删除图片"
                          >
                            <X className="w-3 h-3" />
                          </button>
                       </div>
                    ) : (
                       <ImagePlus className="w-5 h-5 text-slate-400 group-hover/img:text-sky-500 transition-colors" />
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleImageUpload(item.sku, e.target.files)}
                      title="点击上传 SKU 实拍图"
                    />
                  </div>
                </div>
                <button onClick={() => handleDelete(item.sku)} disabled={deleting === item.sku}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 relative z-10">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-mono font-medium border border-slate-200">
                  <span className="text-sky-500 mr-1.5">采购价</span> ¥{Number(item.purchasePrice).toFixed(2)}
                </span>
                <StatusDropdown
                  sku={item.sku}
                  current={skuStatuses[item.sku] || '在售'}
                  options={STATUS_OPTIONS}
                  style={getStatusStyle(item.sku)}
                  onChange={handleStatusChange}
                />
              </div>
            </div>

            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                <span>历史记录查阅与修改</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <select 
                  className="flex-1 h-9 rounded-lg border border-slate-200 text-sm px-2 bg-white focus:outline-none focus:border-sky-400 font-mono text-slate-700 shadow-sm"
                  onChange={(e) => {
                    if (e.target.value) onEditDaily(item.sku, e.target.value);
                  }}
                  value=""
                >
                  <option value="" disabled>选择已有日期 ({allSkuData.filter(s=>s.sku===item.sku).length}条)</option>
                  {allSkuData.filter(s=>s.sku===item.sku).sort((a,b)=>b.date.localeCompare(a.date)).map(d => (
                    <option key={d.date} value={d.date}>{d.date} • 销量: {d.orders}</option>
                  ))}
                </select>
                <button onClick={() => onFillDaily(item.sku)}
                  className="h-9 px-3 bg-sky-500 text-white rounded-lg text-sm font-bold hover:bg-sky-600 transition-colors shrink-0 flex items-center gap-1 shadow-sm">
                  <PlusCircle className="w-3.5 h-3.5"/> 新建
                </button>
              </div>
            </div>
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
  const [form, setForm] = useState({ sku: '', skuName: '', purchasePrice: '', image: '', listedAt: getMexicoDateString() });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const inputGroupCls = "relative rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all shadow-sm";
  const inputCls = "w-full h-12 px-4 bg-transparent text-slate-800 text-sm focus:outline-none placeholder:text-slate-400";

  const handleSave = async () => {
    if (!form.sku.trim()) { setMsg('SKU is required.'); setMsgType('error'); return; }
    setSaving(true); setMsg('');
    try {
      // Image is already stored as base64 in form.image, passing it as imageUrl
      // if it exists, but we strip it from sku_stats to avoid column errors
      let imageUrl = form.image || '';

      const docId = `${form.sku.trim()}_${getMexicoDateString()}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: form.sku.trim(),
        sku_name: form.skuName.trim() || '未命名',
        date: getMexicoDateString(),
        purchase_price: Number(form.purchasePrice) || 0,
        sales: 0, orders: 0, stock: 0
      }, { onConflict: 'doc_id' });
      if (error) throw error;

      // Also write to shared metadata table for global sync
      await supabase.from('sku_metadata').upsert({
        sku: form.sku.trim(),
        name: form.skuName.trim() || '未命名',
        purchase_price: Number(form.purchasePrice) || 0,
        listed_at: form.listedAt,
        image_url: imageUrl || undefined,
        updated_at: new Date().toISOString()
      }, { onConflict: 'sku' });

      try {
        const meta = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
        meta[form.sku.trim()] = { 
          listedAt: form.listedAt,
          name: form.skuName.trim(),
          purchasePrice: form.purchasePrice,
          image: imageUrl || undefined
        };
        localStorage.setItem('milyfly_sku_metadata', JSON.stringify(meta));
      } catch {}
      setMsg('SKU Deployed Successfully.'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto py-6 space-y-8 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 返回主面板
      </button>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
          <PlusCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-heading">新建 SKU 资产档案</h2>
          <p className="text-sm text-slate-500 mt-1">初始化基础参数以便长期追踪监控。</p>
        </div>
      </div>

      <div className="glass-panel p-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-8 space-y-6 relative z-10">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">资产唯一编码 (SKU) *</label>
            <div className={inputGroupCls}>
              <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                className={`${inputCls} font-mono text-sky-600 font-bold placeholder:font-sans placeholder:font-normal`} placeholder="例如：A16-PRO" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">资产名称 (可选)</label>
            <div className={inputGroupCls}>
              <input value={form.skuName} onChange={e => setForm(p => ({ ...p, skuName: e.target.value }))}
                className={inputCls} placeholder="例如：无线耳机 v2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">产品上架时间 (Listing Date) *</label>
            <div className={inputGroupCls}>
              <input type="date" value={form.listedAt} onChange={e => setForm(p => ({ ...p, listedAt: e.target.value }))}
                className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
              基础采购成本 <span className="font-normal text-slate-400 normal-case">(CNY/RMB)</span>
            </label>
            <div className={inputGroupCls}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono">¥</div>
              <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))}
                className={`${inputCls} pl-8 font-mono`} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">产品主图 (图片)</label>
            <div className="flex items-center gap-4">
              <div className="relative group/img w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 transition-colors hover:border-sky-300">
                {form.image ? (
                   <img src={form.image} alt="upload" className="w-full h-full object-cover" />
                ) : (
                   <ImagePlus className="w-6 h-6 text-slate-300 group-hover/img:text-sky-400 transition-colors" />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      compressImage(file, (base64) => {
                        setForm(p => ({...p, image: base64 }));
                      });
                    }
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                建议上传 1:1 比例商品实拍或渲染图 <br />
                (仅保存在浏览器本地以供控制台极速预览)
              </p>
            </div>
          </div>

          <AnimatePresence>
            {msg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
                  msgType === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                {msgType === 'success' ? <Save className="w-4 h-4" /> : <X className="w-4 h-4" />} {msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-4 relative z-10">
          <button onClick={onBack} className="px-6 h-11 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">取消</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[140px] flex justify-center">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : '执行创建档案'}
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
  const [logDate, setLogDate] = useState(existingData?.date || getMexicoDateString());
  const [form, setForm] = useState({
    orders: existingData?.orders !== undefined ? String(existingData.orders) : '', 
    stock: existingData?.stock !== undefined ? String(existingData.stock) : '', 
    inTransitStock: existingData?.inTransitStock !== undefined ? String(existingData.inTransitStock) : '', 
    inProductionStock: existingData?.inProductionStock !== undefined ? String(existingData.inProductionStock) : '', 
    slowStock: existingData?.slowStock !== undefined ? String(existingData.slowStock) : '',
    sellingPrice: existingData?.sellingPrice !== undefined ? String(existingData.sellingPrice) : '', 
    unitProfitExclAds: existingData?.unitProfitExclAds !== undefined ? String(existingData.unitProfitExclAds) : '',
    adSpend: existingData?.adSpend !== undefined ? String((existingData.adSpend / USD_TO_MXN).toFixed(2)) : '', 
    impressions: existingData?.impressions !== undefined ? String(existingData.impressions) : '', 
    clicks: existingData?.clicks !== undefined ? String(existingData.clicks) : '', 
    adOrders: existingData?.adOrders !== undefined ? String(existingData.adOrders) : '',
    specs: existingData?.specs || '',
    reviewCount: existingData?.reviewCount !== undefined ? String(existingData.reviewCount) : '',
    rating: existingData?.rating !== undefined ? String(existingData.rating) : '',
  });

  // Whenever existingData changes, re-sync state immediately
  useEffect(() => {
    if (existingData) {
      setLogDate(existingData.date);
      setForm({
        orders: String(existingData.orders), 
        stock: String(existingData.stock), 
        inTransitStock: String(existingData.inTransitStock), 
        inProductionStock: String(existingData.inProductionStock), 
        slowStock: String(existingData.slowStock),
        sellingPrice: String(existingData.sellingPrice), 
        unitProfitExclAds: String(existingData.unitProfitExclAds),
        adSpend: String((existingData.adSpend / 17.15).toFixed(2)), 
        impressions: String(existingData.impressions), 
        clicks: String(existingData.clicks), 
        adOrders: String(existingData.adOrders),
        specs: existingData.specs || '',
        reviewCount: String(existingData.reviewCount || 0),
        rating: String(existingData.rating || 0),
      });
    }
  }, [existingData]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const imp = Number(form.impressions) || 0;
  const cli = Number(form.clicks) || 0;
  const spendUsd = Number(form.adSpend) || 0;
  const spendMxn = spendUsd * USD_TO_MXN;
  const autoComputedSales = (Number(form.orders) || 0) * (Number(form.sellingPrice) || 0);
  const salesVal = autoComputedSales;
  
  const autoCpc = spendUsd > 0 && cli > 0 ? (spendUsd / cli).toFixed(2) + ' USD' : '0.00 USD';
  const salesUsd = salesVal / USD_TO_MXN;
  
  // 核心变更：ACOS/ROAS 基于广告订单计算
  const adOrdersVal = Number(form.adOrders) || 0;
  const adSalesUsd = (adOrdersVal * (Number(form.sellingPrice) || 0)) / USD_TO_MXN;
  
  const autoRoas = spendUsd > 0 && adSalesUsd > 0 ? (adSalesUsd / spendUsd).toFixed(2) : '0.00';
  const autoAcos = spendUsd > 0 && adSalesUsd > 0 ? ((spendUsd / adSalesUsd) * 100).toFixed(2) + '%' : '0.00%';
  const autoTacos = spendUsd > 0 && salesUsd > 0 ? ((spendUsd / salesUsd) * 100).toFixed(2) + '%' : '0.00%';

  // 库存周转预览
  const context = useOutletContext<ContextType>();
  const currentSkuInfo = context.skuData.find(s => s.sku === selectedSku);
  const velocity = currentSkuInfo?.avgSalesSinceListing || 0.1;
  const stockVal = Number(form.stock) || 0;
  const autoDohOnHand = Math.floor(stockVal / velocity);

  const inputGroupCls = "relative rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all shadow-sm";
  const inputCls = "w-full h-11 px-4 bg-transparent text-slate-800 text-sm focus:outline-none placeholder:text-slate-400 font-mono";
  const labelCls = "text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-wider";

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const docId = `${selectedSku}_${logDate}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, 
        sku: selectedSku, 
        date: logDate,
        sku_name: currentSkuInfo?.skuName || '',
        purchase_price: currentSkuInfo?.purchasePrice || 0,
        sales: autoComputedSales, 
        orders: Number(form.orders) || 0,
        stock: Number(form.stock) || 0, 
        in_transit_stock: Number(form.inTransitStock) || 0,
        in_production_stock: Number(form.inProductionStock) || 0,
        slow_stock: Number(form.slowStock) || 0,
        avg_sales_since_listing: 0,
        lead_time_days: 90,
        selling_price: Number(form.sellingPrice) || 0, 
        unit_profit_excl_ads: Number(form.unitProfitExclAds) || 0,
        ad_spend: spendMxn, 
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0, 
        ad_orders: Number(form.adOrders) || 0,
        specs: form.specs || '',
        review_count: Number(form.reviewCount) || 0,
        rating: Number(form.rating) || 0,
        competitors: existingData?.competitors || [],
      }, { onConflict: 'doc_id' });
      if (error) throw error;

      // --- Automated Operational Logging ---
      const changes: string[] = [];
      if (existingData) {
        if (Number(form.sellingPrice) !== existingData.sellingPrice) 
          changes.push(`价格: $${existingData.sellingPrice} -> $${form.sellingPrice}`);
        if (form.specs !== existingData.specs) 
          changes.push(`规格: [${existingData.specs || '空'}] -> [${form.specs || '空'}]`);
        if (Number(form.reviewCount) !== (existingData.reviewCount || 0)) 
          changes.push(`评价数: ${existingData.reviewCount || 0} -> ${form.reviewCount}`);
        if (Number(form.rating) !== (existingData.rating || 0)) 
          changes.push(`评分: ${existingData.rating || 0} -> ${form.rating}`);
      }

      if (changes.length > 0) {
        const actionMessage = changes.join('; ');
        await supabase.from('operation_logs').upsert([{
          date: logDate,
          sku: selectedSku,
          action: `[自动记录-管理页] ${actionMessage}`,
          details: JSON.stringify({
            sku: selectedSku,
            date: logDate,
            actionType: 'Other',
            description: actionMessage
          }),
          created_at: new Date().toISOString()
        }]);
      }
      // -------------------------------------

      const cpcNum = cli > 0 ? (spendUsd / cli) : 0;
      const salesUsdForDb = salesVal / USD_TO_MXN;
      
      const adOrdersNumForDb = Number(form.adOrders) || 0;
      const adSalesUsdForDb = (adOrdersNumForDb * (Number(form.sellingPrice) || 0)) / USD_TO_MXN;
      
      const roasNum = spendUsd > 0 ? (adSalesUsdForDb / spendUsd) : 0;
      const acosNum = adSalesUsdForDb > 0 ? ((spendUsd / adSalesUsdForDb) * 100) : 0;
      const tacosNum = salesUsdForDb > 0 ? ((spendUsd / salesUsdForDb) * 100) : 0;
      
      await supabase.from('sku_stats').update({ 
        cpc: cpcNum, 
        roas: roasNum, 
        acos: acosNum,
        tacos: tacosNum 
      }).eq('doc_id', docId);

      setMsg('Intel logged successfully.'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => setMsg(''), 2500);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto py-6 space-y-8 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 返回主面板
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
            <BarChart className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 font-heading tracking-wide">数据录入终端</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 font-mono">
              <span className="text-sky-600 font-bold text-sm px-2 py-0.5 bg-sky-50 rounded border border-sky-100">{selectedSku}</span>
              <span className="text-slate-300">目标录入日期：</span>
              <input 
                type="date" 
                value={logDate} 
                onChange={(e) => setLogDate(e.target.value)} 
                className="bg-transparent border-b border-dashed border-emerald-300 text-emerald-600 font-bold focus:outline-none focus:border-emerald-500 py-0.5" 
              />
            </div>
          </div>
        </div>
        {msg && (
          <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`px-4 py-2 rounded-xl text-xs font-medium border ${
            msgType === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}>{msg}</motion.span>
        )}
      </div>

      <div className="glass-panel p-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-50 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 pb-10 space-y-10 relative z-10">
          {/* Section 1 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                <span className="text-indigo-600 text-xs font-bold font-mono">01</span>
              </div>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-widest font-heading">销售与库存核心数据</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelCls}>总销售额 (MXN)<span className="ml-2 text-sky-500 normal-case">(系统自动计算)</span></label>
                <div className={`${inputGroupCls} bg-sky-50/50 border-sky-100`}>
                  <input type="number" readOnly value={autoComputedSales.toFixed(2)} className={`${inputCls} text-sky-600 font-bold`} />
                </div>
              </div>
              <div><label className={labelCls}>订单总数</label><div className={inputGroupCls}><input type="number" value={form.orders} onChange={e=>handleChange('orders',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><label className={labelCls}>在手库存</label><div className={inputGroupCls}><input type="number" value={form.stock} onChange={e=>handleChange('stock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>滞销库存 (&gt;60天)</label><div className={inputGroupCls}><input type="number" value={form.slowStock} onChange={e=>handleChange('slowStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className={labelCls}>在途库存</label><div className={inputGroupCls}><input type="number" value={form.inTransitStock} onChange={e=>handleChange('inTransitStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>在产库存</label><div className={inputGroupCls}><input type="number" value={form.inProductionStock} onChange={e=>handleChange('inProductionStock',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 2 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
                <span className="text-amber-500 text-xs font-bold font-mono">02</span>
              </div>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-widest font-heading">财务关键指标</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className={labelCls}>当前真实售价 (MXN)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.sellingPrice} onChange={e=>handleChange('sellingPrice',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>我的规格</label><div className={inputGroupCls}><input value={form.specs} onChange={e=>handleChange('specs',e.target.value)} className={inputCls} placeholder="例如: 黑色-加厚款"/></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div><label className={labelCls}>评价数量</label><div className={inputGroupCls}><input type="number" value={form.reviewCount} onChange={e=>handleChange('reviewCount',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>产品评分 (0-5)</label><div className={inputGroupCls}><input type="number" step="0.1" value={form.rating} onChange={e=>handleChange('rating',e.target.value)} className={inputCls} placeholder="0.0"/></div></div>
            </div>
            <div className="mt-6">
              <label className={labelCls}>单件毛利(不含广告) (CNY)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.unitProfitExclAds} onChange={e=>handleChange('unitProfitExclAds',e.target.value)} className={inputCls} placeholder="0.00"/></div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 3 */}
          <section>
            <h3 className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                <span className="text-emerald-500 text-xs font-bold font-mono">03</span>
              </div>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-widest font-heading">营销与广告投放</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div><label className={labelCls}>广告费 (USD)</label><div className={inputGroupCls}><input type="number" step="0.01" value={form.adSpend} onChange={e=>handleChange('adSpend',e.target.value)} className={inputCls} placeholder="0.00"/></div></div>
              <div><label className={labelCls}>总曝光量</label><div className={inputGroupCls}><input type="number" value={form.impressions} onChange={e=>handleChange('impressions',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>总点击量</label><div className={inputGroupCls}><input type="number" value={form.clicks} onChange={e=>handleChange('clicks',e.target.value)} className={inputCls} placeholder="0"/></div></div>
              <div><label className={labelCls}>广告带来订单数</label><div className={inputGroupCls}><input type="number" value={form.adOrders} onChange={e=>handleChange('adOrders',e.target.value)} className={inputCls} placeholder="0"/></div></div>
            </div>
            
            <div className="bg-sky-50/50 rounded-xl p-5 border border-sky-100">
              <p className="text-[10px] text-sky-600 mb-4 font-bold uppercase tracking-widest flex items-center gap-2"><BarChart className="w-3 h-3"/> 系统自动计算指标</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">单次点击成本 (CPC)</label>
                  <div className="h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 text-slate-600 font-mono text-sm shadow-sm">{autoCpc}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">投资回报率 (ROAS)</label>
                  <div className="h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 text-emerald-600 font-mono text-sm font-bold shadow-sm">{autoRoas}</div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">广告占比 (TACOS)</label>
                  <div className="h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 text-sky-500 font-mono text-sm font-bold shadow-sm">{autoTacos}</div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">广告转化成本 (ACOS)</label>
                  <div className="h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 text-amber-500 font-mono text-sm font-bold shadow-sm">{autoAcos}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-sky-100/50">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">现货周转 (Days)</label>
                  <div className={`h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 font-mono text-sm font-bold shadow-sm ${autoDohOnHand < 10 ? 'text-rose-500' : 'text-slate-600'}`}>{autoDohOnHand} 天</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">日均销量参考</label>
                  <div className="h-10 px-4 bg-white rounded-lg flex items-center border border-slate-200 text-slate-400 font-mono text-sm shadow-sm">{velocity.toFixed(2)} /天</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Supabase 数据库连接正常
            </div>
            {existingData && (
              <button
                onClick={async () => {
                  if (!confirm(`确认删除 ${selectedSku} 在 ${logDate} 的全部数据？此操作不可撤销！`)) return;
                  setDeleting(true);
                  try {
                    const docId = `${selectedSku}_${logDate}`;
                    const { error } = await supabase.from('sku_stats').delete().eq('doc_id', docId);
                    if (error) throw error;
                    setMsg('数据已永久删除'); setMsgType('success');
                    onSaveSuccess();
                    setTimeout(() => onBack(), 800);
                  } catch (err: any) { setMsg(err.message); setMsgType('error'); }
                  finally { setDeleting(false); }
                }}
                disabled={deleting}
                className="px-4 h-10 rounded-xl text-sm font-medium text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? '正在删除...' : '删除此日数据'}
              </button>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[200px] flex justify-center py-3">
            {saving ? (<span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> 数据传输中...</span>) :
             (<span className="flex items-center gap-2"><Save className="w-4 h-4"/> 确认提交并同步至云端</span>)}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
