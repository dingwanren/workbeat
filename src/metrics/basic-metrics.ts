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
    
    // 模拟增删行数（暂时使用随机数）
    let totalInsertions = 0;
    let totalDeletions = 0;
    
    for (const commit of authorCommits) {
      // 生成基于提交哈希的随机但确定的增删行数
      const hashValue = getDeterministicValueFromHash(commit.hash);
      const insertions = 10 + (hashValue % 91); // 10-100行
      const deletions = 5 + (hashValue % 51);   // 5-55行
      
      totalInsertions += insertions;
      totalDeletions += deletions;
    }
    
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

/**
 * 从提交哈希生成一个确定性的数值（用于模拟数据）
 * @param hash 提交哈希
 * @returns 0-999的数值
 */
function getDeterministicValueFromHash(hash: string): number {
  let hashValue = 0;
  for (let i = 0; i < Math.min(hash.length, 8); i++) {
    hashValue = (hashValue * 31 + hash.charCodeAt(i)) % 1000;
  }
  return Math.abs(hashValue);
}