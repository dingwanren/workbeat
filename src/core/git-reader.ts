/**
 * Git仓库读取器
 * 使用 simple-git 读取 Git 日志并解析为结构化数据
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { RawCommitLog, CommitData, FileChange } from '../types/commit.js';

/**
 * Git仓库读取器类
 */
export class GitReader {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /**
   * 获取仓库的提交日志
   * @param maxCount 限制返回的提交数量，默认为 100
   * @returns 解析后的提交数据数组
   */
  async getCommitLog(maxCount: number = 100): Promise<CommitData[]> {
    try {
      // 使用 simple-git 获取格式化的日志
      const logResult = await this.git.log({
        format: {
          hash: '%H',
          authorName: '%aN',
          authorEmail: '%aE',
          date: '%aI',
          message: '%s'
        },
        maxCount,
        '--stat': 1000  // 添加文件统计信息
      });

      // 解析原始日志数据为结构化数据
      const commits: CommitData[] = [];
      for (const item of logResult.all) {
        const rawCommit = item as unknown as RawCommitLog;

        // 获取特定提交的详细统计信息
        const commitStats = await this.getCommitStats(rawCommit.hash);

        commits.push(this.parseCommit(rawCommit, commitStats.insertions, commitStats.deletions, commitStats.filesChanged, commitStats.fileDetails));
      }

      return commits;
    } catch (error) {
      console.error('读取Git日志时发生错误:', error);
      throw new Error(`无法读取仓库的提交历史: ${error}`);
    }
  }

  /**
   * 解析单个提交数据
   * @param rawCommit 原始提交数据
   * @param insertions 插入的行数
   * @param deletions 删除的行数
   * @param filesChanged 变更的文件数
   * @param fileDetails 文件变更详情
   * @returns 结构化的提交数据
   */
  private parseCommit(
    rawCommit: RawCommitLog,
    insertions: number = 0,
    deletions: number = 0,
    filesChanged: number = 0,
    fileDetails?: FileChange[]
  ): CommitData {
    return {
      hash: rawCommit.hash,
      author: {
        name: rawCommit.authorName,
        email: rawCommit.authorEmail
      },
      timestamp: new Date(rawCommit.date),
      message: rawCommit.message,
      insertions,
      deletions,
      filesChanged,
      fileDetails
    };
  }

  /**
   * 获取特定提交的统计信息（插入、删除行数等）
   * @param commitHash 提交哈希
   * @returns 提交的统计信息
   */
  private async getCommitStats(commitHash: string): Promise<{
    insertions: number;
    deletions: number;
    filesChanged: number;
    fileDetails?: FileChange[];
  }> {
    try {
      // 使用 git show 命令获取提交的统计信息
      const showResult = await this.git.show([commitHash, '--numstat', '--format=']).catch(() => '');

      // 解析 --numstat 输出格式
      // 格式: insertion\tdeletion\tfilename
      const lines = showResult.split('\n');
      let totalInsertions = 0;
      let totalDeletions = 0;
      let filesChangedCount = 0;
      const fileDetails: FileChange[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        // 解析 numstat 行，格式为: "insertions\tdeletions\tfilename"
        const match = line.match(/^(\d+)\t(\d+)\t(.+)$/);
        if (match) {
          const [, insertions, deletions, filename] = match;
          const ins = parseInt(insertions, 10) || 0;
          const del = parseInt(deletions, 10) || 0;

          // 处理二进制文件情况（显示为 '-'）
          const insertionCount = isNaN(ins) ? 0 : ins;
          const deletionCount = isNaN(del) ? 0 : del;

          totalInsertions += insertionCount;
          totalDeletions += deletionCount;
          filesChangedCount++;

          fileDetails.push({
            filename,
            insertions: insertionCount,
            deletions: deletionCount
          });
        }
        // 如果是二进制文件，insertions 和 deletions 会显示为 '-'
        else if (line.match(/^-\t-\t/)) {
          const [, , filename] = line.split('\t');
          filesChangedCount++;
          // 对于二进制文件，记为0行插入和删除
          fileDetails.push({
            filename: filename.trim(),
            insertions: 0,
            deletions: 0
          });
        }
      }

      return {
        insertions: totalInsertions,
        deletions: totalDeletions,
        filesChanged: filesChangedCount,
        fileDetails: fileDetails.length > 0 ? fileDetails : undefined
      };
    } catch (error) {
      console.error(`获取提交 ${commitHash} 统计信息时发生错误:`, error);
      // 如果出错，返回默认值
      return {
        insertions: 0,
        deletions: 0,
        filesChanged: 0
      };
    }
  }

  /**
   * 检查给定路径是否为有效的 Git 仓库
   * @returns 如果是 Git 仓库返回 true，否则返回 false
   */
  async isValidGitRepository(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo();
      return isRepo;
    } catch (error) {
      console.error('检查Git仓库时发生错误:', error);
      return false;
    }
  }
}