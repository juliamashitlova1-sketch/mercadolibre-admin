// Mercado Libre Engine: Separates Valid Sales, Cancellations, and Refunds

const parseFinancial = (val: any) => {
    if (!val || val === '-' || String(val).trim() === '') return 0.00;
    const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0.00 : Math.round(num * 100) / 100;
};

const sanitizeString = (str: any) => String(str || '').replace(/\r\n|\n|\r/g, ' ').trim();

// Target fields to ensure they are handled as numbers
const targetNumberFields = [
    'Income per products (USD)', 'Selling fee (USD)', 
    'Shipping cost based on the declared weight (USD)', 
    'Taxes (USD)', 'Total (USD)', 'Total (Local currency)',
    'Cancellations and refunds (USD)'
];

const parseDateToISO = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date' || dateStr === 'N/A') {
        return new Date().toISOString().split('T')[0];
    }

    try {
        // Handle "April 24, 2026 ..." or similar
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }

        // Fallback for tricky formats: "DD/MM/YYYY" or "MM/DD/YYYY"
        const parts = dateStr.match(/(\d{1,4})/g);
        if (parts && parts.length >= 3) {
            // Try to guess YYYY-MM-DD
            let y = parts[0], m = parts[1], d = parts[2];
            if (y.length === 2) y = '20' + y;
            if (m.length > 2) { // Swap if needed
                const temp = m; m = y; y = temp;
            }
            const constructed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            if (!isNaN(new Date(constructed).getTime())) return constructed;
        }
    } catch (e) {
        console.error('Date parsing failed for:', dateStr);
    }
    
    return new Date().toISOString().split('T')[0];
};

