import type { TaxpayerType } from "@/lib/types";

export const filingNeeds = [
  "wages",
  "retirement",
  "self_employment",
  "rental",
  "investments",
  "mortgage",
  "dependents",
  "books",
  "payroll",
  "assets",
  "loans",
] as const;

export type FilingNeed = (typeof filingNeeds)[number];

export type IntakeAnswers = {
  answered: boolean;
  needs: FilingNeed[];
};

export type FilingQuestion = {
  id: FilingNeed;
  label: string;
  detail: string;
};

const questions = {
  wages: { id: "wages", label: "Wages", detail: "A W-2 from an employer." },
  retirement: { id: "retirement", label: "Retirement or IRA income", detail: "A 1099-R or similar retirement form." },
  self_employment: { id: "self_employment", label: "Self-employment", detail: "Income and expenses for work you run yourself." },
  rental: { id: "rental", label: "Rental property", detail: "Rent received and the expenses for the property." },
  investments: { id: "investments", label: "Investments", detail: "Brokerage or other investment forms." },
  mortgage: { id: "mortgage", label: "Mortgage interest", detail: "Form 1098 or the lender's statement." },
  dependents: { id: "dependents", label: "Dependents", detail: "The people you claim, and the records that support them." },
  books: { id: "books", label: "Books", detail: "The year-end profit and loss, balance sheet, or statements." },
  payroll: { id: "payroll", label: "Payroll", detail: "Payroll reports for the year." },
  assets: { id: "assets", label: "Fixed assets", detail: "Equipment and other assets bought or sold." },
  loans: { id: "loans", label: "Loans", detail: "Loan balances and interest for the year." },
} as const satisfies Record<FilingNeed, FilingQuestion>;

export function isFilingNeed(value: string): value is FilingNeed {
  return filingNeeds.some((need) => need === value);
}

export function filingQuestions(type: TaxpayerType): FilingQuestion[] {
  switch (type) {
    case "individual":
      return [
        questions.wages,
        questions.retirement,
        questions.self_employment,
        questions.rental,
        questions.investments,
        questions.mortgage,
        questions.dependents,
      ];
    case "business":
      return [questions.books, questions.payroll, questions.assets, questions.loans];
    case "nonprofit":
      return [questions.books];
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function emptyIntake(): IntakeAnswers {
  return { answered: false, needs: [] };
}
