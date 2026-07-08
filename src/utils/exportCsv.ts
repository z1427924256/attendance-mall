// CSV 导出工具

interface CsvRow {
  [key: string]: string | number;
}

/**
 * 生成并下载 CSV 文件
 * @param rows 数据行
 * @param filename 文件名（不含扩展名）
 */
export function exportCsv(rows: CsvRow[], filename: string) {
  if (rows.length === 0) {
    return;
  }

  // 表头
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");

  // 数据行（处理逗号、换行）
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = String(row[h] ?? "");
        // 含逗号、引号、换行的字段用双引号包裹并转义
        if (/[",\n]/.test(val)) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",")
  );

  // BOM 头确保 Excel 正确识别 UTF-8
  const csv = "\uFEFF" + [headerLine, ...dataLines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
