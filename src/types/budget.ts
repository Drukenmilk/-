export type BudgetCategory = '목적사업비' | '기본운영비' | '수익자부담경비' | '기타지원금';

export type ExpenseSubCategory =
  | '교재교구구입비'
  | '수용비및수수료'
  | '교육운영비'
  | '학생복지비'
  | '강사료'
  | '여비'
  | '업무추진비(협의회비)'
  | '자산취득비'
  | '기타';

export type PaymentMethod =
  | '학교법인카드'
  | '세금계산서'
  | '계좌이체'
  | '현금영수증'
  | '조달구매(S2B/G2B)';

export type ExpenseStatus = '집행완료' | '계획(예정)' | '기안대기';

export interface ExpenseItem {
  id: string;
  date: string;
  subCategory: ExpenseSubCategory;
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  remarks: string;
  isAiRecommended?: boolean;
}

export interface BudgetProject {
  id: string;
  title: string;
  category: BudgetCategory;
  department: string;
  manager: string;
  allocatedAmount: number;
  fiscalYear: number;
  deadline: string;
  schoolLevel: string;
  description: string;
  targetObjective: string;
  expenses: ExpenseItem[];
}

export interface RecommendedItem {
  subCategory: ExpenseSubCategory | string;
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purpose: string;
  kEdufineTip: string;
}

export interface AIRecommendationResult {
  recommendationTitle: string;
  strategySummary: string;
  budgetHealthScore: number;
  recommendedItems: RecommendedItem[];
  totalRecommendedAmount: number;
  predictedFinalBalance: number;
  complianceNotes: string[];
  draftProposalMemo: string;
  warning?: string;
}

export const SUB_CATEGORIES: ExpenseSubCategory[] = [
  '교재교구구입비',
  '수용비및수수료',
  '교육운영비',
  '학생복지비',
  '강사료',
  '여비',
  '업무추진비(협의회비)',
  '자산취득비',
  '기타',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  '학교법인카드',
  '세금계산서',
  '계좌이체',
  '현금영수증',
  '조달구매(S2B/G2B)',
];
