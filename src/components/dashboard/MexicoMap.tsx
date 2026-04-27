import React, { useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';

// ====== 墨西哥州名匹配（西班牙语 + 缩写 + 常见变体）======
const MEXICO_STATES: Record<string, string[]> = {
  'Aguascalientes': ['aguascalientes', 'ags'],
  'Baja California': ['baja california', 'b.c.', 'bc', 'baja california norte'],
  'Baja California Sur': ['baja california sur', 'b.c.s.', 'bcs'],
  'Campeche': ['campeche', 'camp'],
  'Chiapas': ['chiapas', 'chis'],
  'Chihuahua': ['chihuahua', 'chih'],
  'Ciudad de México': ['ciudad de méxico', 'ciudad de mexico', 'cdmx', 'distrito federal', 'd.f.', 'df', 'mexico city', 'ciudad de méx'],
  'Coahuila': ['coahuila', 'coah', 'coahuila de zaragoza'],
  'Colima': ['colima', 'col'],
  'Durango': ['durango', 'dgo'],
  'Estado de México': ['estado de méxico', 'estado de mexico', 'edomex', 'méxico', 'mexico', 'e.do.mex', 'edo.mex', 'estado de méx'],
  'Guanajuato': ['guanajuato', 'gto'],
  'Guerrero': ['guerrero', 'gro'],
  'Hidalgo': ['hidalgo', 'hgo'],
  'Jalisco': ['jalisco', 'jal'],
  'Michoacán': ['michoacán', 'michoacan', 'mich', 'michoacán de ocampo'],
  'Morelos': ['morelos', 'mor'],
  'Nayarit': ['nayarit', 'nay'],
  'Nuevo León': ['nuevo león', 'nuevo leon', 'n.l.', 'nl'],
  'Oaxaca': ['oaxaca', 'oax'],
  'Puebla': ['puebla', 'pue'],
  'Querétaro': ['querétaro', 'queretaro', 'qro'],
  'Quintana Roo': ['quintana roo', 'q.roo', 'q. roo', 'qr'],
  'San Luis Potosí': ['san luis potosí', 'san luis potosi', 'slp'],
  'Sinaloa': ['sinaloa', 'sin'],
  'Sonora': ['sonora', 'son'],
  'Tabasco': ['tabasco', 'tab'],
  'Tamaulipas': ['tamaulipas', 'tamps'],
  'Tlaxcala': ['tlaxcala', 'tlax'],
  'Veracruz': ['veracruz', 'ver', 'veracruz de ignacio de la llave'],
  'Yucatán': ['yucatán', 'yucatan', 'yuc'],
  'Zacatecas': ['zacatecas', 'zac'],
};

const STATE_ABBR: Record<string, string> = {
  'Aguascalientes': 'AGU', 'Baja California': 'BCN', 'Baja California Sur': 'BCS',
  'Campeche': 'CAM', 'Chiapas': 'CHS', 'Chihuahua': 'CHH', 'Ciudad de México': 'CDMX',
  'Coahuila': 'COA', 'Colima': 'COL', 'Durango': 'DUR', 'Estado de México': 'MEX',
  'Guanajuato': 'GTO', 'Guerrero': 'GRO', 'Hidalgo': 'HGO', 'Jalisco': 'JAL',
  'Michoacán': 'MIC', 'Morelos': 'MOR', 'Nayarit': 'NAY', 'Nuevo León': 'NL',
  'Oaxaca': 'OAX', 'Puebla': 'PUE', 'Querétaro': 'QUE', 'Quintana Roo': 'QR',
  'San Luis Potosí': 'SLP', 'Sinaloa': 'SIN', 'Sonora': 'SON', 'Tabasco': 'TAB',
  'Tamaulipas': 'TAM', 'Tlaxcala': 'TLX', 'Veracruz': 'VER', 'Yucatán': 'YUC',
  'Zacatecas': 'ZAC',
};

const STATE_PATHS: Record<string, string> = {
  'Baja California': 'M 55,12 L 65,8 L 75,6 L 85,4 L 95,5 L 100,8 L 98,15 L 92,22 L 86,30 L 80,38 L 76,42 L 70,48 L 65,55 L 60,52 L 55,45 L 50,35 L 48,25 Z',
  'Baja California Sur': 'M 60,55 L 65,55 L 70,48 L 76,42 L 78,48 L 80,55 L 82,62 L 83,70 L 80,78 L 76,82 L 72,85 L 68,82 L 64,75 L 60,68 L 58,62 Z',
  'Sonora': 'M 110,30 L 125,25 L 140,22 L 155,24 L 168,28 L 175,35 L 178,45 L 175,55 L 170,62 L 165,68 L 155,70 L 145,72 L 135,70 L 125,65 L 115,58 L 108,50 L 105,42 L 108,35 Z',
  'Chihuahua': 'M 155,24 L 168,28 L 182,30 L 195,35 L 205,42 L 210,52 L 208,62 L 200,70 L 190,75 L 180,78 L 170,78 L 165,75 L 165,68 L 175,55 L 178,45 L 175,35 L 168,28 Z',
  'Coahuila': 'M 200,42 L 215,38 L 230,40 L 245,45 L 255,52 L 260,60 L 255,68 L 245,72 L 235,70 L 225,65 L 215,62 L 208,62 L 205,55 Z',
  'Durango': 'M 165,75 L 170,78 L 180,78 L 190,75 L 195,80 L 198,90 L 195,100 L 188,108 L 180,112 L 170,110 L 160,105 L 155,95 L 155,85 Z',
  'Tamaulipas': 'M 245,45 L 258,42 L 268,48 L 275,55 L 278,65 L 275,75 L 268,82 L 258,85 L 250,82 L 245,75 L 248,68 L 255,68 L 260,60 L 255,52 Z',
  'Nuevo León': 'M 230,68 L 245,65 L 255,68 L 258,75 L 255,82 L 248,88 L 238,90 L 228,88 L 222,82 L 225,75 Z',
  'Sinaloa': 'M 108,68 L 115,65 L 125,68 L 132,72 L 138,78 L 140,88 L 138,98 L 132,108 L 125,115 L 118,118 L 112,115 L 108,108 L 105,98 L 103,88 L 105,78 Z',
  'Zacatecas': 'M 188,108 L 198,105 L 208,108 L 218,112 L 222,120 L 218,128 L 210,132 L 200,130 L 192,125 L 188,118 Z',
  'San Luis Potosí': 'M 218,112 L 228,108 L 238,110 L 248,115 L 252,122 L 248,130 L 240,135 L 230,132 L 222,128 L 218,120 Z',
  'Nayarit': 'M 118,118 L 125,115 L 132,118 L 135,125 L 132,132 L 125,138 L 118,135 L 115,128 Z',
  'Jalisco': 'M 125,138 L 135,132 L 145,130 L 155,132 L 158,140 L 155,148 L 148,155 L 138,158 L 128,155 L 122,148 Z',
  'Aguascalientes': 'M 165,130 L 172,128 L 178,132 L 178,138 L 172,142 L 165,140 Z',
  'Colima': 'M 118,148 L 125,145 L 130,148 L 132,155 L 128,160 L 122,158 L 118,155 Z',
  'Michoacán': 'M 128,155 L 138,158 L 148,155 L 158,158 L 165,165 L 162,175 L 155,182 L 145,185 L 135,182 L 128,175 L 125,165 Z',
  'Guanajuato': 'M 155,132 L 165,130 L 175,132 L 178,140 L 175,148 L 168,155 L 158,158 L 155,148 Z',
  'Querétaro': 'M 175,148 L 182,145 L 190,148 L 192,155 L 188,162 L 180,162 L 175,158 Z',
  'Estado de México': 'M 168,165 L 178,162 L 188,165 L 195,170 L 198,178 L 192,185 L 182,188 L 172,185 L 168,178 Z',
  'Ciudad de México': 'M 182,170 L 188,168 L 192,172 L 190,178 L 185,180 L 182,176 Z',
  'Hidalgo': 'M 192,155 L 202,150 L 212,152 L 218,158 L 215,168 L 208,172 L 198,170 L 192,165 Z',
  'Guerrero': 'M 128,185 L 138,182 L 148,185 L 158,188 L 165,195 L 162,205 L 155,212 L 142,215 L 132,212 L 125,205 L 122,195 Z',
  'Morelos': 'M 168,188 L 178,185 L 185,188 L 185,195 L 178,198 L 170,196 Z',
  'Tlaxcala': 'M 195,172 L 202,170 L 205,175 L 202,180 L 196,178 Z',
  'Puebla': 'M 192,185 L 202,180 L 212,182 L 220,188 L 222,198 L 215,205 L 205,208 L 195,205 L 190,198 L 188,192 Z',
  'Veracruz': 'M 215,168 L 225,162 L 235,165 L 245,170 L 252,178 L 255,190 L 250,200 L 242,208 L 232,212 L 222,208 L 220,198 L 225,188 L 218,180 Z',
  'Oaxaca': 'M 162,215 L 172,212 L 182,215 L 195,218 L 205,222 L 212,230 L 208,240 L 198,245 L 185,248 L 175,245 L 165,238 L 160,228 Z',
  'Tabasco': 'M 212,228 L 222,225 L 232,228 L 240,232 L 242,240 L 238,248 L 228,250 L 218,248 L 212,242 L 210,235 Z',
  'Chiapas': 'M 198,248 L 208,245 L 218,248 L 225,255 L 228,265 L 222,275 L 212,280 L 202,278 L 195,272 L 192,262 L 195,255 Z',
  'Campeche': 'M 195,255 L 205,252 L 215,255 L 220,262 L 218,272 L 212,278 L 202,280 L 195,275 L 192,268 Z',
  'Yucatán': 'M 222,238 L 232,235 L 242,238 L 250,242 L 258,248 L 262,258 L 258,268 L 250,272 L 240,270 L 232,265 L 225,258 L 222,250 Z',
  'Quintana Roo': 'M 258,248 L 268,245 L 275,252 L 278,262 L 275,272 L 268,278 L 260,275 L 258,268 L 262,258 Z',
};

const sortedStatesKeys = Object.entries(MEXICO_STATES).sort((a, b) => b[0].length - a[0].length);

function extractState(address: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const [stateName, aliases] of sortedStatesKeys) {
    for (const alias of aliases) {
      if (lower.includes(alias)) return stateName;
    }
  }
  return null;
}

