import * as XLSX from 'xlsx';

/**
 * Mercado Libre Order Engine
 * Responsible for parsing and cleaning raw Excel data from Mercado Libre.
 */

export interface RawOrder {
  [key: string]: any;
}

export interface CleanedOrder {
  orderId: string;
  sku: string;
  date: string;
  status: 'Valid' | 'Canceled' | 'Refunded';
  amount: number;
  currency: string;
  skuName: string;
}

export interface ParsingSummary {
  totalRows: number;
  validOrders: number;
  canceledOrders: number;
  refundedOrders: number;
  totalAmountUSD: number;
  skuBreakdown: Record<string, number>;
  data: CleanedOrder[];
}

export const parseMercadoLibreExcel = (jsonData: any[][]): ParsingSummary => {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('Excel 文件内容为空。');
  }

  // --- 1. 动态寻找表头 (Dynamic Header Search) ---
  // 遍历前 20 行，寻找包含关键特征的行作为表头
  let headerIndex = -1;
  const headerKeywords = ['sku', 'order id', 'número de venda', 'external id', 'venda #', 'item sku'];
  
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowStr = row.join('|').toLowerCase();
    if (headerKeywords.some(keyword => rowStr.includes(keyword))) {
      headerIndex = i;
      break;
    }
  }

  // 如果没找到特征行，默认尝试第 6 行（LatAm 传统格式）
  if (headerIndex === -1 && jsonData.length >= 6) {
    headerIndex = 5;
  } else if (headerIndex === -1) {
    throw new Error('无法识别表格结构。请确保表格包含 SKU 或 Order ID 等标志性表头。');
  }

  const headers = jsonData[headerIndex];
  const rows = jsonData.slice(headerIndex + 1);

  // 处理重复表头（防止 key 冲突）
  const seenHeaders: Record<string, number> = {};
  const uniqueHeaders = headers.map((h) => {
    const headerStr = String(h || '').trim();
    if (seenHeaders[headerStr]) {
      seenHeaders[headerStr]++;
      return `${headerStr}_${seenHeaders[headerStr]}`;
    }
    seenHeaders[headerStr] = 1;
    return headerStr;
  });

  const summary: ParsingSummary = {
    totalRows: rows.length,
    validOrders: 0,
    canceledOrders: 0,
    refundedOrders: 0,
    totalAmountUSD: 0,
    skuBreakdown: {},
    data: [],
  };

  // --- 2. 字段映射函数 (Mapping Utilities) ---
  const findValue = (order: RawOrder, aliases: string[]) => {
    for (const alias of aliases) {
      if (order[alias] !== undefined && order[alias] !== null && order[alias] !== '') {
        return order[alias];
      }
    }
    return null;
  };

  rows.forEach((row) => {
    if (!row || row.length === 0 || (row.length === 1 && !row[0])) return;

    const order: RawOrder = {};
    uniqueHeaders.forEach((header, index) => {
      order[header] = row[index];
    });

    // 提取关键字段的别名映射
    const orderId = String(findValue(order, ['Número de venda', 'Order ID', '订单号', 'Order Number', 'Venda #', 'Order #']) || '').trim();
    const sku = String(findValue(order, ['SKU', 'External ID', 'Item SKU', 'Referencia', 'SKU #']) || '').trim();
    const statusStr = String(findValue(order, ['Status', 'Estado', 'Situación', 'Outcome', 'Status da venda']) || '').toLowerCase();
    const dateStr = String(findValue(order, ['Data da venda', 'Data de aprovação', 'Date', 'Fecha', 'Data', 'Sale Date']) || '');
    const amountVal = parseFloat(String(findValue(order, ['Total (USD)', 'Total_1', 'Amount', 'Total', 'Net amount', 'Valor']) || '0').replace(/[^0-9.-]+/g, ''));

    if (!orderId || orderId === 'null' || orderId === '') return;

    let status: 'Valid' | 'Canceled' | 'Refunded' = 'Valid';
    // 综合多语言状态词汇
    if (statusStr.includes('cancel') || statusStr.includes('anula') || statusStr.includes('returned') || statusStr.includes('devolv')) {
      status = 'Canceled';
      summary.canceledOrders++;
    } else if (statusStr.includes('refund') || statusStr.includes('reembols')) {
      status = 'Refunded';
      summary.refundedOrders++;
    } else {
      summary.validOrders++;
      summary.totalAmountUSD += isNaN(amountVal) ? 0 : amountVal;
    }

    if (sku) {
      summary.skuBreakdown[sku] = (summary.skuBreakdown[sku] || 0) + 1;
    }

    summary.data.push({
      orderId,
      sku,
      date: dateStr,
      status,
      amount: isNaN(amountVal) ? 0 : amountVal,
      currency: 'USD',
      skuName: '', // 会在数据载入时匹配
    });
  });

  return summary;
};

