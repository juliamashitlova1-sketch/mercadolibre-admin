import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CloudSun,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  RotateCw,
  Thermometer,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MEXICO_CITIES = [
  { name: "Mexico City", label: "墨西哥城" },
  { name: "Cancún", label: "坎昆" },
  { name: "Guadalajara", label: "瓜达拉哈拉" },
  { name: "Monterrey", label: "蒙特雷" },
  { name: "Tijuana", label: "蒂华纳" },
] as const;

const WEATHER_KEY = "mx_weather_v2";
const HOLIDAYS_KEY = "mx_holidays_v2";
const DESCRIPTIONS_KEY = "mx_holiday_desc_v2";
const DAY_MS = 86_400_000;
const WEEK_MS = 604_800_000;

const DEEPSEEK_KEY = "sk-349acd2923954f738fee99e2b951a2f8";

interface CityWeather {
  cityLabel: string;
  temp: string;
  cond: string;
  error?: boolean;
}

interface RawHoliday {
  date: string;
  localName: string;
  name: string;
}

interface HolidayWithDesc {
  date: string;
  name: string;
  nameEs?: string;
  origin?: string;
  activities?: string;
}

/* ------------------------------------------------------------------ */
/*  Cache helpers                                                     */
/* ------------------------------------------------------------------ */

function getCached<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - d.t > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return d.v as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: val }));
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Weather emoji helper                                              */
/* ------------------------------------------------------------------ */

