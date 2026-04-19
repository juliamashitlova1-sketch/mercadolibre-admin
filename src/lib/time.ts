/**
 * 统一墨西哥城时区工具 (America/Mexico_City, UTC-6)
 * 全系统所有"当日"判定和时间显示均以此为准。
 */

/** 返回墨西哥城当地日期字符串，格式: yyyy-MM-dd */
export const getMexicoDateString = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
};

/** 返回墨西哥城当地时间字符串，格式: X月X日 HH:mm */
export const getMexicoTimeString = (): string => {
  const now = new Date();
  const format = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'America/Mexico_City',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = format.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach(p => partMap[p.type] = p.value);
  
  return `${partMap.month}月${partMap.day}日 ${partMap.hour}:${partMap.minute}`;
};

/** 返回墨西哥城当地日期时间字符串，格式: yyyy-MM-dd HH:mm */
export const getMexicoDateTimeString = (): string => {
  const date = getMexicoDateString();
  const time = new Date().toLocaleString('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
};