import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini client
function getAiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const client = getAiClient();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Spending Recommendation Endpoint
app.post('/api/recommend-spending', async (req: Request, res: Response) => {
  try {
    const {
      budgetTitle,
      budgetCategory = '목적사업비',
      schoolLevel = '초·중·고 공통',
      totalBudget,
      totalSpent,
      remainingBudget,
      pastExpenses = [],
      focusArea = '종합 균형 집행',
      targetMonth = '회계연도 말 정산 대비',
      userPrompt = '',
    } = req.body;

    // Validate
    const safeRemaining = Number(remainingBudget) || 0;
    const safeTotal = Number(totalBudget) || 0;

    const ai = getAiClient();
    if (!ai) {
      // Fallback deterministic generator if API key is not yet set in environment
      const fallbackResult = generateFallbackRecommendations(
        budgetTitle,
        budgetCategory,
        safeRemaining,
        safeTotal,
        focusArea
      );
      return res.json(fallbackResult);
    }

    const systemInstruction = `당신은 대한민국 시·도 교육청 소속의 20년 경력 학교회계 및 목적사업비 예산집행 최고 전문가(장학사 및 교육행정 사무관)입니다.
학교 현장의 교직원(초·중·고 교사 및 행정실 직원)이 목적사업비(기초학력, 방과후, SW/AI 등)나 기본운영비의 남은 예산을 K-에듀파인 지침과 교육청 감사 기준에 100% 부합하게, 알차고 실질적인 엑셀 품목 형태로 집행할 수 있도록 추천안을 작성해야 합니다.

[핵심 예산 집행 준수 수칙]
1. 목적성 엄수: ${budgetTitle} (${budgetCategory})의 본래 사업 취지에 정확히 부합하는 품목만 제안하십시오.
2. 수량 × 단가 = 합계 계산의 정밀성: 엑셀 장부에 바로 기입될 수 있도록 현실적이고 구체적인 규격, 수량, 시중 실구매 단가를 제시하십시오.
3. 잔액 소진율 극대화: 현재 남은 잔액(${safeRemaining.toLocaleString()}원)을 거의 100% 소진하여 불용액(반납액)이 0원 혹은 수천 원 이내로 떨어지도록 정밀하게 조합하십시오. 추천 항목들의 합계금액이 잔액을 절대 초과하지 않아야 합니다.
4. 비목 준수: 학교회계 표준 비목(수용비및수수료, 교육운영비, 교재교구구입비, 학생복지비, 강사료 등)을 명확히 분류하십시오.
5. 협의회비/간식비 지침: 목적사업비 내 다과/협의회비는 최소화하고, 학생 직접지원(교재, 학습교구, 체험재료, 보상물품 등) 중심으로 편성하십시오.`;

    const promptText = `[학교 예산 분석 및 집행 추천 의뢰서]
- 사업/예산명: ${budgetTitle}
- 예산 성격: ${budgetCategory}
- 학교급: ${schoolLevel}
- 총 교부 예산액: ${safeTotal.toLocaleString()}원
- 현재까지 집행액: ${Number(totalSpent).toLocaleString()}원
- 현재 잔여 예산: ${safeRemaining.toLocaleString()}원
- 집행 목표 시기: ${targetMonth}
- 중점 희망 분야: ${focusArea}
${userPrompt ? `- 담당 교사의 특별 요청사항: ${userPrompt}` : ''}
${
  pastExpenses.length > 0
    ? `- 기존에 이미 집행한 품목 내역:
${pastExpenses
  .slice(0, 10)
  .map(
    (e: any) =>
      `  • ${e.item} (${e.subCategory || '일반'}, ${e.quantity || 1}개 × ${(e.unitPrice || e.totalPrice || 0).toLocaleString()}원 = ${(e.totalPrice || 0).toLocaleString()}원)`
  )
  .join('\n')}`
    : '- 기존 집행 내역: 신규 사업이거나 아직 집행 내역 없음'
}

위 조건과 남은 잔액(${safeRemaining.toLocaleString()}원)을 바탕으로, 담당 교직원이 K-에듀파인 품의서에 바로 등록할 수 있는 구체적인 엑셀 품목 추천 리스트(3~6개 항목)와 정산 가이드를 생성해주세요. 추천 항목들의 합계가 ${safeRemaining.toLocaleString()}원을 넘지 않고 잔액을 최적으로 소진해야 합니다.`;

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendationTitle: {
              type: Type.STRING,
              description: '추천 플랜의 핵심 타이틀',
            },
            strategySummary: {
              type: Type.STRING,
              description: '사업 목적 부합성 및 집행 전략 요약 (2~3문장)',
            },
            budgetHealthScore: {
              type: Type.INTEGER,
              description: '현재 집행 건전성 점수 (1~100)',
            },
            recommendedItems: {
              type: Type.ARRAY,
              description: '추천 지출 품목 리스트',
              items: {
                type: Type.OBJECT,
                properties: {
                  subCategory: {
                    type: Type.STRING,
                    description: '세부 비목 (예: 교재교구구입비, 수용비및수수료, 교육운영비, 학생복지비, 강사료)',
                  },
                  itemName: {
                    type: Type.STRING,
                    description: '구체적인 품목명 (예: 수학 연산 기초탄탄 워크북, 문해력 어휘 보드게임)',
                  },
                  specification: {
                    type: Type.STRING,
                    description: '규격 또는 단위 (예: 초등 3~6학년용 / 권, 4인용 1세트)',
                  },
                  quantity: {
                    type: Type.INTEGER,
                    description: '추천 수량',
                  },
                  unitPrice: {
                    type: Type.INTEGER,
                    description: '추천 단가 (원)',
                  },
                  totalPrice: {
                    type: Type.INTEGER,
                    description: '합계금액 (수량 x 단가)',
                  },
                  purpose: {
                    type: Type.STRING,
                    description: '선정 사유 및 교육적 효과',
                  },
                  kEdufineTip: {
                    type: Type.STRING,
                    description: 'K-에듀파인 품의 시 주의사항',
                  },
                },
                required: [
                  'subCategory',
                  'itemName',
                  'specification',
                  'quantity',
                  'unitPrice',
                  'totalPrice',
                  'purpose',
                ],
              },
            },
            totalRecommendedAmount: {
              type: Type.INTEGER,
              description: '추천 항목들의 총 합계 금액',
            },
            predictedFinalBalance: {
              type: Type.INTEGER,
              description: '추천 항목 집행 후 최종 잔여 금액',
            },
            complianceNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '교육청 감사 대비 필수 체크포인트 (영수증, 증빙, 명부 등)',
            },
            draftProposalMemo: {
              type: Type.STRING,
              description: 'K-에듀파인 기안문 본문에 복사할 수 있는 사업추진목적 및 산출개요 예시문',
            },
          },
          required: [
            'recommendationTitle',
            'strategySummary',
            'budgetHealthScore',
            'recommendedItems',
            'totalRecommendedAmount',
            'predictedFinalBalance',
            'complianceNotes',
            'draftProposalMemo',
          ],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 10000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    let rawText = response.text ? response.text.trim() : '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.slice(7);
    }
    if (rawText.startsWith('```')) {
      rawText = rawText.slice(3);
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3);
    }
    rawText = rawText.trim();
    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini recommendation error detail:', error?.message || error);
    // Provide safe fallback response on error
    const { budgetTitle, budgetCategory, remainingBudget, totalBudget, focusArea } =
      req.body || {};
    const fallback = generateFallbackRecommendations(
      budgetTitle || '학교 사업 예산',
      budgetCategory || '목적사업비',
      Number(remainingBudget) || 500000,
      Number(totalBudget) || 1000000,
      focusArea || '학습지원'
    );
    return res.json({
      ...fallback,
      warning: 'AI 실시간 연동 중 일시적 오류가 발생하여 학교회계 표준 추천 템플릿으로 제공되었습니다.',
    });
  }
});

