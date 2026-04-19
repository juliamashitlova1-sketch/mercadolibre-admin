import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FakeOrder, SKUStats } from '../types';
import { USD_TO_MXN, MXN_TO_CNY } from '../constants';
import { getMexicoDateString } from '../lib/time';

export default function FakeOrders() {
  const { skuData } = useOutletContext<{ skuData: SKUStats[] }>();
  const [data, setData] = useState<FakeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<FakeOrder>>({
    date: getMexicoDateString(),
    sku: '',
    skuName: '',
    reviewFeeCNY: 0,
    refundAmountUSD: 0
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('fake_orders')
      .select('*, reviewFeeCNY:review_fee_cny, refundAmountUSD:refund_amount_usd, skuName:sku_name')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching fake orders:', error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!currentRecord.sku || !currentRecord.date) {
      alert('请填写完整信息');
      return;
    }

    const payload = {
      date: currentRecord.date,
      sku: currentRecord.sku,
      sku_name: currentRecord.skuName,
      review_fee_cny: currentRecord.reviewFeeCNY,
      refund_amount_usd: currentRecord.refundAmountUSD
    };

    let error;
    if (currentRecord.id) {
      const { error: err } = await supabase
        .from('fake_orders')
        .update(payload)
        .eq('id', currentRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('fake_orders')
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
        reviewFeeCNY: 0,
        refundAmountUSD: 0
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const { error } = await supabase.from('fake_orders').delete().eq('id', id);
    if (error) {
      alert('删除失败');
    } else {
      fetchData();
    }
  };

  const calculateActualCost = (fee: number, refund: number) => {
    const refundCNY = refund * USD_TO_MXN * MXN_TO_CNY;
    return (fee - refundCNY).toFixed(2);
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">刷单/测评支出管理</h2>
          <p className="text-slate-500 text-sm">追踪并核算站外测评支出的实际成本</p>
        </div>
        <Button onClick={() => {
          setCurrentRecord({
            date: getMexicoDateString(),
            sku: '',
            skuName: '',
            reviewFeeCNY: 0,
            refundAmountUSD: 0
          });
          setIsEditing(true);
        }} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> 新增记录
        </Button>
      </header>

      {isEditing && (
        <Card className="border-sky-200 bg-sky-50/50 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-sky-900">{currentRecord.id ? '编辑记录' : '新增记录'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5 focus-within:text-sky-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">选择日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="bg-white border-sky-100 focus:border-sky-300 transition-all rounded-lg"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-sky-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">选择 SKU</Label>
                <Select value={currentRecord.sku} onValueChange={handleSkuSelect}>
                  <SelectTrigger className="bg-white border-sky-100 focus:border-sky-300 transition-all rounded-lg">
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
              <div className="space-y-1.5 focus-within:text-sky-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">测评费 (CNY)</Label>
                <Input 
                  type="number" 
                  placeholder="人民币支出" 
                  value={currentRecord.reviewFeeCNY} 
                  onChange={e => setCurrentRecord({...currentRecord, reviewFeeCNY: Number(e.target.value)})}
                  className="bg-white border-sky-100 focus:border-sky-300 transition-all rounded-lg"
                />
              </div>
              <div className="space-y-1.5 focus-within:text-sky-600 transition-colors">
                <Label className="text-[11px] font-bold uppercase tracking-wider opacity-70">回款金额 (USD)</Label>
                <Input 
                  type="number" 
                  placeholder="美元回款" 
                  value={currentRecord.refundAmountUSD} 
                  onChange={e => setCurrentRecord({...currentRecord, refundAmountUSD: Number(e.target.value)})}
                  className="bg-white border-sky-100 focus:border-sky-300 transition-all rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 bg-sky-600 hover:bg-sky-700 shadow-md">保存</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-200">取消</Button>
              </div>
            </div>
            {currentRecord.skuName && (
              <div className="mt-3 text-[10px] flex items-center gap-1.5 text-slate-400 font-medium">
                <Check className="w-3 h-3 text-emerald-500" />
                已自动匹配 SKU 名称: <span className="text-slate-600 underline decoration-sky-200">{currentRecord.skuName}</span>
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
                <TableHead className="font-bold text-slate-500">SKU 信息</TableHead>
                <TableHead className="font-bold text-slate-500">测评费 (CNY)</TableHead>
                <TableHead className="font-bold text-slate-500">回款额 (USD)</TableHead>
                <TableHead className="font-bold text-slate-500">回款折算 (CNY)</TableHead>
                <TableHead className="text-emerald-600 font-bold uppercase tracking-wider">实际费用 (CNY)</TableHead>
                <TableHead className="text-right font-bold text-slate-500 pr-6">管理操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                      <span className="text-sm text-slate-300 font-medium">全力加载数据中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-300 italic">暂无刷单支出记录</TableCell>
                </TableRow>
              ) : data.map((record) => (
                <TableRow key={record.id} className="group hover:bg-sky-50/20 transition-colors border-slate-50">
                  <TableCell className="text-[11px] font-mono font-bold text-slate-400">{record.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-[10px] text-slate-400 border border-slate-100">
                         {record.sku.substring(0, 2)}
                       </div>
                       <div>
                        <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{record.sku}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{record.skuName || '未知 SKU 名称'}</div>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] font-bold text-slate-600">¥{Number(record.reviewFeeCNY || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-[12px] font-bold text-slate-600">${Number(record.refundAmountUSD || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-[10px] text-slate-300 italic">¥{(Number(record.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-600 bg-emerald-50/10">
                    <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                      ¥{calculateActualCost(record.reviewFeeCNY || 0, record.refundAmountUSD || 0)}
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
