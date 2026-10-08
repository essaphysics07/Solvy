export type ProblemDomain =
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "unknown";

export interface ProblemQuantity {
  quantity: string;
  value: string;
  unit: string;
  evidence: string;
}

export interface ProblemRepresentation {
  domain: ProblemDomain;
  subject: string;
  concept: string;
  pattern: string;
  known: ProblemQuantity[];
  unknown: string[];
  constraints: string[];
  assumptions: string[];
  evidence: string[];
}