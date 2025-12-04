/**
 * Git仓库读取器
 * 支持全分支日志获取和详细变更统计
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { CommitData, FileChange, GitReaderOptions } from '../types/commit.js';

/**
 * Git仓库读取器类
 */
export class GitReader {
  private git: SimpleGit;
  private options: GitReaderOptions;

  constructor(repoPath: string, options: GitReaderOptions = {}) {
    this.git = simpleGit(repoPath);
    this.options = {
      includeAllBranches: true,
      parseFileDetails: true,
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
      // 1. 构建日志参数
      const logArgs = this.buildLogArguments(maxCount);
      
      // 2. 使用 raw 命令执行自定义 git log
      const rawLog = await this.git.raw(logArgs);
      
      // 3. 解析原始日志
      const commits = await this.parseRawLog(rawLog);
      
      return commits;
    } catch (error) {
      console.error('读取Git日志时发生错误:', error);
      throw new Error(`无法读取仓库的提交历史: ${error}`);
    }
  }

  /**
   * 构建 git log 命令参数
   */
  private buildLogArguments(maxCount: number): string[] {
    const args: string[] = ['log'];
    
    // 关键：添加 --all 获取全部分支
    if (this.options.includeAllBranches) {
      args.push('--all');
    }
    
    // 添加 --numstat 获取详细变更统计
    if (this.options.parseFileDetails) {
      args.push('--numstat');
    }
    
    // 自定义输出格式，便于解析
    args.push('--pretty=format:%H|%aN|%aE|%aI|%s|%P');
    
    // 添加日期格式
    args.push('--date=iso');
    
    // 限制数量（如果有）
    if (maxCount > 0) {
      args.push(`-n ${maxCount}`);
    }
    
    // 添加排序（按时间倒序）
    args.push('--reverse');
    
    return args;
  }

  /**
   * 解析原始日志输出
   */
  private async parseRawLog(rawLog: string): Promise<CommitData[]> {
    const lines = rawLog.trim().split('\n');
    const commits: CommitData[] = [];
    
    let currentCommit: Partial<CommitData> | null = null;
    let currentFileChanges: FileChange[] = [];
    
    for (const line of lines) {
      // 1. 检查是否为提交信息行
      if (this.isCommitInfoLine(line)) {
        // 保存上一个提交
        if (currentCommit) {
          currentCommit.fileChanges = currentFileChanges;
          currentCommit.totalInsertions = this.calculateTotalInsertions(currentFileChanges);
          currentCommit.totalDeletions = this.calculateTotalDeletions(currentFileChanges);
          commits.push(currentCommit as CommitData);
        }
        
        // 解析新的提交信息
        const commitInfo = this.parseCommitInfoLine(line);
        currentCommit = {
          hash: commitInfo.hash,
          author: {
            name: commitInfo.authorName,
            email: commitInfo.authorEmail
          },
          timestamp: new Date(commitInfo.date),
          message: commitInfo.message,
          parentHashes: commitInfo.parentHashes,
          fileChanges: [],
          totalInsertions: 0,
          totalDeletions: 0,
          filesChanged: 0
        };
        currentFileChanges = [];
      }
      // 2. 检查是否为文件变更统计行
      else if (this.isFileChangeLine(line)) {
        const fileChange = this.parseFileChangeLine(line);
        if (fileChange) {
          currentFileChanges.push(fileChange);
        }
      }
    }
    
    // 添加最后一个提交
    if (currentCommit) {
      currentCommit.fileChanges = currentFileChanges;
      currentCommit.totalInsertions = this.calculateTotalInsertions(currentFileChanges);
      currentCommit.totalDeletions = this.calculateTotalDeletions(currentFileChanges);
      currentCommit.filesChanged = currentFileChanges.length;
      commits.push(currentCommit as CommitData);
    }
    
    return commits;
  }

  /**
   * 解析提交信息行
   * 格式: hash|authorName|authorEmail|date|message|parentHashes
   */
  private parseCommitInfoLine(line: string): {
    hash: string;
    authorName: string;
    authorEmail: string;
    date: string;
    message: string;
    parentHashes: string[];
  } {
    const parts = line.split('|');
    
    return {
      hash: parts[0] || '',
      authorName: parts[1] || '',
      authorEmail: parts[2] || '',
      date: parts[3] || '',
      message: parts[4] || '',
      parentHashes: parts[5] ? parts[5].split(' ') : []
    };
  }

  /**
   * 解析文件变更行
   * 格式: insertions\tdeletions\tfilename
   */
  private parseFileChangeLine(line: string): FileChange | null {
    const parts = line.split('\t');
    
    if (parts.length !== 3) {
      return null;
    }
    
    const [insertionsStr, deletionsStr, filename] = parts;
    
    // 处理二进制文件（显示为 '-'）
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
   * 检测文件语言（基于扩展名）
   */
  private detectFileLanguage(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'JSX',
      'tsx': 'TSX',
      'vue': 'Vue',
      'css': 'CSS',
      'scss': 'SCSS',
      'html': 'HTML',
      'json': 'JSON',
      'md': 'Markdown',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'go': 'Go',
      'rs': 'Rust'
    };
    
    return languageMap[extension] || extension;
  }

  /**
   * 检查是否为提交信息行
   */
  private isCommitInfoLine(line: string): boolean {
    return line.includes('|') && line.split('|').length >= 5;
  }

  /**
   * 检查是否为文件变更行
   */
  private isFileChangeLine(line: string): boolean {
    // 格式: number\tnumber\tfilename 或 -\t-\tfilename
    return /^(\d+|-\t)\t(\d+|-\t)\t.+$/.test(line);
  }

  /**
   * 计算总插入行数
   */
  private calculateTotalInsertions(fileChanges: FileChange[]): number {
    return fileChanges.reduce((sum, file) => sum + file.insertions, 0);
  }

  /**
   * 计算总删除行数
   */
  private calculateTotalDeletions(fileChanges: FileChange[]): number {
    return fileChanges.reduce((sum, file) => sum + file.deletions, 0);
  }

  /**
   * 获取特定提交的详细信息
   */
  async getCommitDetails(hash: string): Promise<CommitData | null> {
    try {
      const logArgs = [
        'show',
        hash,
        '--numstat',
        '--pretty=format:%H|%aN|%aE|%aI|%s|%P'
      ];
      
      const rawOutput = await this.git.raw(logArgs);
      const commits = await this.parseRawLog(rawOutput);
      
      return commits[0] || null;
    } catch (error) {
      console.error(`获取提交 ${hash} 详情时发生错误:`, error);
      return null;
    }
  }

  /**
   * 检查是否为有效的 Git 仓库
   */
  async isValidGitRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch (error) {
      console.error('检查Git仓库时发生错误:', error);
      return false;
    }
  }

  /**
   * 获取仓库信息
   */
  async getRepositoryInfo() {
    try {
      const [branches, tags, remote] = await Promise.all([
        this.git.branchLocal(),
        this.git.tags(),
        this.git.getRemotes(true)
      ]);
      
      return {
        branchCount: branches.all.length,
        tagCount: tags.all.length,
        currentBranch: branches.current,
        remotes: remote.map(r => r.name)
      };
    } catch (error) {
      console.error('获取仓库信息时发生错误:', error);
      return null;
    }
  }
}