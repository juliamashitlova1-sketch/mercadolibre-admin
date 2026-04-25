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
  if (!jsonData || jsonData.length < 6) {
    throw new Error('无效的 Excel 文件，数据行数不足（需包含前5行元数据）。');
  }

  // Mercado Libre 报表通常前 5 行是汇总信息，第 6 行（索引 5）是表头
  const headers = jsonData[5];
  const rows = jsonData.slice(6);

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

  rows.forEach((row) => {
    const order: RawOrder = {};
    uniqueHeaders.forEach((header, index) => {
      order[header] = row[index];
    });

    // 提取关键字段 (根据 Mercado Libre 导出模板映射)
    // 常用表头：'Número de venda', 'SKU', 'Status', 'Total (USD)', 'Data da venda'
    const orderId = String(order['Número de venda'] || order['Order ID'] || order['订单号'] || '').trim();
    const sku = String(order['SKU'] || order['External ID'] || '').trim();
    const statusStr = String(order['Status'] || order['Estado'] || '').toLowerCase();
    const dateStr = String(order['Data da venda'] || order['Data de aprovação'] || order['Date'] || '');
    const amountVal = parseFloat(String(order['Total (USD)'] || order['Total_1'] || '0').replace(/[^0-9.-]+/g, ''));

    if (!orderId || orderId === 'null') return;

    let status: 'Valid' | 'Canceled' | 'Refunded' = 'Valid';
    if (statusStr.includes('cancel') || statusStr.includes('anula')) {
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
