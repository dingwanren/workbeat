/**
 * 图表数据生成器
 * 将分析指标转换为ECharts需要的格式
 */

import { AuthorMetrics } from '../types/metrics.js';
import { CommitData } from '../types/commit.js';
import { GitReader } from '../core/git-reader.js';

export interface ChartData {
  authorNames: string[];
  commitCounts: number[];
  totalInsertions: number[];
  totalDeletions: number[];
  totalInsertionsSum: number;
  totalDeletionsSum: number;
  dates: string[];
  commitTrends: number[];
  codeChangeTrends: number[];
}

/**
 * 生成图表数据
 * @param metrics 分析指标数据
 * @param commits 原始提交数据用于时间趋势分析
 * @returns 转换后的图表数据
 */
export function generateChartData(metrics: AuthorMetrics[], commits: CommitData[]): ChartData {
  // 作者贡献数据
  const authorNames: string[] = [];
  const commitCounts: number[] = [];
  const totalInsertions: number[] = [];
  const totalDeletions: number[] = [];

  for (const metric of metrics) {
    authorNames.push(`${metric.author.name} (${metric.author.email})`);
    commitCounts.push(metric.commitCount);
    totalInsertions.push(metric.totalInsertions);
    totalDeletions.push(metric.totalDeletions);
  }

  // 计算总的插入和删除行数
  const totalInsertionsSum = totalInsertions.reduce((sum, val) => sum + val, 0);
  const totalDeletionsSum = totalDeletions.reduce((sum, val) => sum + val, 0);

  // 生成时间趋势数据
  const timeRange = generateTimeRange(commits);
  const { dates, commitTrends, codeChangeTrends } = generateTrendData(commits, timeRange);

  return {
    authorNames,
    commitCounts,
    totalInsertions,
    totalDeletions,
    totalInsertionsSum,
    totalDeletionsSum,
    dates,
    commitTrends,
    codeChangeTrends
  };
}

/**
 * 生成时间范围
 * @param commits 提交数据
 * @returns 时间范围的开始和结束日期
 */
function generateTimeRange(commits: CommitData[]): { start: Date; end: Date } {
  if (commits.length === 0) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      end: now
    };
  }

  const dates = commits.map(commit => new Date(commit.timestamp));
  const start = new Date(Math.min(...dates.map(date => date.getTime())));
  const end = new Date(Math.max(...dates.map(date => date.getTime())));

  return { start, end };
}

/**
 * 生成趋势数据
 * @param commits 提交数据
 * @param timeRange 时间范围
 * @returns 趋势数据
 */
function generateTrendData(commits: CommitData[], timeRange: { start: Date; end: Date }): {
  dates: string[];
  commitTrends: number[];
  codeChangeTrends: number[];
} {
  // 简化实现：按月份分组数据
  const start = new Date(timeRange.start.getFullYear(), timeRange.start.getMonth(), 1);
  const end = new Date(timeRange.end.getFullYear(), timeRange.end.getMonth(), 1);

  // 生成时间范围内的月份数据
  const dates: string[] = [];
  const commitTrends: number[] = [];
  const codeChangeTrends: number[] = [];

  // 按月份遍历时间范围内的数据
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dateStr = `${year}-${month}`;
    dates.push(dateStr);

    // 统计该月的提交次数
    const monthCommits = commits.filter(commit => {
      const commitDate = new Date(commit.timestamp);
      return commitDate.getFullYear() === year &&
             commitDate.getMonth() === currentDate.getMonth();
    });

    commitTrends.push(monthCommits.length);

    // 统计该月的代码变更
    const monthCodeChanges = monthCommits.reduce((sum, commit) => sum + (commit.insertions - commit.deletions), 0);
    codeChangeTrends.push(monthCodeChanges);

    // 移动到下一个月
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return { dates, commitTrends, codeChangeTrends };
}