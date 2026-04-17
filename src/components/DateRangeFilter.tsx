import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getMexicoDateString } from '../lib/time';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
}

/**
 * 全局日期筛选器：支持单日查看 + 日期范围统计
 * 所有页面统一使用此组件
 */
export default function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangeFilterProps) {
  const today = getMexicoDateString();

  const presets = [
    { label: '今日', fn: () => { onStartDateChange(today); onEndDateChange(today); } },
    { label: '近7天', fn: () => { onStartDateChange(getOffsetDate(-6)); onEndDateChange(today); } },
    { label: '近30天', fn: () => { onStartDateChange(getOffsetDate(-29)); onEndDateChange(today); } },
    { label: '全部', fn: () => { onStartDateChange(''); onEndDateChange(''); } },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
        <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-transparent text-sm text-slate-700 font-mono focus:outline-none w-[130px]"
          max={today}
        />
        <span className="text-slate-400 text-xs">至</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-transparent text-sm text-slate-700 font-mono focus:outline-none w-[130px]"
          max={today}
        />
      </div>
      <div className="flex items-center gap-1.5">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={p.fn}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>
      {(startDate || endDate) && (
        <span className="text-[10px] text-slate-400 font-mono">
          {startDate === endDate && startDate ? `查看 ${startDate}` : startDate && endDate ? `${startDate} → ${endDate}` : '全部日期'}
        </span>
      )}
    </div>
  );
}

/** 从墨西哥城今日偏移 N 天，返回 yyyy-MM-dd */
function getOffsetDate(days: number): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 工具函数：过滤 SKUStats 数组 */
export function filterByDateRange<T extends { date: string }>(data: T[], startDate: string, endDate: string): T[] {
  if (!startDate && !endDate) return data;
  return data.filter(item => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });
}
