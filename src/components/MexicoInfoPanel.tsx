import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CloudSun,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  RotateCw,
  Clock,
} from "lucide-react";

const MEXICO_CITIES = [
  { name: "Mexico City", label: "墨西哥城", tz: "America/Mexico_City" },
  { name: "Cancún", label: "坎昆", tz: "America/Cancun" },
  { name: "Guadalajara", label: "瓜达拉哈拉", tz: "America/Mexico_City" },
  { name: "Monterrey", label: "蒙特雷", tz: "America/Monterrey" },
  { name: "Tijuana", label: "蒂华纳", tz: "America/Tijuana" },
] as const;

const WEATHER_KEY = "mx_weather_v3";
const HOLIDAYS_KEY = "mx_holidays_v3";
const DAY_MS = 86_400_000;
const WEEK_MS = 604_800_000;
const DEEPSEEK_KEY = "sk-349acd2923954f738fee99e2b951a2f8";

interface CityWeather {
  label: string;
  temp: string;
  cond: string;
  time: string;
}

interface Holiday {
  date: string;
  name: string;
  nameEs?: string;
  origin?: string;
  activities?: string;
}

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

function getLocalTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "--:--";
  }
}

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
  if (c.includes("阴") || c.includes("part")) return "⛅";
  return "🌤️";
}

