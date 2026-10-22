import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  FileText,
  BarChart3,
  HelpCircle,
  PlusCircle,
  RotateCcw,
  BookOpen,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { BudgetProject, ExpenseItem } from './types/budget';
import { INITIAL_BUDGET_PROJECTS } from './data/defaultBudgets';
import { BudgetSummaryHeader } from './components/BudgetSummaryHeader';
import { BudgetSpreadsheet } from './components/BudgetSpreadsheet';
import { AiRecommendationModal } from './components/AiRecommendationModal';
import { EdufineProposalModal } from './components/EdufineProposalModal';
import { BudgetCharts } from './components/BudgetCharts';
import { BudgetConsultDrawer } from './components/BudgetConsultDrawer';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { exportExpensesToCSV } from './utils/exportUtils';

const STORAGE_KEY = 'edubudget_projects_v1';

export default function App() {
  // Load projects from localStorage or default
  const [projects, setProjects] = useState<BudgetProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
    return INITIAL_BUDGET_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(
    projects[0]?.id || 'proj-basic-learning-2026'
  );

  // Modal states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isEdufineModalOpen, setIsEdufineModalOpen] = useState(false);
  const [isChartsModalOpen, setIsChartsModalOpen] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to storage:', e);
    }
  }, [projects]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  // Update items in current project
  const handleUpdateItems = (updatedExpenses: ExpenseItem[]) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? { ...p, expenses: updatedExpenses } : p
      )
    );
  };

  // Apply AI recommendations into spreadsheet
  const handleApplyAiRecommendations = (newItems: ExpenseItem[]) => {
    const updated = [...newItems, ...activeProject.expenses];
    handleUpdateItems(updated);
    showToast(
      `AI가 추천한 ${newItems.length}개 품목이 지출 장부에 [계획]으로 자동 입력되었습니다!`
    );
  };

  // Save new or edited project
  const handleSaveProject = (newProj: BudgetProject) => {
    const exists = projects.some((p) => p.id === newProj.id);
    if (exists) {
      setProjects((prev) =>
        prev.map((p) => (p.id === newProj.id ? newProj : p))
      );
      showToast('예산 사업 정보가 수정되었습니다.');
    } else {
      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      showToast(`새 예산 사업 [${newProj.title}]이 등록되었습니다.`);
    }
  };

  // Reset to initial sample data
  const handleResetData = () => {
    if (
      window.confirm(
        '모든 예산 데이터를 초기 학교 표준 예시(기초학력, AI동아리, 학급운영비 등)로 복원하시겠습니까?'
      )
    ) {
      setProjects(INITIAL_BUDGET_PROJECTS);
      setActiveProjectId(INITIAL_BUDGET_PROJECTS[0].id);
      showToast('초기 학교 예산 데이터로 복원되었습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Summary & Project Header */}
      <BudgetSummaryHeader
        project={activeProject}
        allProjects={projects}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenNewProject={() => setIsProjectModalOpen(true)}
        onOpenAiRecommend={() => setIsAiModalOpen(true)}
        onOpenEdufineModal={() => setIsEdufineModalOpen(true)}
        onOpenChartsModal={() => setIsChartsModalOpen(true)}
        onOpenConsultDrawer={() => setIsConsultOpen(true)}
        onExportCSV={() => exportExpensesToCSV(activeProject, activeProject.expenses)}
      />

      {/* Main Excel-like Work Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Quick Context Card */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-900">
                실시간 계산 장부
              </span>
              <h2 className="text-sm sm:text-base font-bold">
                {activeProject.title} 지출 산출 명세서
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              엑셀처럼 각 품목의 수량과 단가를 수정하면 합계금액과 남은 잔액이 즉시 재계산됩니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-900" />
              <span>AI 잔액 집행 추천</span>
            </button>
            <button
              onClick={() => setIsEdufineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>품의서 출력</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet Table */}
        <BudgetSpreadsheet
          project={activeProject}
          items={activeProject.expenses}
          onUpdateItems={handleUpdateItems}
          onOpenAiRecommend={() => setIsAiModalOpen(true)}
        />

        {/* Helpful School Accounting Tips Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              목적사업비 집행 원칙
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              목적사업비는 교부된 지정 목적 외 집행이 엄격히 금지됩니다. 학생 직접 교육활동(교재·교구·체험) 위주로 집행하십시오.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              K-에듀파인 품의 연계
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              상단의 [품의서 출력] 버튼을 누르면 학교회계 표준 품의서(기안문) 본문이 생성되어 행정실 기안 시 즉시 복사할 수 있습니다.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              불용액(반납) 방지 전략
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              회계연도 말 정산 시 잔액이 남지 않도록 AI 추천기를 통해 마지막 1원까지 알차게 소진하는 맞춤 품목을 추천받으세요.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">스마트 에듀버짓 (EduBudget Pro)</span>
            <span>· 대한민국 초·중·고 학교 교직원 전용 예산 관리 솔루션</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-[11px] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              샘플 데이터 초기화
            </button>
            <span>·</span>
            <span>K-에듀파인 연계 호환</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AiRecommendationModal
        project={activeProject}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyRecommendations={handleApplyAiRecommendations}
      />

      <EdufineProposalModal
        project={activeProject}
        isOpen={isEdufineModalOpen}
        onClose={() => setIsEdufineModalOpen(false)}
      />

      <BudgetCharts
        project={activeProject}
        isOpen={isChartsModalOpen}
        onClose={() => setIsChartsModalOpen(false)}
      />

      <BudgetConsultDrawer
        project={activeProject}
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveProject}
      />
    </div>
  );
}
