import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, User, Tag, AlertCircle, Clock, CheckCircle2, XCircle, Filter, Loader2, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SoftwareSuggestion } from '../types';

export default function SoftwareSuggestions() {
  const [suggestions, setSuggestions] = useState<SoftwareSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    user_name: '',
    category: 'Feature Request' as SoftwareSuggestion['category'],
    content: '',
    priority: 'Medium' as SoftwareSuggestion['priority']
  });

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('software_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01') {
           console.warn('software_suggestions table not found');
           setSuggestions([]);
           return;
        }
        throw error;
      }
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_name || !form.content) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('software_suggestions')
        .insert([{
          ...form,
          status: 'pending'
        }]);
      
      if (error) throw error;
      
      setForm({ user_name: '', category: 'Feature Request', content: '', priority: 'Medium' });
      setShowForm(false);
      fetchSuggestions();
      alert('感谢您的建议！我们将认真评估。');
    } catch (err: any) {
      alert('提交失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: SoftwareSuggestion['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'reviewed': return <Filter className="w-4 h-4 text-sky-500" />;
      case 'implemented': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const getStatusLabel = (status: SoftwareSuggestion['status']) => {
    switch (status) {
      case 'pending': return '待评审';
      case 'reviewed': return '已受理';
      case 'implemented': return '已上线';
      case 'rejected': return '暂不考虑';
    }
  };

  const inputCls = "v2-input";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-0.5";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title text-slate-900">软件迭代建议</h1>
              <p className="v2-header-subtitle font-medium">您的每一个建议都是我们进步的动力</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? '取消提交' : '提交新建议'}</span>
          </button>
        </header>

        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="v2-card bg-white p-8 mb-8 border-purple-100 shadow-2xl shadow-purple-500/10"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>您的称呼/工号</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        required
                        className={`${inputCls} pl-10 bg-white`} 
                        placeholder="输入姓名..." 
                        value={form.user_name} 
                        onChange={e => setForm({...form, user_name: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>建议分类</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        className={`${inputCls} pl-10 bg-white`}
                        value={form.category}
                        onChange={e => setForm({...form, category: e.target.value as any})}
                      >
                        <option value="Feature Request">功能需求</option>
                        <option value="Bug Report">问题反馈</option>
                        <option value="UI/UX">视觉体验</option>
                        <option value="Other">其他</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>紧迫程度</label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        className={`${inputCls} pl-10 bg-white`}
                        value={form.priority}
                        onChange={e => setForm({...form, priority: e.target.value as any})}
                      >
                        <option value="High">极高 (阻碍工作)</option>
                        <option value="Medium">一般 (体验优化)</option>
                        <option value="Low">较低 (锦上添花)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className={labelCls}>建议内容详情</label>
                  <textarea 
                    required
                    rows={4}
                    className={`${inputCls} resize-none py-3 bg-white`}
                    placeholder="请详细描述您的想法、目前遇到的痛点，以及您期望的改进方案..."
                    value={form.content}
                    onChange={e => setForm({...form, content: e.target.value})}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    <span>提交建议</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">加载建议列表中...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="col-span-2 py-32 v2-card bg-white/50 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-bold">暂无迭代建议</p>
              <p className="text-xs mt-1 uppercase tracking-tighter">点击上方按钮，提交第一个建议吧！</p>
            </div>
          ) : suggestions.map((s, idx) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="v2-card bg-white p-6 flex flex-col hover:shadow-2xl hover:shadow-slate-200/40 transition-all group border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                    s.category === 'Bug Report' ? 'bg-rose-50 text-rose-500' :
                    s.category === 'Feature Request' ? 'bg-indigo-50 text-indigo-500' :
                    s.category === 'UI/UX' ? 'bg-emerald-50 text-emerald-500' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.category}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-black text-slate-900">{s.user_name}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border ${
                  s.status === 'implemented' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  s.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  s.status === 'reviewed' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {getStatusIcon(s.status)}
                  {getStatusLabel(s.status)}
                </div>
              </div>

              <div className="flex-1 text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/80 p-4 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 group-hover:border-indigo-100 transition-colors">
                {s.content}
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">优先级:</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                    s.priority === 'High' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                    s.priority === 'Medium' ? 'bg-sky-50 text-sky-500 border-sky-100' :
                    'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {s.priority}
                  </span>
                </div>
                <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors uppercase tracking-widest">
                  查看详情 <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
