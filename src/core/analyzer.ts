/**
 * Git仓库分析器
 * 提供分析Git仓库工作节奏的核心功能
 */

import { GitReader } from './git-reader.js';
import { RepositoryAnalysisResult, CommitData } from '../types/commit.js';
import { AuthorMetrics } from '../types/metrics.js';
import { calculateBasicMetrics } from '../metrics/basic-metrics.js';
import pkg from 'lodash';
const { groupBy } = pkg;

/**
 * 分析指定仓库
 * @param repoPath 仓库路径
 * @returns 作者维度的指标结果
 */
export async function analyzeRepository(repoPath: string): Promise<AuthorMetrics[]> {
  console.log(`正在分析仓库: ${repoPath}`);

  const gitReader = new GitReader(repoPath);

  // 检查是否为有效的 Git 仓库
  const isValidRepo = await gitReader.isValidGitRepository();
  if (!isValidRepo) {
    throw new Error(`路径 ${repoPath} 不是一个有效的 Git 仓库`);
  }

  // 获取提交日志
  const commits: CommitData[] = await gitReader.getCommitLog(10); // 暂时只取前10条

  // 计算基础指标
  const metrics = calculateBasicMetrics(commits);

  return metrics;
}