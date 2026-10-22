import React, { useState } from 'react';
import { X, FolderPlus, Layers, Calendar, DollarSign, User, Target } from 'lucide-react';
import { BudgetProject, BudgetCategory } from '../types/budget';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (project: BudgetProject) => void;
  initialProject?: BudgetProject | null;
}

export const ProjectManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveProject,
  initialProject,
}) => {
  const [title, setTitle] = useState(initialProject?.title || '');
  const [category, setCategory] = useState<BudgetCategory>(
    initialProject?.category || '목적사업비'
  );
  const [department, setDepartment] = useState(initialProject?.department || '교육연구부');
  const [manager, setManager] = useState(initialProject?.manager || '담당교사');
  const [allocatedAmount, setAllocatedAmount] = useState<number>(
    initialProject?.allocatedAmount || 3000000
  );
  const [fiscalYear, setFiscalYear] = useState<number>(initialProject?.fiscalYear || 2026);
  const [deadline, setDeadline] = useState(initialProject?.deadline || '2026-12-15');
  const [schoolLevel, setSchoolLevel] = useState(initialProject?.schoolLevel || '초등학교');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [targetObjective, setTargetObjective] = useState(
    initialProject?.targetObjective || '학생 맞춤형 학습 지원 및 기초학력 강화'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || allocatedAmount <= 0) return;

    const newProject: BudgetProject = {
      id: initialProject?.id || `proj-${Date.now()}`,
      title: title.trim(),
      category,
      department: department.trim(),
      manager: manager.trim(),
      allocatedAmount: Number(allocatedAmount),
      fiscalYear: Number(fiscalYear),
      deadline,
      schoolLevel,
      description: description.trim(),
      targetObjective: targetObjective.trim(),
      expenses: initialProject?.expenses || [],
    };

    onSaveProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">
              {initialProject ? '예산 사업 정보 수정' : '새 학교 예산 등록'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              예산 사업명 (필수)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 기초학력 향상 맞춤형 지원 사업, 3학년 학급운영비"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                예산 성격 (회계 구분)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BudgetCategory)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="목적사업비">목적사업비 (교육청 지정 교부금)</option>
                <option value="기본운영비">기본운영비 (학급비, 교과비)</option>
                <option value="수익자부담경비">수익자부담경비 (방과후 등)</option>
                <option value="기타지원금">기타 지자체 지원금</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                총 배정 예산액 (원, 필수)
              </label>
              <input
                type="number"
                step="10000"
                min="10000"
                required
                value={allocatedAmount}
                onChange={(e) => setAllocatedAmount(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">담당 부서</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 교육연구부, 5학년부, 방과후부"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">담당 교직원</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="예: 김교사, 박부장"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">회계연도</label>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">집행 마감일</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              사업 추진 목적 / 핵심 목표
            </label>
            <input
              type="text"
              value={targetObjective}
              onChange={(e) => setTargetObjective(e.target.value)}
              placeholder="예: 기초학력 부진학생 12명 100% 최소성취수준 도달 지원"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
