import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  FileText,
  Lightbulb,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  BudgetProject,
  ExpenseItem,
  AIRecommendationResult,
  RecommendedItem,
} from '../types/budget';

interface Props {
  project: BudgetProject;
  isOpen: boolean;
  onClose: () => void;
  onApplyRecommendations: (newItems: ExpenseItem[]) => void;
}

export const AiRecommendationModal: React.FC<Props> = ({
  project,
  isOpen,
  onClose,
  onApplyRecommendations,
}) => {
  const [focusArea, setFocusArea] = useState('종합 균형 집행');
  const [targetMonth, setTargetMonth] = useState('회계연도 말 정산 대비');
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationResult, setRecommendationResult] =
    useState<AIRecommendationResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const totalExecuted = project.expenses
    .filter((e) => e.status === '집행완료')
    .reduce((s, e) => s + (e.totalPrice || 0), 0);
  const remainingBudget = Math.max(0, project.allocatedAmount - totalExecuted);

  // Generate recommendation via server API
  const handleGenerate = async () => {
    setIsLoading(true);
    setRecommendationResult(null);

    try {
      const response = await fetch('/api/recommend-spending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budgetTitle: project.title,
          budgetCategory: project.category,
          schoolLevel: project.schoolLevel,
          totalBudget: project.allocatedAmount,
          totalSpent: totalExecuted,
          remainingBudget: remainingBudget,
          pastExpenses: project.expenses.map((e) => ({
            item: e.itemName,
            subCategory: e.subCategory,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            totalPrice: e.totalPrice,
            date: e.date,
          })),
          focusArea,
          targetMonth,
          userPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('추천 생성 중 오류가 발생했습니다.');
      }

      const data: AIRecommendationResult = await response.json();
      setRecommendationResult(data);
      // Pre-select all items by default
      setSelectedItems(new Set(data.recommendedItems.map((_, i) => i)));
    } catch (err: any) {
      console.error('Failed to get recommendation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle item selection
  const handleToggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Apply selected recommended items to budget spreadsheet
  const handleApplyToSpreadsheet = () => {
    if (!recommendationResult) return;

    const itemsToAdd: ExpenseItem[] = recommendationResult.recommendedItems
      .filter((_, idx) => selectedItems.has(idx))
      .map((rec, i) => ({
        id: `rec-${Date.now()}-${i}`,
        date: new Date().toISOString().split('T')[0],
        subCategory: (rec.subCategory as any) || '교재교구구입비',
        itemName: rec.itemName,
        specification: rec.specification,
        quantity: rec.quantity,
        unitPrice: rec.unitPrice,
        totalPrice: rec.totalPrice,
        paymentMethod: '학교법인카드',
        status: '계획(예정)',
        remarks: `[AI추천] ${rec.purpose.slice(0, 30)}`,
        isAiRecommended: true,
      }));

    onApplyRecommendations(itemsToAdd);
    onClose();
  };

  // Copy proposal memo text
  const handleCopyMemo = async () => {
    if (!recommendationResult?.draftProposalMemo) return;
    try {
      await navigator.clipboard.writeText(recommendationResult.draftProposalMemo);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  AI 예산 집행 추천 &amp; 잔액 최적 소진 비서
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  학교회계 지침 연계
                </span>
              </div>
              <p className="text-xs text-indigo-100">
                남은 예산을 분석하여 K-에듀파인 지침에 맞는 수량·단가 맞춤 품목을 추천합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Budget Status Ribbon */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              현재 분석 대상 예산 현황
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">사업명</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {project.title}
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">
                  {project.category}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">총 교부 예산액</span>
                <span className="text-sm font-bold text-slate-800 block">
                  {project.allocatedAmount.toLocaleString()}원
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">기 집행액 ({project.expenses.filter(e => e.status === '집행완료').length}건)</span>
                <span className="text-sm font-bold text-emerald-600 block">
                  {totalExecuted.toLocaleString()}원
                </span>
              </div>
              <div className="bg-indigo-50/80 p-3 rounded-lg border border-indigo-200">
                <span className="text-[11px] text-indigo-700 font-semibold block">
                  현재 남은 잔액
                </span>
                <span className="text-base font-extrabold text-indigo-950 block">
                  {remainingBudget.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-indigo-600" />
              추천 조건 설정 (선생님의 희망 방향)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  집행 테마 / 중점 분야
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="종합 균형 집행">🎯 종합 균형 집행 (교재 + 교구 + 간식 + 문구)</option>
                  <option value="기초학력 맞춤형 교재·교구 집중 보강">📚 교재·학습 교구 집중 보강 (1:1 워크북, 보드게임)</option>
                  <option value="학생 참여형 배움캠프 및 동기부여">💡 배움캠프 및 학생 동기부여 (체험재료, 격려간식, 수료품)</option>
                  <option value="회계연도 말 잔액 0원 완전 소진 플랜">⚡ 연말 잔액 0원 완전 소진 (불용 반납 방지 최적화)</option>
                  <option value="소모품 및 학습활동지 인쇄 중심">📄 학습활동지 인쇄 및 소모품 확충</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  집행 시기 / 마감 목표
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="회계연도 말 정산 대비">회계연도 말 정산 대비 (11~12월 집중)</option>
                  <option value="2학기 수업 준비 (9~10월)">2학기 수업 준비 (9~10월)</option>
                  <option value="겨울방학 특별 캠프 (1~2월)">겨울방학 특별 캠프 (1~2월)</option>
                  <option value="신학기 1학기 운영">신학기 1학기 운영</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                선생님의 세부 요구사항 (선택)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="예: 초등 3~4학년 수학 부진 학생 6명과 한글 미해득 학생 2명을 위한 교재와 보드게임 위주로 추천해주세요. 간식비는 10만원 이내로 제한해주세요."
                rows={2}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || remainingBudget <= 0}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                isLoading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : remainingBudget <= 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI 교육청 회계 지침 기반으로 최적 품목 및 단가 계산 중...</span>
                </>
              ) : remainingBudget <= 0 ? (
                <span>남은 잔액이 0원입니다 (추천 불가)</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>남은 {remainingBudget.toLocaleString()}원에 대한 AI 추천 품목 생성하기</span>
                </>
              )}
            </button>
          </div>

          {/* AI Recommendation Results Section */}
          {recommendationResult && (
            <div className="space-y-5 pt-4 border-t border-slate-200 animate-in fade-in duration-300">
              {/* Result Header Card */}
              <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-xl p-4 border border-indigo-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <h4 className="text-sm font-bold text-indigo-950">
                      {recommendationResult.recommendationTitle}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      회계 건전도 점수:
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {recommendationResult.budgetHealthScore}점 / 100
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {recommendationResult.strategySummary}
                </p>

                {/* Balance Simulation Stats */}
                <div className="mt-3 pt-3 border-t border-indigo-100/80 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">배정된 추천 합계</span>
                    <span className="text-xs font-bold text-indigo-900">
                      {recommendationResult.totalRecommendedAmount.toLocaleString()}원
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">집행 후 예상 잔액</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {recommendationResult.predictedFinalBalance.toLocaleString()}원
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">예상 예산 소진율</span>
                    <span className="text-xs font-bold text-blue-700">
                      {(
                        ((totalExecuted + recommendationResult.totalRecommendedAmount) /
                          (project.allocatedAmount || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommended Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>추천 품목 상세 내역 (장부에 추가할 항목을 선택하세요)</span>
                    <span className="text-[11px] text-indigo-600 font-semibold">
                      ({selectedItems.size}/{recommendationResult.recommendedItems.length}개 선택됨)
                    </span>
                  </h4>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5 w-10 text-center">선택</th>
                        <th className="p-2.5 w-24">비목</th>
                        <th className="p-2.5 min-w-[160px]">품목명</th>
                        <th className="p-2.5 w-24">규격</th>
                        <th className="p-2.5 w-16 text-right">수량</th>
                        <th className="p-2.5 w-20 text-right">단가</th>
                        <th className="p-2.5 w-24 text-right bg-indigo-50/70 font-extrabold text-indigo-950">
                          합계금액
                        </th>
                        <th className="p-2.5 min-w-[180px]">선정 사유 및 에듀파인 팁</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recommendationResult.recommendedItems.map((item, idx) => {
                        const isChecked = selectedItems.has(idx);
                        return (
                          <tr
                            key={idx}
                            onClick={() => handleToggleItem(idx)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'bg-slate-50/50 hover:bg-slate-100/50 opacity-60'
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleItem(idx)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-slate-700">
                              {item.subCategory}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              {item.itemName}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {item.specification}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {item.quantity}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {item.unitPrice.toLocaleString()}원
                            </td>
                            <td className="p-2.5 text-right font-mono font-extrabold text-indigo-900 bg-indigo-50/40">
                              {item.totalPrice.toLocaleString()}원
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600">
                              <div className="font-medium text-slate-800">{item.purpose}</div>
                              {item.kEdufineTip && (
                                <div className="text-indigo-600 text-[10px] mt-0.5">
                                  💡 {item.kEdufineTip}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action: Add to spreadsheet */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <strong className="block">선택한 {selectedItems.size}개 품목을 지출 장부에 바로 등록할 수 있습니다.</strong>
                    <span>'계획(예정)' 상태로 자동 기입되어 잔액 계산에 즉시 반영됩니다.</span>
                  </div>
                </div>
                <button
                  onClick={handleApplyToSpreadsheet}
                  disabled={selectedItems.size === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all active:scale-[0.98]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>지출 장부에 즉시 일괄 입력</span>
                </button>
              </div>

              {/* Compliance & Audit Checklist */}
              {recommendationResult.complianceNotes?.length > 0 && (
                <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    교육청 감사 대비 지출 증빙 체크포인트
                  </h4>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                    {recommendationResult.complianceNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* K-EduFine Draft Memo Text */}
              {recommendationResult.draftProposalMemo && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      K-에듀파인 기안문 본문 추천 문안
                    </h4>
                    <button
                      onClick={handleCopyMemo}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                    >
                      {copiedMemo ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>문안 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans">
                    {recommendationResult.draftProposalMemo}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500">
            학교회계 목적사업비 교부조건 및 감사 기준을 반영하여 산출되었습니다.
          </span>
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