export default function MexicoInfoPanel() {
  const [weather, setWeather] = useState<CityWeather[]>(
    () => getCached<CityWeather[]>(WEATHER_KEY, DAY_MS) ?? [],
  );
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState("");

  const [holidays, setHolidays] = useState<Holiday[]>(
    () => getCached<Holiday[]>(HOLIDAYS_KEY, WEEK_MS) ?? [],
  );
  const [hLoading, setHLoading] = useState(false);
  const [hError, setHError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  /* ============ Weather ============ */
  const fetchWeather = useCallback(async () => {
    setWLoading(true);
    setWError("");

    try {
      const now = new Date();
      const prompt = `现在是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。请查询墨西哥以下5个城市当前的实时天气。返回JSON格式，不要markdown，只要最新实时数据：
[
{"label":"墨西哥城","temp":"22","cond":"晴"},
{"label":"坎昆","temp":"28","cond":"多云"},
{"label":"瓜达拉哈拉","temp":"25","cond":"晴"},
{"label":"蒙特雷","temp":"26","cond":"晴"},
{"label":"蒂华纳","temp":"18","cond":"多云"}
]
temp只需要数字温度，cond用中文描述天气状况。如果有联网搜索功能，请查询实时天气数据。`;
      const res = await fetch("https://api.deepseek.com/chat/completions", {
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
                "你是一个天气查询助手。请提供墨西哥城市当前的实时天气数据。只返回JSON数组，不要其他文字。temperature用摄氏度数字。",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const body = await res.json();
        const content: string = body?.choices?.[0]?.message?.content ?? "";
        const match = content.match(/\[\s*\S[\s\S]*?\]/);
        if (match) {
          const items: CityWeather[] = JSON.parse(match[0]).map((c: any) => ({
            label: c.label,
            temp: (c.temp || "--").toString() + "°C",
            cond: c.cond || "",
            time: getLocalTime(
              MEXICO_CITIES.find((mc) => mc.label === c.label)?.tz ||
                "America/Mexico_City",
            ),
          }));
          setWeather(items);
          setCache(WEATHER_KEY, items);
          setWLoading(false);
          return;
        }
      }
      throw new Error("API 返回格式异常");
    } catch (e: any) {
      setWError(e?.message || "获取失败");
    } finally {
      setWLoading(false);
    }
  }, []);

  /* ============ Holidays ============ */
  const fetchHolidays = useCallback(async () => {
    setHLoading(true);
    setHError("");

    try {
      const year = new Date().getFullYear();
      const now = new Date();
      const fourMonthsLater = new Date(now);
      fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);

      // Try nager.at first
      try {
        const res = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/MX`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (res.ok) {
          const raw: any[] = await res.json();
          const filtered = raw
            .filter((h) => {
              const d = new Date(h.date);
              return d >= now && d <= fourMonthsLater;
            })
            .slice(0, 10);

          if (filtered.length > 0) {
            const items: Holiday[] = filtered.map((h) => ({
              date: h.date,
              name: h.localName || h.name,
            }));
            // Try to enrich with DeepSeek
            try {
              const prompt = `今天是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。为以下墨西哥节日补充西班牙语名称、来源历史、民众活动（电商选品参考用）。JSON返回，不要markdown：\n${JSON.stringify(items.map((h) => ({ name: h.name, date: h.date })))}\n格式：[{name, nameEs, origin, activities}]`;
              const aiRes = await fetch(
                "https://api.deepseek.com/chat/completions",
                {
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
                        content: "你是墨西哥文化专家。只返回JSON。",
                      },
                      { role: "user", content: prompt },
                    ],
                    max_tokens: 4096,
                  }),
                  signal: AbortSignal.timeout(20000),
                },
              );
              if (aiRes.ok) {
                const body = await aiRes.json();
                const content: string =
                  body?.choices?.[0]?.message?.content ?? "";
                const match = content.match(/\[[\s\S]*\]/);
                if (match) {
                  const enriched: Holiday[] = JSON.parse(match[0]);
                  enriched.forEach((ed) => {
                    const idx = items.findIndex((h) => h.name === ed.name);
                    if (idx >= 0) items[idx] = { ...items[idx], ...ed };
                  });
                }
              }
            } catch {}
            setHolidays(items);
            setCache(HOLIDAYS_KEY, items);
            setHLoading(false);
            return;
          }
        }
      } catch {}

      // Fallback: use DeepSeek directly
      const prompt = `今天是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。列出墨西哥从现在起未来4个月内的重要节日（最多10个）。每个需：名称、日期yyyy-mm-dd、西语名称、来源、活动。JSON格式：\n[{"name":"节日名","date":"2026-05-15","nameEs":"...","origin":"...","activities":"..."}]`;
      const res = await fetch("https://api.deepseek.com/chat/completions", {
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
              content: "你熟悉墨西哥所有节日的日期和文化。只返回JSON数组。",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const body = await res.json();
        const content: string = body?.choices?.[0]?.message?.content ?? "";
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const items: Holiday[] = JSON.parse(match[0]).slice(0, 10);
          setHolidays(items);
          setCache(HOLIDAYS_KEY, items);
        }
      }
    } catch (e: any) {
      setHError(e?.message || "获取失败");
    } finally {
      setHLoading(false);
    }
  }, []);

  useEffect(() => {
    if (weather.length === 0) fetchWeather();
    if (holidays.length === 0) fetchHolidays();
  }, []);

  return (
    <aside className="w-[240px] h-full flex flex-col shrink-0 overflow-hidden bg-white/90 backdrop-blur-2xl border-l border-slate-200/60 shadow-sm">
      {/* Title */}
      <div className="shrink-0 px-3.5 py-3 border-b border-slate-200/60 flex items-center justify-between">
        <h2 className="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-500" />
          墨西哥情报站
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5 space-y-3 scrollbar-thin">
        {/* ===== Weather ===== */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CloudSun className="w-3 h-3 text-amber-400" />
              天气
            </span>
            <button
              onClick={fetchWeather}
              disabled={wLoading}
              className="text-slate-300 hover:text-sky-500 disabled:opacity-40"
              title="刷新"
            >
              <RotateCw
                className={`w-3 h-3 ${wLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="bg-white/60 rounded-xl border border-slate-100/80 overflow-hidden">
            {weather.length > 0 ? (
              weather.map((c, i) => (
                <div
                  key={c.label}
                  className={`flex items-center gap-2 px-3 py-2 ${i < weather.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <span className="text-lg w-6 text-center shrink-0">
                    {weatherEmoji(c.cond)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 flex-1">
                    {c.label}
                  </span>
                  <span className="text-[13px] font-bold font-mono text-slate-800 shrink-0">
                    {c.temp}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-[10px] text-slate-300">
                {wLoading ? (
                  <div className="flex justify-center">
                    <div className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <span>{wError || "暂无数据"}</span>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* ===== Holidays ===== */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-400" />
              未来4月节日
            </span>
            <button
              onClick={fetchHolidays}
              disabled={hLoading}
              className="text-slate-300 hover:text-sky-500 disabled:opacity-40"
              title="刷新"
            >
              <RotateCw
                className={`w-3 h-3 ${hLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-1">
            {holidays.length > 0 ? (
              holidays.slice(0, 10).map((h, idx) => {
                const open = expanded === idx;
                const ds = h.date ? h.date.split("-") : [];
                const md =
                  ds.length >= 3
                    ? `${parseInt(ds[1])}月${parseInt(ds[2])}日`
                    : ds[0] || "";
                return (
                  <div
                    key={idx}
                    className="bg-white/60 rounded-xl border border-slate-100/80 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(open ? null : idx)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/80 transition-colors"
                    >
                      <span className="text-[10px] font-bold text-rose-500 font-mono shrink-0 w-[48px]">
                        {md}
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
                          <div className="px-3 pb-3 pt-1 text-[10px] text-slate-500 leading-relaxed space-y-1 border-t border-slate-100">
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
                            {!h.nameEs && !h.origin && !h.activities && (
                              <p className="text-slate-300 italic">
                                暂无详细描述
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-[10px] text-slate-300">
                {hLoading ? (
                  <div className="flex justify-center">
                    <div className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <span>{hError || "暂无数据"}</span>
                )}
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
