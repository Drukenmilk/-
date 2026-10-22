import React from 'react';
import { X, PieChart, BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { BudgetProject, ExpenseSubCategory, SUB_CATEGORIES } from '../types/budget';

interface Props {
  project: BudgetProject;
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetCharts: React.FC<Props> = ({ project, isOpen, onClose }) => {
  if (!isOpen) return null;

  const totalAllocated = project.allocatedAmount || 1;
  const executedItems = project.expenses.filter((e) => e.status === '집행완료');
  const plannedItems = project.expenses.filter((e) => e.status === '계획(예정)');

  const totalExecuted = executedItems.reduce((s, e) => s + (e.totalPrice || 0), 0);
  const totalPlanned = plannedItems.reduce((s, e) => s + (e.totalPrice || 0), 0);
  const remaining = totalAllocated - totalExecuted;

  // Breakdown by subcategory
  const categoryStats = SUB_CATEGORIES.map((cat) => {
    const executed = executedItems
      .filter((i) => i.subCategory === cat)
      .reduce((s, i) => s + (i.totalPrice || 0), 0);
    const planned = plannedItems
      .filter((i) => i.subCategory === cat)
      .reduce((s, i) => s + (i.totalPrice || 0), 0);
    const total = executed + planned;
    const percentage = totalAllocated > 0 ? (total / totalAllocated) * 100 : 0;

    return {
      category: cat,
      executed,
      planned,
      total,
      percentage,
    };
  }).filter((stat) => stat.total > 0);

  // Group by month
  const monthlyStats: { [month: string]: number } = {};
  executedItems.forEach((item) => {
    const month = (item.date || '2026-01-01').slice(0, 7);
    monthlyStats[month] = (monthlyStats[month] || 0) + (item.totalPrice || 0);
  });

  const sortedMonths = Object.keys(monthlyStats).sort();
  const maxMonthValue = Math.max(...Object.values(monthlyStats), 1);

  // Colors for category bars
  const colors = [
    'bg-indigo-500',
    'bg-blue-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">비목별 지출 통계 및 집행 추이 분석</h2>
              <p className="text-xs text-slate-400">
                {project.title} ({project.category})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Progress Overview */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">전체 예산 소진 진도율</span>
              <span className="text-xs font-extrabold text-indigo-700">
                {((totalExecuted / totalAllocated) * 100).toFixed(1)}% 달성 (계획 포함{' '}
                {(((totalExecuted + totalPlanned) / totalAllocated) * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-3 transition-all"
                style={{ width: `${Math.min(100, (totalExecuted / totalAllocated) * 100)}%` }}
                title="실집행"
              />
              <div
                className="bg-amber-400 h-3 transition-all"
                style={{ width: `${Math.min(100, (totalPlanned / totalAllocated) * 100)}%` }}
                title="계획(예정)"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
              <span>교부액: {totalAllocated.toLocaleString()}원</span>
              <span>집행액: {totalExecuted.toLocaleString()}원</span>
              <span className="font-semibold text-indigo-700">
                잔액: {remaining.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Subcategory Distribution */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
              <PieChart className="w-4 h-4 text-indigo-600" />
              세부 비목별 집행 현황 (원가통계비목)
            </h3>

            {categoryStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">집행된 비목이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((stat, idx) => (
                  <div key={stat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{stat.category}</span>
                      <div className="space-x-2 text-slate-600">
                        <span>실집행: {stat.executed.toLocaleString()}원</span>
                        {stat.planned > 0 && (
                          <span className="text-amber-600">
                            (계획 +{stat.planned.toLocaleString()}원)
                          </span>
                        )}
                        <span className="font-bold text-slate-900">
                          {stat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div
                        className={`${colors[idx % colors.length]} h-2 rounded-full`}
                        style={{ width: `${Math.min(100, stat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              월별 집행 추이
            </h3>

            {sortedMonths.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">집행 내역이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sortedMonths.map((m) => {
                  const val = monthlyStats[m];
                  const barHeight = Math.max(15, (val / maxMonthValue) * 80);
                  return (
                    <div
                      key={m}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">{m}월</div>
                      <div className="text-xs font-bold text-slate-900 mb-2">
                        {val.toLocaleString()}원
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${(val / maxMonthValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audit & Compliance Hint */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">학교회계 집행 점검 팁:</strong>
              <span>
                목적사업비는 연말 불용액(반납)을 최소화하기 위해 10~11월 중 모든 계획 품의를
                완료하고 12월 전 물품 검수 및 원천징수 지출을 마치는 것이 좋습니다.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