function getColorForCount(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(226, 232, 240, 0.4)';
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio > 0.75) return '#0ea5e9';
  if (ratio > 0.5) return '#0284c7';
  if (ratio > 0.25) return '#0369a1';
  if (ratio > 0.1) return '#075985';
  return '#0c4a6e';
}

interface MexicoMapProps {
  orders: any[];
  totalOrders: number;
}

const MexicoMap: React.FC<MexicoMapProps> = ({ orders, totalOrders }) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const stateOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(MEXICO_STATES).forEach(s => { counts[s] = 0; });

    let matched = 0;
    orders.forEach(order => {
      const state = extractState(order.buyer_address);
      if (state && counts[state] !== undefined) {
        counts[state]++;
        matched++;
      }
    });

    return { counts, matched };
  }, [orders]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(stateOrderCounts.counts), 1);
  }, [stateOrderCounts]);

  const sortedStatesList = useMemo(() => {
    return Object.entries(stateOrderCounts.counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stateOrderCounts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Map visualization (8 cols) */}
      <div className="lg:col-span-8 v2-card overflow-hidden">
        <div className="v2-card-header !py-2">
          <h2 className="v2-card-title">
            <MapIcon className="w-3.5 h-3.5 text-sky-400" />
            墨西哥订单分布
          </h2>
          <span className="text-[9px] text-slate-500">已匹配 {stateOrderCounts.matched} 单 / {totalOrders > 0 ? ((stateOrderCounts.matched/totalOrders)*100).toFixed(0) : 0}%</span>
        </div>
        <div className="flex items-center justify-center p-2 bg-slate-50/50">
            <div className="w-full max-w-[500px] aspect-[5/4] relative">
              <svg viewBox="40 0 250 300" className="w-full h-full">
                {Object.entries(STATE_PATHS).map(([stateName, pathD]) => {
                  const count = stateOrderCounts.counts[stateName] || 0;
                  const isHovered = hoveredState === stateName;
                  const fillColor = getColorForCount(count, maxCount);
                  return (
                    <path
                      key={stateName}
                      d={pathD}
                      fill={fillColor}
                      stroke={isHovered ? '#38bdf8' : 'rgba(148, 163, 184, 0.1)'}
                      strokeWidth={isHovered ? 1.5 : 0.5}
                      style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredState(stateName)}
                      onMouseLeave={() => setHoveredState(null)}
                    />
                  );
                })}
              </svg>
              {hoveredState && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-slate-900/90 border border-slate-700 rounded text-[9px] shadow-xl z-20 text-white">
                  <span className="text-sky-400 font-bold">{hoveredState}</span>: {stateOrderCounts.counts[hoveredState] || 0} 单
                </div>
              )}
            </div>
        </div>
      </div>

      {/* List ranking (4 cols) */}
      <div className="lg:col-span-4 v2-card flex flex-col">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <span className="text-[10px] font-black text-slate-500 uppercase">Top 州排名</span>
          <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">by count</span>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar scroll-smooth">
          {sortedStatesList.map(([stateName, count], idx) => (
            <div 
              key={stateName}
              className={`px-3 py-2 flex items-center justify-between border-b border-slate-100 transition-colors ${hoveredState === stateName ? 'bg-sky-500/10' : ''}`}
              onMouseEnter={() => setHoveredState(stateName)}
              onMouseLeave={() => setHoveredState(null)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-300 w-3">{idx + 1}</span>
                <span className="text-[10px] font-bold text-slate-700">{STATE_ABBR[stateName] || stateName.slice(0, 3)}</span>
              </div>
              <span className="text-xs font-mono font-black text-sky-600">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MexicoMap;
