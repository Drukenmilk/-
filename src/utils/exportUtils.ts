import { ExpenseItem, BudgetProject } from '../types/budget';

/**
 * Exports expenses to Korean Excel compatible CSV (with UTF-8 BOM)
 */
export function exportExpensesToCSV(project: BudgetProject, items: ExpenseItem[]) {
  const headers = [
    '연번',
    '집행일자',
    '세부비목',
    '품목명(내역)',
    '규격/단위',
    '수량',
    '단가(원)',
    '합계금액(원)',
    '결제방식',
    '상태',
    '비고/증빙',
  ];

  const rows = items.map((item, index) => [
    index + 1,
    `"${item.date || ''}"`,
    `"${item.subCategory || ''}"`,
    `"${(item.itemName || '').replace(/"/g, '""')}"`,
    `"${(item.specification || '').replace(/"/g, '""')}"`,
    item.quantity,
    item.unitPrice,
    item.totalPrice,
    `"${item.paymentMethod || ''}"`,
    `"${item.status || ''}"`,
    `"${(item.remarks || '').replace(/"/g, '""')}"`,
  ]);

  const totalSpent = items
    .filter((i) => i.status === '집행완료')
    .reduce((s, i) => s + (i.totalPrice || 0), 0);
  const remaining = project.allocatedAmount - totalSpent;

  const summaryRows = [
    [],
    ['[예산 요약]', '', '', '', '', '', '', '', '', '', ''],
    ['사업명', `"${project.title}"`, '', '', '', '', '', '', '', '', ''],
    ['배정예산액', project.allocatedAmount, '', '', '', '', '', '', '', '', ''],
    ['총 집행액', totalSpent, '', '', '', '', '', '', '', '', ''],
    ['현재 잔액', remaining, '', '', '', '', '', '', '', '', ''],
    ['집행률', `${((totalSpent / (project.allocatedAmount || 1)) * 100).toFixed(1)}%`, '', '', '', '', '', '', '', '', ''],
  ];

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Microsoft Excel Korean support
    [headers.join(','), ...rows.map((e) => e.join(',')), ...summaryRows.map((e) => e.join(','))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${project.title}_지출장부_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copies the table in Tab-Separated Values (TSV) format
 * allowing 1-click paste directly into MS Excel, Google Sheets, or Hancom HWP tables
 */
export async function copyTableToClipboard(project: BudgetProject, items: ExpenseItem[]): Promise<boolean> {
  try {
    const headers = ['연번', '집행일자', '세부비목', '품목명', '규격', '수량', '단가', '합계금액', '결제방식', '상태', '비고'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.date,
      item.subCategory,
      item.itemName,
      item.specification,
      item.quantity,
      item.unitPrice.toLocaleString(),
      item.totalPrice.toLocaleString(),
      item.paymentMethod,
      item.status,
      item.remarks,
    ]);

    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Parses CSV file uploaded by the teacher
 */
export function parseCSVFile(text: string): Partial<ExpenseItem>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Skip header line
  const parsedItems: Partial<ExpenseItem>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Check if summary row
    if (line.startsWith('[예산 요약]') || line.startsWith('사업명') || line.startsWith('배정예산액')) {
      break;
    }

    // Split considering quotes
    const cells: string[] = [];
    let current = '';
    let insideQuote = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (insideQuote && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    if (cells.length >= 7) {
      const qty = parseInt(cells[5].replace(/[^0-9]/g, ''), 10) || 1;
      const price = parseInt(cells[6].replace(/[^0-9]/g, ''), 10) || 0;
      const total = parseInt(cells[7]?.replace(/[^0-9]/g, ''), 10) || qty * price;

      parsedItems.push({
        id: `imported-${Date.now()}-${i}`,
        date: cells[1] || new Date().toISOString().split('T')[0],
        subCategory: (cells[2] as any) || '수용비및수수료',
        itemName: cells[3] || '가져온 품목',
        specification: cells[4] || '규격',
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        paymentMethod: (cells[8] as any) || '학교법인카드',
        status: (cells[9] as any) || '집행완료',
        remarks: cells[10] || '',
      });
    }
  }

  return parsedItems;
}
