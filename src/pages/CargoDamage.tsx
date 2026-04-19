import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CargoDamage, SKUStats } from '../types';
import { getMexicoDateString } from '../lib/time';

const REASONS = ['送仓差异', '货代丢失', '退货无法二次利用'] as const;

export default function CargoDamagePage() {
  const { skuData } = useOutletContext<{ skuData: SKUStats[] }>();
  const [data, setData] = useState<CargoDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<CargoDamage>>({
    date: getMexicoDateString(),
    sku: '',
    skuName: '',
    quantity: 0,
    reason: '送仓差异',
    skuValueCNY: 0
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('cargo_damage')
      .select('*, skuName:sku_name, skuValueCNY:sku_value_cny')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching cargo damage:', error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!currentRecord.sku || !currentRecord.date || !currentRecord.reason) {
      alert('请填写完整信息');
      return;
    }

    const payload = {
      date: currentRecord.date,
      sku: currentRecord.sku,
      sku_name: currentRecord.skuName,
      quantity: currentRecord.quantity,
      reason: currentRecord.reason,
      sku_value_cny: currentRecord.skuValueCNY
    };

    let error;
    if (currentRecord.id) {
      const { error: err } = await supabase
        .from('cargo_damage')
        .update(payload)
        .eq('id', currentRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('cargo_damage')
        .insert([payload]);
      error = err;
    }

    if (error) {
      alert('保存失败: ' + error.message);
    } else {
      setIsEditing(false);
      setCurrentRecord({
        date: getMexicoDateString(),
        sku: '',
        skuName: '',
        quantity: 0,
        reason: '送仓差异',
        skuValueCNY: 0
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const { error } = await supabase.from('cargo_damage').delete().eq('id', id);
    if (error) {
      alert('删除失败');
    } else {
      fetchData();
    }
  };

  const handleSkuSelect = (sku: string) => {
    const selected = skuData.find(s => s.sku === sku);
    setCurrentRecord({
      ...currentRecord,
      sku: sku,
      skuName: selected?.skuName || ''
    });
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">货损支出管理</h2>
          <p className="text-slate-500 text-sm">记录供应链中的库存损耗与异常成本</p>
        </div>
        <Button onClick={() => {
          setCurrentRecord({
            date: getMexicoDateString(),
            sku: '',
            skuName: '',
            quantity: 0,
            reason: '送仓差异',
            skuValueCNY: 0
          });
          setIsEditing(true);
        }} className="gap-2 bg-rose-600 hover:bg-rose-700 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> 记录货损
        </Button>
      </header>

      {isEditing && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-rose-900">{currentRecord.id ? '编辑记录' : '新增货损'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">货损日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="bg-white border-rose-100 focus:border-rose-300 transition-all rounded-lg"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">选择 SKU</Label>
                <Select value={currentRecord.sku} onValueChange={handleSkuSelect}>
                  <SelectTrigger className="bg-white border-rose-100 focus:border-rose-300 transition-all rounded-lg">
                    <SelectValue placeholder="搜索或选择 SKU" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {skuData.map(s => (
                      <SelectItem key={s.sku} value={s.sku} className="flex flex-col items-start gap-1">
                        <div className="font-bold text-slate-900">{s.sku}</div>
                        <div className="text-[10px] text-slate-400">{s.skuName}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">数量</Label>
                <Input 
                  type="number" 
                  value={currentRecord.quantity} 
                  onChange={e => setCurrentRecord({...currentRecord, quantity: Number(e.target.value)})}
                  className="bg-white border-rose-100 focus:border-rose-300 transition-all rounded-lg"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">货损原因</Label>
                <Select 
                  value={currentRecord.reason} 
                  onValueChange={(val: any) => setCurrentRecord({...currentRecord, reason: val})}
                >
                  <SelectTrigger className="bg-white border-rose-100 focus:border-rose-300 transition-all rounded-lg">
                    <SelectValue placeholder="选择原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 focus-within:text-rose-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">单件货值 (CNY)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={currentRecord.skuValueCNY} 
                  onChange={e => setCurrentRecord({...currentRecord, skuValueCNY: Number(e.target.value)})}
                  className="bg-white border-rose-100 focus:border-rose-300 transition-all rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-md">保存</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-200">取消</Button>
              </div>
            </div>
            {currentRecord.skuName && (
              <div className="mt-3 text-[10px] flex items-center gap-1.5 text-slate-400 font-medium">
                <Check className="w-3 h-3 text-emerald-500" />
                已自动匹配 SKU 名称: <span className="text-slate-600 underline decoration-rose-200">{currentRecord.skuName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-100 shadow-sm bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden ring-1 ring-slate-100">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-slate-500">日期</TableHead>
                <TableHead className="font-bold text-slate-500">货损 SKU</TableHead>
                <TableHead className="font-bold text-slate-500">数量</TableHead>
                <TableHead className="font-bold text-slate-500">原因</TableHead>
                <TableHead className="font-bold text-slate-500">单价 (CNY)</TableHead>
                <TableHead className="text-rose-600 font-bold uppercase tracking-wider">损失总额 (CNY)</TableHead>
                <TableHead className="text-right font-bold text-slate-500 pr-6">管理操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                      <span className="text-sm text-slate-300 font-medium">处理货损数据中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-300 italic">暂无货损异常记录</TableCell>
                </TableRow>
              ) : data.map((record) => (
                <TableRow key={record.id} className="group hover:bg-rose-50/20 transition-colors border-slate-50">
                  <TableCell className="text-[11px] font-mono font-bold text-slate-400">{record.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-[10px] text-slate-400 border border-slate-100">
                         {record.sku.substring(0, 2)}
                       </div>
                       <div>
                        <div className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{record.sku}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{record.skuName || '未知 SKU'}</div>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">{record.quantity}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span className="text-[10px] font-bold text-slate-600">{record.reason}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] font-medium text-slate-500">¥{Number(record.skuValueCNY || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-bold text-rose-600 bg-rose-50/10">
                    <span className="px-2 py-1 rounded bg-rose-50 text-rose-700">
                      ¥{(Number(record.quantity || 0) * Number(record.skuValueCNY || 0)).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        onClick={() => {
                          setCurrentRecord(record);
                          setIsEditing(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[11px] font-bold">修改</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[11px] font-bold">删除</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
