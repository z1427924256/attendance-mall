/** CSV 导出工具 */
export function exportCsv(filename: string, rows: Record<string, unknown>[], headers?: { key: string; label: string }[]) {
  if (!rows.length) {
    return;
  }
  const cols = headers ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    cols.map((c) => escape(c.label)).join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(',')),
  ].join('\n');
  // 加 BOM 防止 Excel 中文乱码
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
