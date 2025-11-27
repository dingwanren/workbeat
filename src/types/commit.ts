/**
 * Git提交相关的类型定义
 */

/**
 * Git原始日志格式类型定义
 */
export interface RawCommitLog {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string; // ISO格式的日期字符串
  message: string;
}

/**
 * 统一格式的提交数据结构
 */
export interface CommitData {
  hash: string;
  author: {
    name: string;
    email: string;
  };
  timestamp: Date;
  message: string;
}

/**
 * 仓库分析结果类型定义
 */
export interface RepositoryAnalysisResult {
  repositoryPath: string;
  totalCommits: number;
  commits: CommitData[];
  authors: Array<{
    name: string;
    email: string;
    commitCount: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}