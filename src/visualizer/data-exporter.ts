/**
 * 数据导出器
 * 将Git分析结果导出为JSON文件，供Vue应用使用
 */

import fs from 'fs/promises';
import path from 'path';
import { AuthorMetrics } from '../types/metrics.js';
import { CommitData } from '../types/commit.js';
import { generateChartData } from './chart-data.js';

export interface AnalysisResult {
  repositoryPath: string;
  analysisDate: Date;
  authorMetrics: AuthorMetrics[];
  commits: CommitData[];
  chartData: any;
  summary: {
    totalCommits: number;
    totalAuthors: number;
    totalInsertions: number;
    totalDeletions: number;
    timeRange: {
      start: Date;
      end: Date;
    };
  };
}

export class DataExporter {
  private repoPath: string;
  private metrics: AuthorMetrics[];
  private commits: CommitData[];

  constructor(repoPath: string, metrics: AuthorMetrics[], commits: CommitData[]) {
    this.repoPath = repoPath;
    this.metrics = metrics;
    this.commits = commits;
  }

  /**
   * 导出分析结果为JSON文件
   * @param outputPath 输出文件路径，默认为 analysis-result.json
   */
  async exportToFile(outputPath: string = 'analysis-result.json'): Promise<void> {
    try {
      // 计算汇总数据
      const totalInsertions = this.metrics.reduce((sum, metric) => sum + metric.totalInsertions, 0);
      const totalDeletions = this.metrics.reduce((sum, metric) => sum + metric.totalDeletions, 0);
      
      // 计算时间范围
      const allDates = this.commits.map(commit => new Date(commit.timestamp));
      const startTime = allDates.length > 0 ? new Date(Math.min(...allDates.map(date => date.getTime()))) : new Date();
      const endTime = allDates.length > 0 ? new Date(Math.max(...allDates.map(date => date.getTime()))) : new Date();

      // 生成图表数据
      const chartData = generateChartData(this.metrics, this.commits);

      // 构建分析结果对象
      const analysisResult: AnalysisResult = {
        repositoryPath: this.repoPath,
        analysisDate: new Date(),
        authorMetrics: this.metrics,
        commits: this.commits,
        chartData,
        summary: {
          totalCommits: this.commits.length,
          totalAuthors: this.metrics.length,
          totalInsertions,
          totalDeletions,
          timeRange: {
            start: startTime,
            end: endTime
          }
        }
      };

      // 将日期转换为字符串以便JSON序列化
      const serializableResult = this.makeSerializable(analysisResult);

      // 写入JSON文件
      await fs.writeFile(outputPath, JSON.stringify(serializableResult, null, 2));
      
      console.log(`分析结果已导出到: ${path.resolve(outputPath)}`);
    } catch (error) {
      console.error('导出数据时发生错误:', error);
      throw error;
    }
  }

  /**
   * 将对象中的日期转换为字符串以便JSON序列化
   */
  private makeSerializable(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.makeSerializable(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.makeSerializable(value);
      }
      return result;
    }

    return obj;
  }
}