// Fallback consult answer when AI service is unavailable or experiencing spikes
function getFallbackConsultAnswer(question: string, remainingBudget: number): string {
  const q = question.toLowerCase();
  const remStr = Number(remainingBudget || 0).toLocaleString();

  if (q.includes('간식') || q.includes('다과') || q.includes('음료')) {
    return `시·도 교육청 예산편성 기본지침에 따라 학생 간식비는 통상 1인 1회 4,000원~5,000원(다과 3,000원 이하) 범위 내에서 집행 가능합니다. 결재 시 "학생 출석부(또는 참가자 명단)"와 "간식 수령 서명부(영수증 포함)"를 반드시 에듀파인에 첨부하셔야 감사 시 지적을 예방할 수 있습니다.`;
  }
  if (q.includes('교사') || q.includes('지도서') || q.includes('참고서') || q.includes('비품')) {
    return `목적사업비는 학생 직접 지원 목적이 원칙입니다. 학생 수업 지도에 필수적인 1:1 지도용 교재나 지도서는 교재교구비로 집행 가능하나, 순수 교사용 연구도서나 교사용 전자비품은 학교기본운영비(교과운영비)로 지출하셔야 지침 위반을 방지할 수 있습니다.`;
  }
  if (q.includes('협의회') || q.includes('식대') || q.includes('회의')) {
    return `목적사업비 내 협의회비는 전체 사업비의 5%~10% 이내, 1인당 30,000원 이하(식비 기준)로 엄격히 제한됩니다. 협의록(일시, 장소, 참석자 서명부, 회의내용)과 카드 영수증을 필히 구비하여 품의하시기 바랍니다.`;
  }
  if (q.includes('반납') || q.includes('이월') || q.includes('불용') || q.includes('연말')) {
    return `목적사업비는 명시이월 승인을 받지 않은 한 회계연도 말(2월)에 집행잔액이 교육청으로 전액 반납(불용)됩니다. 현재 남은 잔액(${remStr}원)은 11~12월 중 학생 맞춤형 교재, 보드게임, 체험학습 재료비 등으로 계획을 세워 알차게 소진하시는 것을 권장합니다.`;
  }
  if (q.includes('견적서') || q.includes('계약') || q.includes('s2b')) {
    return `2,000만원 이하 1인 수의계약 시 1건의 견적서로 가능하며, 통상 200만원 초과 시 비교견적서(2곳 이상)를 요구하는 학교가 많습니다. 교구 및 문구류는 학교장터(S2B)를 이용하시면 행정실 계약 절차가 훨씬 간소화됩니다.`;
  }

  return `학교회계 목적사업비는 교부조건과 학생 직접지원 원칙을 준수해야 합니다. 현재 남은 잔액(${remStr}원)은 품의서 작성 시 '산출내역(수량×단가=금액)'을 구체적으로 기재하시고, 검수조서와 납품사진을 구비하여 집행하시기 바랍니다.`;
}

