export type AnalysisCoverage = "full" | "partial_budget";

export type AnalysisStrategy = "single_pass" | "map_reduce";

export type CurationReason =
  | "readme"
  | "manifest"
  | "config"
  | "entry_point"
  | "source"
  | "referenced"
  | "high_import"
  | "other";

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface RepoMetadata {
  fullName: string;
  defaultBranch: string;
  description: string | null;
  topics: string[];
  languages: Record<string, number>;
  readme: string | null;
  recentCommits: CommitSummary[];
}

export interface RepoFile {
  path: string;
  contents: string;
  bytes: number;
}

export interface GatherResult {
  metadata: RepoMetadata;
  files: RepoFile[];
  isEmpty: boolean;
}

export interface CuratedFile {
  path: string;
  contents: string;
  bytes: number;
  estimatedTokens: number;
  score: number;
  reason: CurationReason;
}

export interface CuratedContext {
  metadata: RepoMetadata;
  fileTree: string[];
  files: CuratedFile[];
  totalEstimatedTokens: number;
  strategy: AnalysisStrategy;
  coverage: AnalysisCoverage;
  excludedCount: number;
  isEmpty: boolean;
}