export const processMercadoLibreOrders = (rawRows: any[][]) => {
    if (!rawRows || rawRows.length < 5) {
        throw new Error("表格格式不正确或数据不足");
    }

    // Header detection logic
    let headerRowIndex = 5; // Default fallback
    const headerKeywords = ['sku', 'order', '订单', 'pedido', 'fecha', 'date'];
    
    for (let i = 0; i < Math.min(30, rawRows.length); i++) {
        const row = rawRows[i];
        if (row && row.some(cell => {
            const s = String(cell).toLowerCase();
            return headerKeywords.some(kw => s.includes(kw));
        })) {
            headerRowIndex = i;
            break;
        }
    }

    const rawHeaders = rawRows[headerRowIndex].map((h: any) => sanitizeString(h));
    const headerCount: Record<string, number> = {};
    const headers = rawHeaders.map((h: string) => {
        if (!h) return 'empty_header_' + Math.random().toString(36).substr(2, 5);
        const cleanH = h.toLowerCase();
        if (headerCount[cleanH] === undefined) {
            headerCount[cleanH] = 0;
            return cleanH;
        } else {
            headerCount[cleanH]++;
            return cleanH + '_' + headerCount[cleanH];
        }
    });
    const dataRecords = rawRows.slice(headerRowIndex + 1);

    const dashboardData: any = {
        validSales: [],
        cancellations: [],
        refunds: [],
        metrics: {
            totalValidUSD: 0,
            totalValidMXN: 0,
            totalCanceledLossUSD: 0,
            totalRefundedLossUSD: 0,
            countValid: 0,
            countCanceled: 0,
            countRefunded: 0
        }
    };

    // Keep track of unique records to prevent intra-batch duplicate key errors
    const processedKeys = new Set<string>();

    for (const row of dataRecords) {
        if (!row || (Array.isArray(row) && row.length === 0)) continue;
        if (row.every(cell => !cell)) continue; // Skip empty rows
        
        const orderEntry: any = {};
        if (Array.isArray(row)) {
             headers.forEach((key, index) => {
                 orderEntry[key] = sanitizeString(row[index]);
             });
        } else {
             headers.forEach(key => {
                 orderEntry[key] = sanitizeString((row as any)[key]);
             });
        }

        targetNumberFields.forEach(field => {
            if (orderEntry[field] !== undefined) {
                orderEntry[field] = parseFinancial(orderEntry[field]);
            }
        });

        // More robust mappings for different languages/export formats
        const getVal = (obj: any, keywords: string[]) => {
            if (!obj) return undefined;
            const matchedKey = Object.keys(obj).find(k => keywords.some(kw => String(k).toLowerCase().includes(kw.toLowerCase())));
            return matchedKey ? obj[matchedKey] : undefined;
        };

        const totalUsd = getVal(orderEntry, ['total (usd)', 'bruto', 'total bruto']) || orderEntry['total (usd)'] || 0;
        const totalMxn = getVal(orderEntry, ['total (local currency)', 'moneda local']) || orderEntry['total (local currency)'] || 0;
        const refundsUsd = getVal(orderEntry, ['cancellations and refunds', 'cancelaciones', 'devoluciones']) || orderEntry['cancellations and refunds (usd)'] || 0;
        
        const statusStr = (getVal(orderEntry, ['status', 'estado']) || '').toLowerCase();
        const hasRefundValue = Number(refundsUsd) < 0;
        const isCanceledByStatus = statusStr.includes('cancel');
        
        const isReturnOrRefund = statusStr.includes('return') || statusStr.includes('refund') || statusStr.includes('devol') || (hasRefundValue && !isCanceledByStatus);
        const exactLoss = hasRefundValue ? Math.abs(Number(refundsUsd)) : (Number(totalUsd) < 0 ? Math.abs(Number(totalUsd)) : 0);
        
        const rawDate = getVal(orderEntry, ['order date', 'fecha', 'date of sale', 'date', '日期', '订单日期']);
        const _dateStr = parseDateToISO(String(rawDate || ''));
        
        const _sku = getVal(orderEntry, ['sku', 'código', '商品编码']) || 'N/A';
        const _type = isReturnOrRefund ? 'refund' : (isCanceledByStatus || hasRefundValue ? 'cancel' : 'valid');
        
        // Prevent duplicate keys (sku, date, type) in the same batch
        const uniqueKey = `${_sku}_${_dateStr}_${_type}`;
        if (processedKeys.has(uniqueKey) && (_sku === 'N/A' || _sku === '')) {
            continue; // Skip junk duplicates
        }
        processedKeys.add(uniqueKey);

        let finalUnits = 1;
        const findVal = (obj: any, keywords: string[]) => {
            const matchedKey = Object.keys(obj).find(k => keywords.some(kw => String(k).toLowerCase().includes(kw.toLowerCase())));
            return matchedKey ? obj[matchedKey] : undefined;
        };
        const exactUnits = findVal(orderEntry, ['units', 'quantity', 'unidades', 'cantidad', '件数', '数量']);
        if (exactUnits !== undefined && exactUnits !== null && String(exactUnits).trim() !== '') {
            const parsed = parseInt(String(exactUnits), 10);
            if (!isNaN(parsed) && parsed > 0) {
                finalUnits = parsed;
            }
        }
        
        const enrichedEntry = {
            ...orderEntry,
            _orderId: getVal(orderEntry, ['order #', 'pack #', 'número de empaque', '订单号']) || 'N/A',
            _sku: _sku,
            _date: _dateStr,
            _units: finalUnits,
            _exactLossUSD: exactLoss,
            _totalUSD: Number(totalUsd)
        };

        if (_type === 'refund') {
            dashboardData.refunds.push(enrichedEntry);
            dashboardData.metrics.totalRefundedLossUSD += exactLoss;
            dashboardData.metrics.countRefunded++;
        } else if (_type === 'cancel') {
            dashboardData.cancellations.push(enrichedEntry);
            dashboardData.metrics.totalCanceledLossUSD += exactLoss;
            dashboardData.metrics.countCanceled++;
        } else {
            dashboardData.validSales.push(enrichedEntry);
            dashboardData.metrics.totalValidUSD += Number(totalUsd);
            dashboardData.metrics.totalValidMXN += Number(totalMxn);
            dashboardData.metrics.countValid++;
        }
    }

    Object.keys(dashboardData.metrics).forEach(key => {
        if (key.includes('USD') || key.includes('MXN')) {
            dashboardData.metrics[key] = Math.round(dashboardData.metrics[key] * 100) / 100;
        }
    });

    return dashboardData;
};