// Smart Question/Consult Endpoint for School Teachers
app.post('/api/consult-budget', async (req: Request, res: Response) => {
  const { question = '', budgetTitle = '', remainingBudget = 0 } = req.body || {};
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.json({
        answer: getFallbackConsultAnswer(question, remainingBudget),
      });
    }

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `질문: "${question}"\n관련 예산: "${budgetTitle}" (잔액: ${Number(remainingBudget || 0).toLocaleString()}원)\n대한민국 초·중·고 학교회계 지침(에듀파인 규정, 공공기관 예산집행지침, 목적사업비 교부조건)에 근거하여 교직원이 현장에서 즉시 적용할 수 있도록 명쾌하고 실용적인 답변을 3~4문장으로 작성해주세요.`,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI consult timeout')), 7000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    return res.json({ answer: response.text });
  } catch (err: any) {
    console.error('Consult error detail:', err?.message || err);
    // Gracefully return school accounting guidance without breaking UI
    return res.json({
      answer: getFallbackConsultAnswer(question, remainingBudget),
    });
  }
});

// Deterministic fallback generator
function generateFallbackRecommendations(
  title: string,
  category: string,
  remaining: number,
  total: number,
  focus: string
) {
  const isBasicLearning = title.includes('기초학력') || title.includes('학습');
  const isClassroom = title.includes('학급') || title.includes('반');
  const isAiSw = title.includes('SW') || title.includes('AI') || title.includes('디지털');

  let items = [];
  if (isBasicLearning) {
    const bookQty = Math.max(2, Math.floor((remaining * 0.35) / 15000));
    const gameQty = Math.max(1, Math.floor((remaining * 0.35) / 32000));
    const snackQty = Math.max(5, Math.floor((remaining * 0.2) / 4500));
    const bookTotal = bookQty * 15000;
    const gameTotal = gameQty * 32000;
    const snackTotal = snackQty * 4500;
    const diff = remaining - (bookTotal + gameTotal + snackTotal);
    const stationQty = Math.max(1, Math.floor(Math.max(0, diff) / 2500));
    const stationTotal = stationQty * 2500;

    items = [
      {
        subCategory: '교재교구구입비',
        itemName: '기초 문해력·수리력 맞춤형 지도 워크북',
        specification: '학생 개별 맞춤 진도용 / 권',
        quantity: bookQty,
        unitPrice: 15000,
        totalPrice: bookTotal,
        purpose: '방과후 및 틈새시간 기초학력 부진 학생 1:1 보충지도용 워크북',
        kEdufineTip: '교재 구입 시 세금계산서 또는 법인카드 매출전표 첨부',
      },
      {
        subCategory: '교재교구구입비',
        itemName: '학습동기 강화 연산·어휘 보드게임 교구',
        specification: '보드게임형 교구 / 세트',
        quantity: gameQty,
        unitPrice: 32000,
        totalPrice: gameTotal,
        purpose: '흥미 유발형 교구를 활용한 기초학습 부진 극복 및 집중력 향상',
        kEdufineTip: '물품구입 품의 및 납품서/물품사진 첨부',
      },
      {
        subCategory: '교육운영비',
        itemName: '기초학력 지도교실 참여 학생 격려 간식세트',
        specification: '개별 포장 다과세트 / 세트',
        quantity: snackQty,
        unitPrice: 4500,
        totalPrice: snackTotal,
        purpose: '방과후 튜터링 참여 학생 학습 피로도 완화 및 격려',
        kEdufineTip: '학생 출석부 및 수령 대장 증빙 필수',
      },
      {
        subCategory: '수용비및수수료',
        itemName: '학습 정리용 바인더 및 오답노트 문구류',
        specification: '링바인더 + 속지 / 세트',
        quantity: stationQty,
        unitPrice: 2500,
        totalPrice: stationTotal,
        purpose: '개인별 학습 이력 관리 및 피드백 정리',
        kEdufineTip: '소모품 검수조서 구비',
      },
    ];
  } else if (isAiSw) {
    const kitQty = Math.max(2, Math.floor((remaining * 0.5) / 45000));
    const bookQty = Math.max(2, Math.floor((remaining * 0.3) / 18000));
    const rest = remaining - (kitQty * 45000 + bookQty * 18000);
    const partsQty = Math.max(1, Math.floor(Math.max(0, rest) / 5000));

    items = [
      {
        subCategory: '교재교구구입비',
        itemName: '피지컬 컴퓨팅 코딩 실습 센서 키트',
        specification: '아두이노/마이크로비트 호환 / 키트',
        quantity: kitQty,
        unitPrice: 45000,
        totalPrice: kitQty * 45000,
        purpose: '학생 1인 1실습 코딩 및 센서 제어 프로젝트 구현',
        kEdufineTip: '자산취득이 아닌 수업용 소모성 교구로 분류 품의',
      },
      {
        subCategory: '교재교구구입비',
        itemName: '엔트리/파이썬 실습 가이드북 교재',
        specification: '초·중등 프로젝트 실습서 / 권',
        quantity: bookQty,
        unitPrice: 18000,
        totalPrice: bookQty * 18000,
        purpose: '단계별 자기주도적 SW 프로젝트 실습',
        kEdufineTip: '도서구입 목록표 첨부',
      },
      {
        subCategory: '수용비및수수료',
        itemName: '프로젝트 산출물 정리용 보관 케이스 및 라벨지',
        specification: '정리함 세트 / 개',
        quantity: partsQty,
        unitPrice: 5000,
        totalPrice: partsQty * 5000,
        purpose: '부품 분실 방지 및 교구 보관 관리',
        kEdufineTip: '소모품 품의',
      },
    ];
  } else {
    // General school project
    const p1 = Math.max(2, Math.floor((remaining * 0.4) / 12000));
    const p2 = Math.max(1, Math.floor((remaining * 0.35) / 28000));
    const rem = remaining - (p1 * 12000 + p2 * 28000);
    const p3 = Math.max(1, Math.floor(Math.max(0, rem) / 3000));

    items = [
      {
        subCategory: '수용비및수수료',
        itemName: '프로그램 활동 워크북 및 학습활동지 인쇄',
        specification: '칼라 양면 제본 / 권',
        quantity: p1,
        unitPrice: 12000,
        totalPrice: p1 * 12000,
        purpose: '학생 활동 기록 및 포트폴리오 누적 관리',
        kEdufineTip: '인쇄내역서 및 견적서 첨부',
      },
      {
        subCategory: '교재교구구입비',
        itemName: '주제 중심 탐구 활동 재료 패키지',
        specification: '체험 학습용 세트 / 세트',
        quantity: p2,
        unitPrice: 28000,
        totalPrice: p2 * 28000,
        purpose: '실습 및 모둠 협동 학습 활성화',
        kEdufineTip: '카드 매출전표 또는 세금계산서',
      },
      {
        subCategory: '학생복지비',
        itemName: '참여 학생 우수 활동 격려 시상용품',
        specification: '학습 문구 세트 / 개',
        quantity: p3,
        unitPrice: 3000,
        totalPrice: p3 * 3000,
        purpose: '성실 참여 유도 및 학업 성취 고취',
        kEdufineTip: '지급 대상자 명부(서명부) 보관',
      },
    ];
  }

  const totalRecommended = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    recommendationTitle: `${title} 잔여 예산 최적 집행 및 불용 방지 플랜`,
    strategySummary: `잔여 예산 ${remaining.toLocaleString()}원을 학생 직접지원 중심(교재, 실습재료, 동기부여)으로 균형 배분하여 회계연도 말 불용액 반납을 방지하고 교육 효과를 극대화합니다.`,
    budgetHealthScore: 88,
    recommendedItems: items,
    totalRecommendedAmount: totalRecommended,
    predictedFinalBalance: Math.max(0, remaining - totalRecommended),
    complianceNotes: [
      '목적사업비 지침상 비목 간 임의 전용 불가 (교재교구 및 수용비 내 집행 권장)',
      '1인당 간식비는 교육청 지침 한도(통상 1인 4,000~5,000원) 준수',
      '물품 검수조서 및 납품사진 구비 필수',
      '학생 지급 물품은 수령 확인 대장(서명부) 반드시 편철',
    ],
    draftProposalMemo: `1. 관련: 2026학년도 ${title} 운영 계획\n2. 위와 관련하여 학생 맞춤형 교육활동 지원 및 잔여 예산의 건전한 집행을 위하여 필요한 물품을 다음과 같이 구입(품의)하고자 합니다.\n  가. 건명: ${title} 맞춤형 교재 및 활동 재료 구입\n  나. 집행내역: 산출내역표 참조\n  다. 소요예산: 금${totalRecommended.toLocaleString()}원 (금액은 수량에 따라 변동 가능)`,
  };
}

// Development Vite middleware or Production static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduBudget fullstack server running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
});