function weatherEmoji(cond: string): string {
  const c = cond.toLowerCase();
  if (c.includes("晴") || c.includes("sun") || c.includes("clear")) return "☀️";
  if (c.includes("云") || c.includes("cloud") || c.includes("overcast"))
    return "☁️";
  if (
    c.includes("雨") ||
    c.includes("rain") ||
    c.includes("drizzle") ||
    c.includes("shower")
  )
    return "🌧️";
  if (c.includes("雷") || c.includes("thunder") || c.includes("storm"))
    return "⛈️";
  if (
    c.includes("雾") ||
    c.includes("fog") ||
    c.includes("mist") ||
    c.includes("haze")
  )
    return "🌫️";
  if (c.includes("雪") || c.includes("snow")) return "❄️";
  if (c.includes("风") || c.includes("wind")) return "💨";
  if (c.includes("阴") || c.includes("部分")) return "⛅";
  return "🌤️";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function MexicoInfoPanel() {
  /* ---------- Weather ---------- */
  const [weather, setWeather] = useState<CityWeather[]>(
    () => getCached<CityWeather[]>(WEATHER_KEY, DAY_MS) ?? [],
  );
  const [wLoading, setWLoading] = useState(false);

  /* ---------- Holidays ---------- */
  const [holidays, setHolidays] = useState<HolidayWithDesc[]>(
    () => getCached<HolidayWithDesc[]>(HOLIDAYS_KEY, WEEK_MS) ?? [],
  );
  const [hLoading, setHLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  /* ---------- Fetch weather ---------- */
  const fetchWeather = useCallback(async () => {
    setWLoading(true);
    try {
      const results = await Promise.allSettled(
        MEXICO_CITIES.map(async (c) => {
          const r = await fetch(
            `https://wttr.in/${encodeURIComponent(c.name)}?format=%t+%C&lang=zh`,
            { signal: AbortSignal.timeout(8000) },
          );
          const txt = (await r.text()).trim();
          const i = txt.indexOf(" ");
          const temp = i > 0 ? txt.slice(0, i).replace(/^\+/, "") : txt;
          const cond = i > 0 ? txt.slice(i + 1) : "";
          return { cityLabel: c.label, temp, cond };
        }),
      );
      const items: CityWeather[] = results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : {
              cityLabel: MEXICO_CITIES[i].label,
              temp: "--",
              cond: "无数据",
              error: true,
            },
      );
      setWeather(items);
      setCache(WEATHER_KEY, items);
    } catch {
    } finally {
      setWLoading(false);
    }
  }, []);

  /* ---------- Fetch holidays ---------- */
  const fetchHolidays = useCallback(async () => {
    setHLoading(true);
    try {
      // Step 1: Get real holiday data from public API
      const year = new Date().getFullYear();
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/MX`,
        {
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: RawHoliday[] = await res.json();

      // Filter: only next 4 months from today
      const now = new Date();
      const fourMonthsLater = new Date(now);
      fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);
      const filtered = raw
        .filter((h) => {
          const d = new Date(h.date);
          return d >= now && d <= fourMonthsLater;
        })
        .slice(0, 10);

      if (filtered.length === 0) throw new Error("No upcoming holidays found");

      // Step 2: Use DeepSeek to enrich with descriptions
      let enriched: HolidayWithDesc[] = filtered.map((h) => ({
        date: h.date,
        name: h.localName || h.name,
      }));

      const cachedDescs = getCached<Record<string, HolidayWithDesc>>(
        DESCRIPTIONS_KEY,
        WEEK_MS,
      );
      const needFetch = enriched.filter((h) => !cachedDescs?.[h.name]);
      const descs = cachedDescs || {};

      if (needFetch.length > 0) {
        const prompt = `今天是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。以下是墨西哥即将到来的节日列表，请为每个节日补充西班牙语名称、来源历史、民众活动（电商选品参考用）。用JSON格式返回，不要markdown：\n${JSON.stringify(needFetch.map((h) => ({ name: h.name, date: h.date })))}\n\n返回格式：[{name, nameEs, origin, activities}]`;
        const aiRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "你是墨西哥文化专家。用中文回答。只返回JSON数组，不要其他文字。",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (aiRes.ok) {
          const body = await aiRes.json();
          const content: string = body?.choices?.[0]?.message?.content ?? "";
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            const enrichedData: HolidayWithDesc[] = JSON.parse(match[0]);
            enrichedData.forEach((ed) => {
              if (ed.name) descs[ed.name] = ed;
            });
            setCache(DESCRIPTIONS_KEY, descs);
          }
        }
      }

      enriched = enriched.map((h) => ({ ...h, ...(descs[h.name] || {}) }));
      setHolidays(enriched);
      setCache(HOLIDAYS_KEY, enriched);
    } catch {
    } finally {
      setHLoading(false);
    }
  }, []);

  useEffect(() => {
    if (weather.length === 0) fetchWeather();
    if (holidays.length === 0) fetchHolidays();
  }, []);

  /* ---------- Render ---------- */
  return (
    <aside className="w-[220px] h-full flex flex-col shrink-0 overflow-hidden bg-white/90 backdrop-blur-2xl border-l border-slate-200/60 shadow-sm">
      {/* Title */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200/60 flex items-center justify-between">
        <h2 className="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-500" />
          墨西哥情报站
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-3 scrollbar-thin">
        {/* ===== Weather ===== */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CloudSun className="w-3 h-3 text-amber-400" />
              天气
            </span>
            <button
              onClick={fetchWeather}
              disabled={wLoading}
              className="text-slate-300 hover:text-sky-500 transition-colors disabled:opacity-40"
              title="刷新"
            >
              <RotateCw
                className={`w-3 h-3 ${wLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="bg-white/60 rounded-xl border border-slate-100/80 overflow-hidden">
            {weather.map((c, i) => (
              <div
                key={c.cityLabel}
                className={`flex items-center gap-2 px-2.5 py-2 ${i < weather.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <span className="text-base w-5 text-center shrink-0">
                  {weatherEmoji(c.cond)}
                </span>
                <span className="text-[11px] font-semibold text-slate-700 w-[56px] shrink-0">
                  {c.cityLabel}
                </span>
                <span
                  className={`text-[12px] font-bold font-mono ${c.error ? "text-slate-300" : "text-slate-800"}`}
                >
                  {c.temp}
                </span>
                <span
                  className={`text-[9px] truncate ${c.error ? "text-rose-300" : "text-slate-400"}`}
                >
                  {c.cond}
                </span>
              </div>
            ))}
            {weather.length === 0 && !wLoading && (
              <div className="py-4 text-center text-[10px] text-slate-300">
                点击刷新按钮获取天气
              </div>
            )}
            {wLoading && weather.length === 0 && (
              <div className="flex justify-center py-3">
                <div className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* ===== Holidays ===== */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-400" />
              节日（未来4月）
            </span>
            <button
              onClick={fetchHolidays}
              disabled={hLoading}
              className="text-slate-300 hover:text-sky-500 transition-colors disabled:opacity-40"
              title="刷新"
            >
              <RotateCw
                className={`w-3 h-3 ${hLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-1">
            {holidays.slice(0, 10).map((h, idx) => {
              const open = expanded === idx;
              const dateStr = h.date ? h.date.slice(5) : "";
              const monthDay = dateStr
                ? `${parseInt(dateStr.split("-")[0])}月${parseInt(dateStr.split("-")[1])}日`
                : "";
              return (
                <div
                  key={idx}
                  className="bg-white/60 rounded-xl border border-slate-100/80 overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(open ? null : idx)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-white/80"
                  >
                    <span className="text-[10px] font-bold text-rose-500 font-mono shrink-0 w-[44px]">
                      {monthDay}
                    </span>
                    <span className="flex-1 text-[10px] font-semibold text-slate-700 leading-tight">
                      {h.name}
                    </span>
                    {open ? (
                      <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-2.5 pb-2.5 pt-0.5 text-[10px] text-slate-500 leading-relaxed space-y-1 border-t border-slate-100">
                          {h.nameEs && (
                            <p>
                              <span className="font-semibold text-slate-600">
                                🇪🇸 西语：
                              </span>
                              {h.nameEs}
                            </p>
                          )}
                          {h.origin && (
                            <p>
                              <span className="font-semibold text-slate-600">
                                📜 来源：
                              </span>
                              {h.origin}
                            </p>
                          )}
                          {h.activities && (
                            <p>
                              <span className="font-semibold text-slate-600">
                                🎯 活动：
                              </span>
                              {h.activities}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {holidays.length === 0 && !hLoading && (
              <div className="py-4 text-center text-[10px] text-slate-300">
                点击刷新按钮获取节日
              </div>
            )}
            {hLoading && holidays.length === 0 && (
              <div className="flex justify-center py-3">
                <div className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
      `}</style>
    </aside>
  );
}
