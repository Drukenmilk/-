import React from 'react';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  FileText,
  BarChart3,
  HelpCircle,
  PlusCircle,
  FolderOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import { BudgetProject } from '../types/budget';

interface Props {
  project: BudgetProject;
  allProjects: BudgetProject[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onOpenAiRecommend: () => void;
  onOpenEdufineModal: () => void;
  onOpenChartsModal: () => void;
  onOpenConsultDrawer: () => void;
  onExportCSV: () => void;
}

export const BudgetSummaryHeader: React.FC<Props> = ({
  project,
  allProjects,
  onSelectProject,
  onOpenNewProject,
  onOpenAiRecommend,
  onOpenEdufineModal,
  onOpenChartsModal,
  onOpenConsultDrawer,
  onExportCSV,
}) => {
  // Calculations
  const totalAllocated = project.allocatedAmount || 0;
  const executedExpenses = project.expenses.filter((e) => e.status === '집행완료');
  const plannedExpenses = project.expenses.filter((e) => e.status === '계획(예정)');

  const totalExecuted = executedExpenses.reduce((s, e) => s + (e.totalPrice || 0), 0);
  const totalPlanned = plannedExpenses.reduce((s, e) => s + (e.totalPrice || 0), 0);
  const totalCommitted = totalExecuted + totalPlanned;
  const actualRemaining = totalAllocated - totalExecuted;
  const projectedRemaining = totalAllocated - totalCommitted;

  const executionRate = totalAllocated > 0 ? (totalExecuted / totalAllocated) * 100 : 0;
  const totalCommitRate = totalAllocated > 0 ? (totalCommitted / totalAllocated) * 100 : 0;

  // Status diagnosis
  let statusBadge = {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    text: '집행 순항 (적정)',
    desc: '예산 집행 흐름이 원활합니다.',
  };

  if (actualRemaining <= 0) {
    statusBadge = {
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertTriangle,
      text: '예산 소진 완료 / 초과 주의',
      desc: '배정액이 모두 집행되었습니다.',
    };
  } else if (executionRate < 40) {
    statusBadge = {
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle,
      text: '집행 부진 (소진 독려)',
      desc: '회계연도 말 불용 반납 방지를 위해 집행 계획 수립이 필요합니다.',
    };
  } else if (executionRate >= 85) {
    statusBadge = {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle2,
      text: '소진 임박 (안정적)',
      desc: '목적사업비 마감 목표에 근접하고 있습니다.',
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs">
      {/* Top Navigation & Project Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & School context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-100 font-bold text-lg">
              교
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  스마트 에듀버짓
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  교직원 엑셀형 예산 비서
                </span>
              </div>
              <p className="text-xs text-slate-500">
                학교회계 · 목적사업비 실시간 잔액 계산 &amp; K-에듀파인 AI 집행 추천
              </p>
            </div>
          </div>

          {/* Project Dropdown & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
              <FolderOpen className="w-4 h-4 text-slate-500 ml-2 mr-1" />
              <select
                value={project.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 pr-8 py-1 focus:outline-none cursor-pointer"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.title} (
                    {(p.allocatedAmount / 10000).toLocaleString()}만원)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              새 예산 등록
            </button>
          </div>
        </div>

        {/* Current Project Info Ribbon */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
              <Layers className="w-3.5 h-3.5" />
              {project.category}
            </span>
            <span className="text-slate-800 font-medium">
              담당: {project.manager} ({project.department})
            </span>
            <span className="text-slate-400">|</span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              회계 마감일: <strong className="text-slate-700">{project.deadline}</strong>
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="hidden sm:inline text-slate-500 truncate max-w-md">
              목적: {project.targetObjective}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenConsultDrawer}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-md transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              예산집행 지침 Q&amp;A
            </button>
          </div>
        </div>
      </div>

      {/* Main Budget Metrics Strip */}
      <div className="bg-slate-50/80 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 1. 배정 예산액 */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>총 배정 예산액</span>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {totalAllocated.toLocaleString()}
                <span className="text-xs font-medium text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate">
                {project.category} 교부 확정액
              </div>
            </div>

            {/* 2. 누적 집행액 */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>누적 실집행액</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1 text-lg sm:text-xl font-bold text-emerald-700 tracking-tight">
                {totalExecuted.toLocaleString()}
                <span className="text-xs font-medium text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                집행완료 {executedExpenses.length}건
              </div>
            </div>

            {/* 3. 계획/품의중 */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>계획 및 품의예정</span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-1 text-lg sm:text-xl font-bold text-amber-700 tracking-tight">
                {totalPlanned.toLocaleString()}
                <span className="text-xs font-medium text-slate-500 ml-1">원</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {plannedExpenses.length > 0 ? `AI/품의 ${plannedExpenses.length}건` : '대기 항목 없음'}
              </div>
            </div>

            {/* 4. 현재 남은 잔액 (핵심 강조) */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span>현재 실잔액</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-200/60 text-indigo-800 font-semibold">
                  남은 돈
                </span>
              </div>
              <div className="mt-1 text-lg sm:text-xl font-extrabold text-indigo-950 tracking-tight">
                {actualRemaining.toLocaleString()}
                <span className="text-xs font-semibold text-indigo-700 ml-1">원</span>
              </div>
              <div className="mt-1 text-[11px] text-indigo-800 font-medium">
                계획 반영 후: <span className="font-bold">{projectedRemaining.toLocaleString()}원</span>
              </div>
            </div>

            {/* 5. 집행률 및 상태 진단 */}
            <div className="col-span-2 md:col-span-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>집행률 현황</span>
                  <span className="text-xs font-bold text-slate-800">
                    {executionRate.toFixed(1)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-2 transition-all duration-500"
                    style={{ width: `${Math.min(100, executionRate)}%` }}
                    title={`실집행: ${executionRate.toFixed(1)}%`}
                  />
                  {totalCommitRate > executionRate && (
                    <div
                      className="bg-amber-400 h-2 transition-all duration-500"
                      style={{
                        width: `${Math.min(100 - executionRate, totalCommitRate - executionRate)}%`,
                      }}
                      title={`계획포함: ${totalCommitRate.toFixed(1)}%`}
                    />
                  )}
                </div>
              </div>

              {/* Status pill */}
              <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${statusBadge.color}`}>
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{statusBadge.text}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Bar for Teachers */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
            <div className="flex flex-wrap items-center gap-2">
              {/* PRIMARY AI BUTTON */}
              <button
                onClick={onOpenAiRecommend}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>AI 잔액 집행 추천 &amp; 최적 품목 생성</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] text-white">
                  잔액 {actualRemaining.toLocaleString()}원 맞춤
                </span>
              </button>

              <button
                onClick={onOpenEdufineModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                K-에듀파인 품의서 양식 출력
              </button>

              <button
                onClick={onOpenChartsModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                비목별 지출 통계
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="엑셀에서 바로 열 수 있는 CSV 파일로 다운로드합니다"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                엑셀(CSV) 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
