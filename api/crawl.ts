// Vercel serverless function at /api/crawl
// This runs on the server so it can bypass CORS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch: HTTP ${response.status}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to find table-trend first
    let table = $('#table-trend');
    let columns: string[] = [];
    let rows: string[][] = [];

    if (table.length > 0) {
      // Extract headers
      const thead = table.find('thead');
      if (thead.length > 0) {
        columns = thead.find('th').map((_: number, el: any) => $(el).text().trim()).get();
      }
      // Extract rows
      const tbody = table.find('tbody');
      if (tbody.length > 0) {
        tbody.find('tr').each((_: number, tr: any) => {
          const row: string[] = [];
          $(tr).find('td').each((__: number, td: any) => {
            row.push($(td).text().trim().replace(/\s+/g, ' '));
          });
          if (row.length > 0) rows.push(row);
        });
      }
    }

    // Fallback: find any table on the page
    if (rows.length === 0) {
      table = $('table').first();
      if (table.length > 0) {
        table.find('thead th, thead td').each((_: number, el: any) => {
          columns.push($(el).text().trim());
        });
        table.find('tbody tr').each((_: number, tr: any) => {
          const row: string[] = [];
          $(tr).find('td').each((__: number, td: any) => {
            row.push($(td).text().trim().replace(/\s+/g, ' '));
          });
          if (row.length > 0) rows.push(row);
        });
      }
    }

    // Fallback 2: find any div/table that looks tabular
    if (rows.length === 0) {
      const divTables = $('div[role="table"], .table, .data-table, [class*="table"]');
      if (divTables.length > 0) {
        return res.json({
          success: true,
          columns: [],
          rows: [],
          note: '页面可能使用了JS动态渲染，表格数据无法直接抓取。建议在新标签页中手动操作。',
          rawTitle: $('title').text() || '',
        });
      }
    }

    return res.json({
      success: true,
      columns,
      rows,
      rowCount: rows.length,
      rawTitle: $('title').text() || '',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Unknown error',
      note: '抓取失败。如果目标网站需要登录，请在新标签页中打开。',
    });
  }
}
