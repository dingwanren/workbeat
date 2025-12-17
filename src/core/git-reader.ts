/**
 * Git仓库读取器
 * 支持全分支日志获取和详细变更统计
 */

import simpleGit, { SimpleGit, GitError } from 'simple-git';
import { CommitData, FileChange, GitReaderOptions } from '../types/commit.js';

// 常量定义，避免魔法字符串
const GIT_PAGER_ENV = { GIT_PAGER: '' };
const COMMIT_DELIMITER = '|';
const FILE_CHANGE_REGEX = /^(\d+|-)\t(\d+|-)\t(.+)$/;

/**
 * Git仓库读取器类
 */
export class GitReader {
  private git: SimpleGit;
  private options: GitReaderOptions;

  constructor(repoPath: string, options: GitReaderOptions = {}) {
    this.git = simpleGit(repoPath);
    this.options = {
      includeAllBranches: false,
      parseFileDetails: false,
      ...options
    };
  }

  /**
   * 获取仓库的提交日志（支持全部分支）
   * @param maxCount 限制返回的提交数量，0表示无限制
   * @returns 解析后的提交数据数组
   */
  async getCommitLog(maxCount: number = 0): Promise<CommitData[]> {
    try {
      // 1. 构建优化参数
      const logArgs = this.buildLogArguments(maxCount);
      
      // 2. 使用raw命令并禁用分页器（通过环境变量）
      const rawLog = await this.git.env(GIT_PAGER_ENV).raw(logArgs);
      
      // 3. 流式解析原始日志
      const commits = await this.parseRawLog(rawLog);
      
      return commits;
    } catch (error) {
      if (error instanceof GitError) {
        throw new Error(`Git操作失败: ${error.message}`);
      }
      throw new Error(`读取仓库提交历史失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建git log命令参数（优化版）
   */
  private buildLogArguments(maxCount: number): string[] {
    // 预先计算参数数量，避免动态扩容
    const estimatedArgCount = 6;
    const args: string[] = new Array(estimatedArgCount);
    let index = 0;
    
    args[index++] = 'log';

    if (this.options.includeAllBranches) {
      args[index++] = '--all';
    }

    // 使用 --no-merges 参数排除合并提交
    args[index++] = '--no-merges';

    if (this.options.parseFileDetails) {
      args[index++] = '--numstat';
    }

    // 优化格式字符串，减少解析复杂度
    args[index++] = `--pretty=format:%H${COMMIT_DELIMITER}%aN${COMMIT_DELIMITER}%aE${COMMIT_DELIMITER}%aI${COMMIT_DELIMITER}%s${COMMIT_DELIMITER}%P`;
    args[index++] = '--date=iso';

    if (maxCount > 0) {
      args[index++] = `-n ${maxCount}`;
    }

    args[index++] = '--reverse';
    
    // 修剪未使用的数组位置
    return args.slice(0, index);
  }

  /**
   * 解析原始日志输出（优化版）
   */
  private async parseRawLog(rawLog: string): Promise<CommitData[]> {
    if (!rawLog.trim()) {
      return [];
    }
    
    const commits: CommitData[] = [];
    const lines = rawLog.split('\n');
    const lineCount = lines.length;

    let currentCommit: CommitData | null = null;
    let currentFileChanges: FileChange[] = [];

    for (let i = 0; i < lineCount; i++) {
      const line = lines[i].trim(); // Clean up whitespace
      if (!line) continue; // Skip empty lines

      // 1. 检查是否为提交信息行（使用索引判断性能更优）
      const delimiterIndex = line.indexOf(COMMIT_DELIMITER);
      if (delimiterIndex !== -1 && delimiterIndex < 50) { // Hash通常40字符
        // 保存上一个提交
        if (currentCommit) {
          this.finalizeCommit(currentCommit, currentFileChanges);
          commits.push(currentCommit);
        }

        // 解析新提交，添加错误处理
        try {
          currentCommit = this.parseCommitInfoLine(line);
          // Validate that we got a proper commit object
          if (!currentCommit || !currentCommit.hash) {
            console.warn(`Invalid commit parsed from line: ${line.substring(0, 100)}...`);
            currentCommit = null;
            continue;
          }
        } catch (error) {
          console.warn(`Failed to parse commit from line: ${line.substring(0, 100)}..., error: ${error}`);
          currentCommit = null;
          continue;
        }

        currentFileChanges = [];

      }
      // 2. 检查是否为文件变更统计行
      else if (FILE_CHANGE_REGEX.test(line)) {
        if (currentCommit) { // Only process file changes if we have a current commit
          const fileChange = this.parseFileChangeLine(line);
          if (fileChange) {
            currentFileChanges.push(fileChange);
          }
        }
      }
    }
    
    // 添加最后一个提交
    if (currentCommit) {
      this.finalizeCommit(currentCommit, currentFileChanges);
      commits.push(currentCommit);
    }

    // Filter out any undefined entries that might have slipped through
    return commits.filter(commit => commit !== undefined && commit !== null);
  }

  /**
   * 解析提交信息行（优化版）
   */
  private parseCommitInfoLine(line: string): CommitData {
    // 使用split但限制分割次数，提高性能
    const parts = line.split(COMMIT_DELIMITER, 6);

    // 确保我们至少有足够的部分来构建基本的提交信息
    if (parts.length < 4) {
      throw new Error(`Invalid commit line format: ${line.substring(0, 100)}...`);
    }

    return {
      hash: parts[0]?.trim() || '',
      author: {
        name: parts[1]?.trim() || '',
        email: parts[2]?.trim() || ''
      },
      timestamp: new Date(parts[3]?.trim() || Date.now()),
      message: parts[4]?.trim() || '',
      parentHashes: parts[5]?.trim() ? parts[5].trim().split(' ') : [],
      fileChanges: [],
      totalInsertions: 0,
      totalDeletions: 0,
      filesChanged: 0
    };
  }

  /**
   * 解析文件变更行（优化版）
   */
  private parseFileChangeLine(line: string): FileChange | null {
    const match = line.match(FILE_CHANGE_REGEX);
    if (!match) {
      return null;
    }
    
    const [, insertionsStr, deletionsStr, filename] = match;
    
    // 优化二进制文件处理
    const insertions = insertionsStr === '-' ? 0 : parseInt(insertionsStr, 10) || 0;
    const deletions = deletionsStr === '-' ? 0 : parseInt(deletionsStr, 10) || 0;
    
    return {
      filename: filename.trim(),
      insertions,
      deletions,
      language: this.detectFileLanguage(filename)
    };
  }

  /**
   * 检测文件语言（优化版）
   */
  private detectFileLanguage(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return 'unknown';
    }
    
    const extension = filename.slice(lastDotIndex + 1).toLowerCase();
    
    // 使用Map替代对象，查找性能更好
    const languageMap = new Map([
      ['js', 'JavaScript'],
      ['ts', 'TypeScript'],
      ['jsx', 'JSX'],
      ['tsx', 'TSX'],
      ['vue', 'Vue'],
      ['css', 'CSS'],
      ['scss', 'SCSS'],
      ['html', 'HTML'],
      ['json', 'JSON'],
      ['md', 'Markdown'],
      ['py', 'Python'],
      ['java', 'Java'],
      ['cpp', 'C++'],
      ['go', 'Go'],
      ['rs', 'Rust']
    ]);
    
    return languageMap.get(extension) || extension;
  }

  /**
   * 完成提交的统计计算
   */
  private finalizeCommit(commit: CommitData, fileChanges: FileChange[]): void {
    commit.fileChanges = fileChanges;
    
    // 批量计算统计信息，减少循环次数
    let totalInsertions = 0;
    let totalDeletions = 0;
    
    for (let i = 0; i < fileChanges.length; i++) {
      const change = fileChanges[i];
      totalInsertions += change.insertions;
      totalDeletions += change.deletions;
    }
    
    commit.totalInsertions = totalInsertions;
    commit.totalDeletions = totalDeletions;
    commit.filesChanged = fileChanges.length;
  }

  /**
   * 获取特定提交的详细信息
   */
  async getCommitDetails(hash: string): Promise<CommitData | null> {
    try {
      // 复用相同的参数构建逻辑
      const logArgs = [
        'show',
        hash,
        '--numstat',
        `--pretty=format:%H${COMMIT_DELIMITER}%aN${COMMIT_DELIMITER}%aE${COMMIT_DELIMITER}%aI${COMMIT_DELIMITER}%s${COMMIT_DELIMITER}%P`
      ];
      
      const rawOutput = await this.git.env(GIT_PAGER_ENV).raw(logArgs);
      const commits = await this.parseRawLog(rawOutput);
      
      return commits[0] || null;
    } catch (error) {
      console.error(`获取提交 ${hash} 详情时发生错误:`, error);
      return null;
    }
  }

  /**
   * 检查是否为有效的Git仓库
   */
  async isValidGitRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch (error) {
      console.error('检查Git仓库时发生错误:', error);
      return false;
    }
  }
}