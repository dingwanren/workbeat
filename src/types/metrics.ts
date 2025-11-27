import { CommitData } from './commit';

export interface AuthorMetrics {
  author: {
    name: string;
    email: string;
  };
  commitCount: number;
  totalInsertions: number;
  totalDeletions: number;
  netChanges: number; // 新增-删除
  firstCommitDate: Date;
  lastCommitDate: Date;
}

export interface CommitDataWithMetrics extends CommitData {
  insertions: number;
  deletions: number;
}