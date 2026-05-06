import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudSun, Calendar, ChevronDown, ChevronUp, MapPin, RotateCw } from "lucide-react";

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

const WEATHER_STORAGE_KEY = "mexico_weather";
const HOLIDAYS_STORAGE_KEY = "mexico_holidays";
const WEATHER_TTL_MS = 86_400_000; // 24 hours
const HOLIDAYS_TTL_MS = 604_800_000; // 7 days

const DEEPSEEK_API_KEY = "sk-349acd2923954f738fee99e2b951a2f8";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CityWeather {
  cityName: string;
  cityLabel: string;
  temperature: string;
  condition: string;
  error?: boolean;
}

interface MexicoHoliday {
  name_cn: string;
  name_es: string;
  date: string;
  origin: string;
  activities: string;
}

interface StoredWeather {
  fetchedAt: number;
  items: CityWeather[];
}

interface StoredHolidays {
  fetchedAt: number;
  items: MexicoHoliday[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as { fetchedAt: number; items: T };
    if (Date.now() - data.fetchedAt > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return data.items;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache<T>(key: string, items: T): void {
  try {
    const payload = { fetchedAt: Date.now(), items };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* storage full – silently ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function MexicoInfoPanel() {
  /* ---------- weather state ---------- */
  const [weather, setWeather] = useState<CityWeather[]>(() => {
    const cached = getCache<CityWeather[]>(WEATHER_STORAGE_KEY, WEATHER_TTL_MS);
    return cached ?? [];
  });
  const [weatherLoading, setWeatherLoading] = useState(false);

  /* ---------- holidays state ---------- */
  const [holidays, setHolidays] = useState<MexicoHoliday[]>(() => {
    const cached = getCache<MexicoHoliday[]>(HOLIDAYS_STORAGE_KEY, HOLIDAYS_TTL_MS);
    return cached ?? [];
  });
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  /* ---------- fetch weather ---------- */
  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const results = await Promise.allSettled(
        MEXICO_CITIES.map(async (city) => {
          const res = await fetch(
            `https://wttr.in/${encodeURIComponent(city.name)}?format=%t+%C&lang=zh`,
            { signal: AbortSignal.timeout(10_000) },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const cleaned = text.trim();
          // wttr.in may return "+22°C Sunny" – split on first space
          const spaceIdx = cleaned.indexOf(" ");
          const temp = spaceIdx > 0 ? cleaned.slice(0, spaceIdx).replace(/^\+/, "") : cleaned;
          const cond = spaceIdx > 0 ? cleaned.slice(spaceIdx + 1) : "";
          return { cityName: city.name, cityLabel: city.label, temperature: temp, condition: cond };
        }),
      );

      const items: CityWeather[] = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return {
          cityName: MEXICO_CITIES[i].name,
          cityLabel: MEXICO_CITIES[i].label,
          temperature: "--",
          condition: "加载失败",
          error: true,
        };
      });
      setWeather(items);
      setCache(WEATHER_STORAGE_KEY, items);
    } catch {
      // keep stale cache if any
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  /* ---------- fetch holidays ---------- */
  const fetchHolidays = useCallback(async () => {
    setHolidaysLoading(true);
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                "你是一个墨西哥节日专家。请提供墨西哥未来4个月的重要节日信息，用中文返回。",
            },
            {
              role: "user",
              content:
                "列出墨西哥从今天开始未来4个月的10个最重要的节日。每个节日需要：名称（中文+西班牙文）、日期、简要来源说明、人们通常会做什么活动。用JSON格式返回：[{name_cn, name_es, date, origin, activities}]",
            },
          ],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`DeepSeek API HTTP ${res.status}`);
      const body = await res.json();
      const content: string = body?.choices?.[0]?.message?.content ?? "";
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found in response");
      const items: MexicoHoliday[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(items) || items.length === 0) throw new Error("Empty holiday list");
      setHolidays(items);
      setCache(HOLIDAYS_STORAGE_KEY, items);
    } catch {
      // keep stale cache
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  /* ---------- initial fetch + periodic refresh ---------- */
  useEffect(() => {
    if (weather.length === 0) fetchWeather();
    if (holidays.length === 0) fetchHolidays();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- render ---------- */
  return (
    <aside className="w-[220px] h-full flex flex-col shrink-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-l border-slate-200/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
      {/* Title */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200/60 flex items-center justify-between">
        <h2 className="text-[13px] font-black tracking-tight text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-500" />
          墨西哥情报站
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 space-y-3 scrollbar-thin">
        {/* =============================== */}
        {/*        Weather Section          */}
        {/* =============================== */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CloudSun className="w-3 h-3 text-amber-400" />
              天气
            </span>
            <button
              onClick={fetchWeather}
              disabled={weatherLoading}
              className="text-slate-300 hover:text-sky-500 transition-colors disabled:opacity-40"
              title="刷新天气"
            >
              <RotateCw
                className={`w-3 h-3 ${weatherLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-1">
            {weather.map((city, i) => (
              <div
                key={city.cityName}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/40 hover:bg-white/70 transition-colors group"
              >
                {/* Temperature badge */}
                <span
                  className={`w-[44px] text-[11px] font-bold font-mono shrink-0 ${
                    city.error ? "text-slate-300" : "text-slate-800"
                  }`}
                >
                  {city.temperature}
                </span>
                {/* City label */}
                <span className="text-[10px] font-semibold text-slate-500 truncate flex-1">
                  {city.cityLabel}
                </span>
                {/* Condition */}
                <span
                  className={`text-[9px] truncate max-w-[60px] ${
                    city.error ? "text-rose-300" : "text-slate-400"
                  }`}
                >
                  {city.condition}
                </span>
              </div>
            ))}
            {weather.length === 0 && !weatherLoading && (
              <p className="text-[10px] text-slate-300 text-center py-2">
                点击刷新获取天气
              </p>
            )}
            {weatherLoading && weather.length === 0 && (
              <div className="flex justify-center py-2">
                <div className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </section>

        {/* Separator */}
        <div className="border-t border-slate-200/60 my-1" />

        {/* =============================== */}
        {/*       Holidays Section          */}
        {/* =============================== */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-400" />
              节日
            </span>
            <button
              onClick={fetchHolidays}
              disabled={holidaysLoading}
              className="text-slate-300 hover:text-sky-500 transition-colors disabled:opacity-40"
              title="刷新节日"
            >
              <RotateCw
                className={`w-3 h-3 ${holidaysLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-1">
            {holidays.slice(0, 10).map((h, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <div key={idx} className="rounded-lg overflow-hidden">
                  {/* Header – clickable */}
                  <button
                    onClick={() => setExpandedIndex(isOpen ? null : idx)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left bg-white/40 hover:bg-white/70 transition-colors group"
                  >
                    <span className="text-[9px] font-mono text-slate-400 shrink-0 w-[52px]">
                      {h.date}
                    </span>
                    <span className="flex-1 text-[10px] font-semibold text-slate-700 truncate leading-tight">
                      {h.name_cn}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Expandable description */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="desc"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-2 pb-2 pt-0.5 text-[10px] text-slate-500 leading-relaxed space-y-1">
                          <p>
                            <span className="font-semibold text-slate-600">西语：</span>
                            {h.name_es}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-600">来源：</span>
                            {h.origin}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-600">活动：</span>
                            {h.activities}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {holidays.length === 0 && !holidaysLoading && (
              <p className="text-[10px] text-slate-300 text-center py-2">
                点击刷新获取节日
              </p>
            )}
            {holidaysLoading && holidays.length === 0 && (
              <div className="flex justify-center py-2">
                <div className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Scrollbar style */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
      `}</style>
    </aside>
  );
}
