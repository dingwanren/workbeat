/**
 * Git仓库分析器
 * 提供分析Git仓库工作节奏的核心功能
 */

import { CommitData } from '../types/commit.js';
import { AuthorMetrics } from '../types/metrics.js';
import { calculateBasicMetrics } from '../metrics/basic-metrics.js';

/**
 * 分析指定仓库
 * @param commits 从Git仓库读取的提交数据
 * @param logCallback 可选的日志回调函数
 * @returns 作者维度的指标结果
 */
export async function analyzeRepository(commits: CommitData[], logCallback?: (message: string) => void): Promise<AuthorMetrics[]> {
  logCallback?.(`正在分析 ${commits.length} 条提交记录`);

  // 检查是否有提交数据
  if (!commits || commits.length === 0) {
    throw new Error('没有提交记录可以分析');
  }

  // 计算基础指标
  const metrics = calculateBasicMetrics(commits);

  return metrics;
}