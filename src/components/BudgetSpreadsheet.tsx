import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  CheckCircle,
  Clock,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  ExpenseItem,
  ExpenseSubCategory,
  PaymentMethod,
  ExpenseStatus,
  SUB_CATEGORIES,
  PAYMENT_METHODS,
  BudgetProject,
} from '../types/budget';
import { copyTableToClipboard, parseCSVFile } from '../utils/exportUtils';

interface Props {
  project: BudgetProject;
  items: ExpenseItem[];
  onUpdateItems: (items: ExpenseItem[]) => void;
  onOpenAiRecommend: () => void;
}

export const BudgetSpreadsheet: React.FC<Props> = ({
  project,
  items,
  onUpdateItems,
  onOpenAiRecommend,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'totalPrice' | 'itemName'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.specification.toLowerCase().includes(q) ||
          i.remarks.toLowerCase().includes(q)
      );
    }

    if (filterCategory !== 'ALL') {
      result = result.filter((i) => i.subCategory === filterCategory);
    }

    if (filterStatus !== 'ALL') {
      result = result.filter((i) => i.status === filterStatus);
    }

    result.sort((a, b) => {
      if (sortField === 'date') {
        const diff = (a.date || '').localeCompare(b.date || '');
        return sortAsc ? diff : -diff;
      }
      if (sortField === 'totalPrice') {
        return sortAsc ? a.totalPrice - b.totalPrice : b.totalPrice - a.totalPrice;
      }
      if (sortField === 'itemName') {
        const diff = a.itemName.localeCompare(b.itemName);
        return sortAsc ? diff : -diff;
      }
      return 0;
    });

    return result;
  }, [items, searchTerm, filterCategory, filterStatus, sortField, sortAsc]);

  // Handle cell edit
  const handleUpdateItem = (
    id: string,
    field: keyof ExpenseItem,
    value: string | number
  ) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;

      const newItem = { ...item, [field]: value };

      // Auto calculate totalPrice if quantity or unitPrice changed
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
        const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
        newItem.totalPrice = Math.max(0, qty * price);
      }

      return newItem;
    });

    onUpdateItems(updated);
  };

  // Add new blank row
  const handleAddRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}`,
      date: today,
      subCategory: '교재교구구입비',
      itemName: '새 지출 품목',
      specification: '규격 / 단위',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      paymentMethod: '학교법인카드',
      status: '계획(예정)',
      remarks: '',
    };
    onUpdateItems([newItem, ...items]);
  };

  // Delete single item
  const handleDeleteItem = (id: string) => {
    onUpdateItems(items.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Batch delete selected items
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    onUpdateItems(items.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
  };

  // Duplicate item
  const handleDuplicateItem = (item: ExpenseItem) => {
    const duplicated: ExpenseItem = {
      ...item,
      id: `exp-${Date.now()}`,
      itemName: `${item.itemName} (복사본)`,
      status: '계획(예정)',
    };
    onUpdateItems([duplicated, ...items]);
  };

  // Select all toggle
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Clipboard copy
  const handleCopyClipboard = async () => {
    const ok = await copyTableToClipboard(project, filteredItems);
    if (ok) {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    }
  };

  // CSV file import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSVFile(text);
        if (parsed.length > 0) {
          onUpdateItems([...(parsed as ExpenseItem[]), ...items]);
        }
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Calculation totals for bottom row
  const totalExecuted = items
    .filter((i) => i.status === '집행완료')
    .reduce((s, i) => s + (i.totalPrice || 0), 0);
  const totalPlanned = items
    .filter((i) => i.status === '계획(예정)')
    .reduce((s, i) => s + (i.totalPrice || 0), 0);
  const totalAll = totalExecuted + totalPlanned;
  const currentRemaining = project.allocatedAmount - totalExecuted;
  const projectedRemaining = project.allocatedAmount - totalAll;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Spreadsheet Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* Left tools: Add Row, Delete, Copy, Import */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>행 추가</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>선택 {selectedIds.size}개 삭제</span>
            </button>
          )}

          <button
            onClick={handleCopyClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="엑셀이나 한글(HWP) 표에 바로 붙여넣을 수 있도록 복사합니다"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>엑셀/한글용 표 복사</span>
              </>
            )}
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV 불러오기</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
        </div>

        {/* Right tools: Search, Category Filter, Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="품목명, 규격, 비고 검색..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>

          {/* Subcategory filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">전체 비목</option>
              {SUB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">전체 상태</option>
              <option value="집행완료">집행완료</option>
              <option value="계획(예정)">계획(예정)</option>
              <option value="기안대기">기안대기</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 divide-x divide-slate-200">
              <th className="p-2.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredItems.length > 0 &&
                    selectedIds.size === filteredItems.length
                  }
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="p-2.5 w-12 text-center text-slate-500">연번</th>
              <th
                onClick={() => {
                  if (sortField === 'date') setSortAsc(!sortAsc);
                  else {
                    setSortField('date');
                    setSortAsc(false);
                  }
                }}
                className="p-2.5 w-28 cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span>집행일자</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-2.5 w-36">세부비목</th>
              <th
                onClick={() => {
                  if (sortField === 'itemName') setSortAsc(!sortAsc);
                  else {
                    setSortField('itemName');
                    setSortAsc(true);
                  }
                }}
                className="p-2.5 min-w-[200px] cursor-pointer hover:bg-slate-200/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span>품목명 및 세부내역</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-2.5 w-28">규격 / 단위</th>
              <th className="p-2.5 w-16 text-right">수량</th>
              <th className="p-2.5 w-24 text-right">단가(원)</th>
              <th
                onClick={() => {
                  if (sortField === 'totalPrice') setSortAsc(!sortAsc);
                  else {
                    setSortField('totalPrice');
                    setSortAsc(false);
                  }
                }}
                className="p-2.5 w-28 text-right bg-indigo-50/70 text-indigo-950 font-extrabold cursor-pointer hover:bg-indigo-100/70 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>합계금액(원)</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                </div>
              </th>
              <th className="p-2.5 w-28">결제방식</th>
              <th className="p-2.5 w-24 text-center">집행상태</th>
              <th className="p-2.5 min-w-[140px]">비고 및 증빙</th>
              <th className="p-2.5 w-16 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500 font-sans">
                      표시할 지출 내역이 없습니다.
                    </p>
                    <p className="text-xs text-slate-400 font-sans">
                      상단의 [행 추가]를 누르거나 [AI 잔액 집행 추천]으로 자동 생성해보세요.
                    </p>
                    <button
                      onClick={onOpenAiRecommend}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-sans"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI 잔액 추천 실행하기
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isPlanned = item.status === '계획(예정)';

                return (
                  <tr
                    key={item.id}
                    className={`divide-x divide-slate-100 transition-colors group ${
                      isSelected
                        ? 'bg-indigo-50/60'
                        : isPlanned
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* No. */}
                    <td className="p-2 text-center text-slate-400 font-sans">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="p-1">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'date', e.target.value)
                        }
                        className="w-full px-1.5 py-1 text-slate-800 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                      />
                    </td>

                    {/* SubCategory */}
                    <td className="p-1 font-sans">
                      <select
                        value={item.subCategory}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'subCategory',
                            e.target.value as ExpenseSubCategory
                          )
                        }
                        className="w-full px-1.5 py-1 text-slate-700 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                      >
                        {SUB_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Item Name */}
                    <td className="p-1 font-sans">
                      <div className="flex items-center gap-1.5">
                        {item.isAiRecommended && (
                          <span
                            className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"
                            title="AI가 추천한 최적 집행 품목입니다"
                          >
                            AI
                          </span>
                        )}
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'itemName', e.target.value)
                          }
                          placeholder="품목명 입력"
                          className="w-full px-1.5 py-1 text-slate-900 font-medium bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Specification */}
                    <td className="p-1 font-sans">
                      <input
                        type="text"
                        value={item.specification}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'specification', e.target.value)
                        }
                        placeholder="규격/단위"
                        className="w-full px-1.5 py-1 text-slate-600 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none text-xs"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'quantity',
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-full text-right px-1.5 py-1 font-semibold text-slate-800 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'unitPrice',
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-full text-right px-1.5 py-1 text-slate-700 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                      />
                    </td>

                    {/* Total Price (Auto Calculated) */}
                    <td className="p-2 text-right bg-indigo-50/40 text-slate-950 font-bold">
                      {item.totalPrice.toLocaleString()}
                    </td>

                    {/* Payment Method */}
                    <td className="p-1 font-sans">
                      <select
                        value={item.paymentMethod}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'paymentMethod',
                            e.target.value as PaymentMethod
                          )
                        }
                        className="w-full px-1.5 py-1 text-slate-700 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="p-1 text-center font-sans">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'status',
                            e.target.value as ExpenseStatus
                          )
                        }
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer focus:outline-none ${
                          item.status === '집행완료'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === '계획(예정)'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <option value="집행완료">집행완료</option>
                        <option value="계획(예정)">계획(예정)</option>
                        <option value="기안대기">기안대기</option>
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className="p-1 font-sans">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'remarks', e.target.value)
                        }
                        placeholder="영수증, 품의번호, 비고"
                        className="w-full px-1.5 py-1 text-slate-600 bg-transparent rounded focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:outline-none text-xs"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-1 text-center font-sans">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          title="항목 복사"
                          className="p-1 hover:text-indigo-600 rounded hover:bg-slate-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          title="삭제"
                          className="p-1 hover:text-rose-600 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Excel Footer Summary Row */}
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 divide-x divide-slate-200">
              <td colSpan={4} className="p-3 text-center text-slate-700 font-sans">
                계산 종합 합계 (총 {items.length}건 / 표시 {filteredItems.length}건)
              </td>
              <td className="p-3 text-slate-600 font-sans text-xs">
                실집행 {items.filter((i) => i.status === '집행완료').length}건 / 계획{' '}
                {items.filter((i) => i.status === '계획(예정)').length}건
              </td>
              <td className="p-3 text-slate-500 text-center font-sans">합계</td>
              <td className="p-3 text-right font-mono">
                {filteredItems.reduce((s, i) => s + (i.quantity || 0), 0)}
              </td>
              <td className="p-3 text-right text-slate-500 font-sans">-</td>
              <td className="p-3 text-right font-mono bg-indigo-100/80 text-indigo-950 font-extrabold text-sm">
                {filteredItems.reduce((s, i) => s + (i.totalPrice || 0), 0).toLocaleString()}원
              </td>
              <td colSpan={4} className="p-3 font-sans text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>
                    실집행: <strong>{totalExecuted.toLocaleString()}원</strong>
                  </span>
                  <span>
                    실잔액:{' '}
                    <strong className={currentRemaining < 0 ? 'text-rose-600' : 'text-indigo-700'}>
                      {currentRemaining.toLocaleString()}원
                    </strong>
                  </span>
                  <span>
                    계획포함 최종잔액:{' '}
                    <strong className={projectedRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {projectedRemaining.toLocaleString()}원
                    </strong>
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Spreadsheet Status Bar / Quick Tip */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            집행완료: {totalExecuted.toLocaleString()}원 (
            {((totalExecuted / (project.allocatedAmount || 1)) * 100).toFixed(1)}%)
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            계획(품의예정): {totalPlanned.toLocaleString()}원
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
            남은 잔액: {currentRemaining.toLocaleString()}원
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          💡 셀을 클릭하여 직접 수정할 수 있으며 수량×단가는 실시간 자동 계산됩니다.
        </div>
      </div>
    </div>
  );
};
