import React, { useState } from 'react';
import { X, HelpCircle, Send, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { BudgetProject } from '../types/budget';

interface Props {
  project: BudgetProject;
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_LIST = [
  {
    q: '목적사업비로 교사용 참고서나 지도 물품을 사도 되나요?',
    a: '원칙적으로 목적사업비는 교부 목적(학생 직접 지원)에 부합해야 합니다. 교사용 지도서는 학생 지도를 위한 필수 수업 교재 목적이라면 교재교구비로 집행 가능하나, 순수 교사용 연구도서나 교사 개인용 물품은 일반 학교기본예산(교과운영비/연구비)으로 집행하는 것이 안전합니다.',
  },
  {
    q: '학생 간식비 집행 시 1인당 단가 상한선과 필수 증빙은?',
    a: '시·도 교육청 예산편성 기본지침에 따라 통상 1인 1회 4,000원 ~ 5,000원 이하(식대의 경우 8,000원~9,000원)로 집행해야 합니다. 결재 시 "학생 출석부" 또는 "참가자 명부"와 "간식 수령 서명부(영수증 포함)"가 반드시 첨부되어야 감사 시 지적을 받지 않습니다.',
  },
  {
    q: '협의회비(다과비)는 목적사업비에서 얼마나 쓸 수 있나요?',
    a: '목적사업비 내 협의회비는 원칙적으로 사업 운영을 위한 최소한으로 편성해야 하며, 통상 총 사업예산의 5%~10% 이내, 1인당 30,000원 이하(다과는 10,000원 이하)로 엄격히 제한됩니다. 목적사업비 취지가 학생 지원이므로 가급적 학생 직접 경비로 우선 집행하는 것을 권장합니다.',
  },
  {
    q: '회계연도 말에 남은 목적사업비는 이월되나요, 반납인가요?',
    a: '목적사업비는 명시이월 요건을 갖춘 특정 계속사업을 제외하고는 회계연도 말(통상 2월 말)에 집행잔액 전액을 교육청/지자체로 정산 반납(불용)하게 됩니다. 따라서 11~12월 중 AI 추천 플랜을 활용해 100% 알차게 집행하는 것이 중요합니다.',
  },
];

export const BudgetConsultDrawer: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const [customQuestion, setCustomQuestion] = useState('');
  const [consultAnswer, setConsultAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const totalExecuted = project.expenses
    .filter((e) => e.status === '집행완료')
    .reduce((s, e) => s + (e.totalPrice || 0), 0);
  const remaining = project.allocatedAmount - totalExecuted;

  const handleAsk = async (questionText: string) => {
    setIsLoading(true);
    setConsultAnswer(null);

    try {
      const res = await fetch('/api/consult-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          budgetTitle: project.title,
          remainingBudget: remaining,
        }),
      });

      const data = await res.json();
      setConsultAnswer(data.answer || '답변을 불러오지 못했습니다.');
    } catch (err) {
      console.error(err);
      setConsultAnswer('상담 처리 중 오류가 발생했습니다. 행정실 학교회계 담당자에게 문의하세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold">학교회계 지침 &amp; 예산 Q&amp;A</h2>
              <p className="text-[11px] text-slate-400">교직원을 위한 목적사업비 집행 가이드</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Current Budget Context Banner */}
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-950">
            <strong>현재 선택 사업:</strong> {project.title} ({project.category})<br />
            <strong>잔여 예산:</strong> {remaining.toLocaleString()}원
          </div>

          {/* AI Q&A Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              학교회계 지침 AI에게 직접 물어보기
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="예: 카드 대신 세금계산서로 집행해도 되나요?"
                className="flex-1 text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customQuestion.trim()) {
                    handleAsk(customQuestion);
                  }
                }}
              />
              <button
                onClick={() => customQuestion.trim() && handleAsk(customQuestion)}
                disabled={isLoading || !customQuestion.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Answer Display */}
            {isLoading && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>교육청 회계 규정을 분석하여 답변 중입니다...</span>
              </div>
            )}

            {consultAnswer && !isLoading && (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl text-xs text-slate-800 space-y-1 animate-in fade-in">
                <div className="font-bold text-indigo-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  AI 장학사 답변
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{consultAnswer}</p>
              </div>
            )}
          </div>

          {/* Quick FAQ List */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-700">교직원 단골 문의 FAQ</h3>
            <div className="space-y-2.5">
              {FAQ_LIST.map((faq, i) => (
                <div
                  key={i}
                  onClick={() => handleAsk(faq.q)}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-slate-900 mb-1">Q. {faq.q}</div>
                  <div className="text-[11px] text-slate-600 line-clamp-2">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          행정실 및 관할 시·도 교육청 예산편성 지침을 준용합니다.
        </div>
      </div>
    </div>
  );
};
