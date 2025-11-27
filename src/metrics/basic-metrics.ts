import { CommitData } from '../types/commit';
import { AuthorMetrics } from '../types/metrics';
import pkg from 'lodash';
const { groupBy } = pkg;

/**
 * 计算基础指标
 * @param commits 提交数据数组
 * @returns 作者维度的基础指标数组
 */
export function calculateBasicMetrics(commits: CommitData[]): AuthorMetrics[] {
  // 按作者分组
  const commitsByAuthor = groupBy(commits, (commit) => `${commit.author.name}<${commit.author.email}>`);
  
  const authorMetrics: AuthorMetrics[] = [];
  
  for (const [authorKey, authorCommits] of Object.entries(commitsByAuthor)) {
    // 解析作者信息
    const match = authorKey.match(/^(.+?)<(.+?)>$/);
    if (!match) continue;
    
    const [, name, email] = match;
    
    // 计算各项指标
    const commitCount = authorCommits.length;

    // 累计真实的增删行数 from the commits
    const totalInsertions = authorCommits.reduce((sum, commit) => sum + (commit.insertions || 0), 0);
    const totalDeletions = authorCommits.reduce((sum, commit) => sum + (commit.deletions || 0), 0);

    const netChanges = totalInsertions - totalDeletions;
    
    // 找到首次和最后提交时间
    const dates = authorCommits.map(commit => new Date(commit.timestamp));
    const firstCommitDate = new Date(Math.min(...dates.map(date => date.getTime())));
    const lastCommitDate = new Date(Math.max(...dates.map(date => date.getTime())));
    
    authorMetrics.push({
      author: {
        name,
        email
      },
      commitCount,
      totalInsertions,
      totalDeletions,
      netChanges,
      firstCommitDate,
      lastCommitDate
    });
  }
  
  return authorMetrics;
}

