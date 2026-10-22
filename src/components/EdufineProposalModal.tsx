import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileCheck, Layers } from 'lucide-react';
import { BudgetProject, ExpenseItem } from '../types/budget';

interface Props {
  project: BudgetProject;
  isOpen: boolean;
  onClose: () => void;
}

export const EdufineProposalModal: React.FC<Props> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [filterMode, setFilterMode] = useState<'PLANNED' | 'EXECUTED' | 'ALL'>('PLANNED');
  const [copied, setCopied] = useState(false);
  const [proposalTitle, setProposalTitle] = useState(
    `2026학년도 ${project.title} 운영에 따른 물품 구입 및 경비 집행 품의`
  );

  if (!isOpen) return null;

  const filteredItems = project.expenses.filter((item) => {
    if (filterMode === 'PLANNED') return item.status === '계획(예정)';
    if (filterMode === 'EXECUTED') return item.status === '집행완료';
    return true;
  });

  const totalAmount = filteredItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const today = new Date().toISOString().split('T')[0];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const text = `[K-에듀파인 지출품의서]
1. 건명: ${proposalTitle}
2. 관련: 2026학년도 ${project.title} 계획
3. 예산과목: [${project.category}] ${project.title}
4. 소요예산: 일금 ${totalAmount.toLocaleString()}원정 (₩${totalAmount.toLocaleString()})
5. 산출내역:
${filteredItems
  .map(
    (item, idx) =>
      `  ${idx + 1}. ${item.itemName} (${item.specification || '규격'}) : ${item.quantity}개 × ${item.unitPrice.toLocaleString()}원 = ${item.totalPrice.toLocaleString()}원 [${item.subCategory}]`
  )
  .join('\n')}
6. 집행목적: ${project.targetObjective}
7. 기안자: ${project.manager} (${project.department})`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">K-에듀파인 지출품의서 (기안서) 양식</h2>
              <p className="text-xs text-slate-400">
                학교 표준 지출품의 서식으로 인쇄하거나 K-에듀파인 본문에 즉시 복사합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>에듀파인 복사</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>인쇄 / PDF 출력</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">품의 대상 항목:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setFilterMode('PLANNED')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'PLANNED'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                품의예정 / AI추천 ({project.expenses.filter((e) => e.status === '계획(예정)').length}건)
              </button>
              <button
                onClick={() => setFilterMode('EXECUTED')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'EXECUTED'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                기 집행완료 ({project.expenses.filter((e) => e.status === '집행완료').length}건)
              </button>
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterMode === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 목록 ({project.expenses.length}건)
              </button>
            </div>
          </div>
          <span className="text-slate-500">
            소요 금액: <strong className="text-slate-900">{totalAmount.toLocaleString()}원</strong>
          </span>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="edufine-printable-area"
            className="bg-white p-8 sm:p-10 rounded-xl shadow-md border border-slate-300 max-w-3xl w-full font-serif text-slate-900 space-y-6"
          >
            {/* Document Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <div className="text-2xl font-black tracking-widest text-slate-950 mb-1">
                지 출 품 의 서
              </div>
              <div className="text-xs font-sans text-slate-500">
                [학교회계시스템(K-EduFine) 표준 품의 서식]
              </div>
            </div>

            {/* Document Meta Table */}
            <div className="border border-slate-400 text-xs font-sans">
              <div className="grid grid-cols-4 border-b border-slate-300 divide-x divide-slate-300">
                <div className="bg-slate-100 p-2 font-bold text-center">기안자</div>
                <div className="p-2">{project.manager}</div>
                <div className="bg-slate-100 p-2 font-bold text-center">소속부서</div>
                <div className="p-2">{project.department}</div>
              </div>
              <div className="grid grid-cols-4 border-b border-slate-300 divide-x divide-slate-300">
                <div className="bg-slate-100 p-2 font-bold text-center">품의일자</div>
                <div className="p-2">{today}</div>
                <div className="bg-slate-100 p-2 font-bold text-center">회계구분</div>
                <div className="p-2">{project.category} ({project.fiscalYear}학년도)</div>
              </div>
              <div className="grid grid-cols-4 divide-x divide-slate-300">
                <div className="bg-slate-100 p-2 font-bold text-center">예산과목</div>
                <div className="p-2 col-span-3 font-semibold text-slate-800">
                  [{project.category}] {project.title}
                </div>
              </div>
            </div>

            {/* Proposal Title */}
            <div className="space-y-1 font-sans">
              <label className="text-xs font-bold text-slate-700 block">품의 건명</label>
              <input
                type="text"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
              />
            </div>

            {/* Executive Purpose */}
            <div className="space-y-2 text-xs font-sans">
              <div className="font-bold text-slate-800">1. 추진 목적 및 방침</div>
              <p className="p-3 bg-slate-50 rounded border border-slate-200 leading-relaxed text-slate-700">
                2026학년도 {project.title} 사업의 원활한 운영 및 학생 개별 맞춤형 교육활동 지원을 위하여
                필요한 교재·교구 및 운영 경비를 다음과 같이 집행하고자 합니다.
                <br />
                - 세부목적: {project.targetObjective}
              </p>
            </div>

            {/* Itemized Table */}
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">2. 산출 내역표</span>
                <span className="text-slate-500">(단위: 원, 부가세 포함)</span>
              </div>

              <table className="w-full text-xs border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400 divide-x divide-slate-300">
                    <th className="p-2 text-center w-10">연번</th>
                    <th className="p-2 text-center w-24">세부비목</th>
                    <th className="p-2 text-left">품목명(내역)</th>
                    <th className="p-2 text-center w-20">규격</th>
                    <th className="p-2 text-right w-14">수량</th>
                    <th className="p-2 text-right w-20">단가</th>
                    <th className="p-2 text-right w-24">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        품의 대상 항목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.id} className="divide-x divide-slate-300">
                        <td className="p-2 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 text-center">{item.subCategory}</td>
                        <td className="p-2 font-medium">{item.itemName}</td>
                        <td className="p-2 text-center text-slate-600">{item.specification}</td>
                        <td className="p-2 text-right font-mono">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">{item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">{item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-400 divide-x divide-slate-300">
                    <td colSpan={4} className="p-2 text-center">
                      소 요 예 산 합 계
                    </td>
                    <td className="p-2 text-right font-mono">
                      {filteredItems.reduce((s, i) => s + (i.quantity || 0), 0)}
                    </td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-right font-mono text-sm text-indigo-900 font-extrabold">
                      {totalAmount.toLocaleString()}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Requisition text */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded font-sans text-xs flex items-center justify-between">
              <span className="font-bold text-slate-800">총 소요예산 금액:</span>
              <span className="text-sm font-extrabold text-slate-900">
                일금 {totalAmount.toLocaleString()}원정 (₩{totalAmount.toLocaleString()})
              </span>
            </div>

            {/* Required Attachments Notice */}
            <div className="text-[11px] font-sans text-slate-500 space-y-1 border-t border-slate-200 pt-3">
              <div className="font-semibold text-slate-700">※ 결재 후 행정실 제출 증빙서류 안내:</div>
              <div>• 학교법인카드 매출전표 또는 전자세금계산서</div>
              <div>• 물품 검수조서 및 납품 사진 (물품 구입 시)</div>
              <div>• 학생 출석부 / 참가자 명부 및 수령 대장 (간식비, 보상물품 시 필수)</div>
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
