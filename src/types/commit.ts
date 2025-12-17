/**
 * Git提交相关的类型定义
 */

/**
 * 作者信息
 */
export interface AuthorInfo {
  name: string;
  email: string;
}

/**
 * Git原始日志格式类型定义（用于解析中间层）
 */
export interface RawCommitLog {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string; // ISO格式的日期字符串
  message: string;
}

/**
 * 文件变更详情
 */
export interface FileChange {
  filename: string;
  insertions: number;
  deletions: number;
  language?: string;
  status?: 'added' | 'modified' | 'deleted' | 'renamed';
}

/**
 * 完整的提交数据
 */
export interface CommitData {
  hash: string;
  author: AuthorInfo;
  timestamp: Date;
  message: string;
  parentHashes: string[];
  fileChanges: FileChange[];
  totalInsertions: number;
  totalDeletions: number;
  filesChanged: number;
  tags?: string[];
  branchNames?: string[];
}


/**
 * Git读取器配置选项
 */
export interface GitReaderOptions {
  includeAllBranches?: boolean;
  parseFileDetails?: boolean;
  maxConcurrentRequests?: number;
}
