/**
 * Git仓库读取器
 * 使用 simple-git 读取 Git 日志并解析为结构化数据
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { RawCommitLog, CommitData } from '../types/commit.js';

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
        maxCount
      });

      // 解析原始日志数据为结构化数据
      const commits: CommitData[] = [];
      for (const item of logResult.all) {
        const rawCommit = item as unknown as RawCommitLog;
        commits.push(this.parseCommit(rawCommit));
      }

      return commits;
    } catch (error) {
      console.error('读取Git日志时发生错误:', error);
      throw new Error(`无法读取仓库 ${this.git.cwd()} 的提交历史: ${error}`);
    }
  }

  /**
   * 解析单个提交数据
   * @param rawCommit 原始提交数据
   * @returns 结构化的提交数据
   */
  private parseCommit(rawCommit: RawCommitLog): CommitData {
    return {
      hash: rawCommit.hash,
      author: {
        name: rawCommit.authorName,
        email: rawCommit.authorEmail
      },
      timestamp: new Date(rawCommit.date),
      message: rawCommit.message
    };
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