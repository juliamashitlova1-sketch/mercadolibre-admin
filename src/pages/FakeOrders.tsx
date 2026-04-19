import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FakeOrder } from '../types';
import { USD_TO_MXN, MXN_TO_CNY } from '../constants';
import { getMexicoDateString } from '../lib/time';

export default function FakeOrders() {
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

  return (
    <div className="flex flex-col gap-6 p-2">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">刷单/测评支出管理</h2>
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
        }} className="gap-2">
          <Plus className="w-4 h-4" /> 新增记录
        </Button>
      </header>

      {isEditing && (
        <Card className="border-sky-100 bg-sky-50/30">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{currentRecord.id ? '编辑记录' : '新增记录'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">选择日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SKU</Label>
                <Input 
                  placeholder="如: A09" 
                  value={currentRecord.sku} 
                  onChange={e => setCurrentRecord({...currentRecord, sku: e.target.value.toUpperCase()})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">测评费 (CNY)</Label>
                <Input 
                  type="number" 
                  placeholder="人民币支出" 
                  value={currentRecord.reviewFeeCNY} 
                  onChange={e => setCurrentRecord({...currentRecord, reviewFeeCNY: Number(e.target.value)})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">回款金额 (USD)</Label>
                <Input 
                  type="number" 
                  placeholder="美元回款" 
                  value={currentRecord.refundAmountUSD} 
                  onChange={e => setCurrentRecord({...currentRecord, refundAmountUSD: Number(e.target.value)})}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">保存</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
              </div>
            </div>
            <div className="mt-4 text-[10px] text-slate-400">
              * 汇率参考：1 USD = {USD_TO_MXN} MXN, 1 MXN = {MXN_TO_CNY} CNY (当前 1 USD ≈ {(USD_TO_MXN * MXN_TO_CNY).toFixed(4)} CNY)
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">日期</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>测评费 (CNY)</TableHead>
                <TableHead>回款额 (USD)</TableHead>
                <TableHead>回款折算 (CNY)</TableHead>
                <TableHead className="text-emerald-600 font-bold">实际费用 (CNY)</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">暂无刷单记录</TableCell>
                </TableRow>
              ) : data.map((record) => (
                <TableRow key={record.id} className="group">
                  <TableCell className="text-xs font-mono text-slate-500">{record.date}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700">{record.sku}</div>
                    <div className="text-[10px] text-slate-400">{record.skuName}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">¥{Number(record.reviewFeeCNY || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">${Number(record.refundAmountUSD || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">¥{(Number(record.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-600">
                    ¥{calculateActualCost(record.reviewFeeCNY || 0, record.refundAmountUSD || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-sky-600"
                        onClick={() => {
                          setCurrentRecord(record);
                          setIsEditing(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
