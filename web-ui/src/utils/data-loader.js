/**
 * 数据加载工具
 * 从 analysis-result.json 文件加载分析数据
 */

export async function loadData() {
  try {
    // 尝试从根目录加载分析结果
    const response = await fetch('./analysis-result.json');
    
    if (!response.ok) {
      throw new Error(`加载数据失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 验证数据结构
    if (!data || !data.authorMetrics || !data.commits) {
      throw new Error('分析结果数据格式不正确，缺少必要的字段');
    }
    
    return data;
  } catch (error) {
    console.error('加载分析数据时发生错误:', error);
    
    // 如果加载失败，提供模拟数据用于开发
    if (process.env.NODE_ENV === 'development') {
      console.warn('使用模拟数据进行开发');
      return generateMockData();
    }
    
    throw error;
  }
}

// 生成模拟数据用于开发测试
function generateMockData() {
  return {
    repositoryPath: '/mock/repo/path',
    analysisDate: new Date().toISOString(),
    authorMetrics: [
      {
        author: { name: '张三', email: 'zhangsan@example.com' },
        commitCount: 42,
        totalInsertions: 1250,
        totalDeletions: 320,
        netChanges: 930,
        firstCommitDate: '2023-01-15T08:30:00.000Z',
        lastCommitDate: '2023-11-20T16:45:00.000Z'
      },
      {
        author: { name: '李四', email: 'lisi@example.com' },
        commitCount: 38,
        totalInsertions: 980,
        totalDeletions: 450,
        netChanges: 530,
        firstCommitDate: '2023-02-10T09:15:00.000Z',
        lastCommitDate: '2023-11-18T14:20:00.000Z'
      },
      {
        author: { name: '王五', email: 'wangwu@example.com' },
        commitCount: 25,
        totalInsertions: 760,
        totalDeletions: 180,
        netChanges: 580,
        firstCommitDate: '2023-03-05T10:00:00.000Z',
        lastCommitDate: '2023-11-15T11:30:00.000Z'
      }
    ],
    commits: [
      {
        hash: 'abc123def456',
        author: { name: '张三', email: 'zhangsan@example.com' },
        timestamp: '2023-11-20T16:45:00.000Z',
        message: 'feat: 添加用户登录功能',
        insertions: 150,
        deletions: 20,
        filesChanged: 5
      },
      {
        hash: 'def456ghi789',
        author: { name: '李四', email: 'lisi@example.com' },
        timestamp: '2023-11-19T14:30:00.000Z',
        message: 'fix: 修复登录页面样式问题',
        insertions: 30,
        deletions: 15,
        filesChanged: 2
      }
    ],
    chartData: {
      authorNames: ['张三 (zhangsan@example.com)', '李四 (lisi@example.com)', '王五 (wangwu@example.com)'],
      commitCounts: [42, 38, 25],
      totalInsertions: [1250, 980, 760],
      totalDeletions: [320, 450, 180],
      totalInsertionsSum: 2990,
      totalDeletionsSum: 950,
      dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08', '2023-09', '2023-10', '2023-11'],
      commitTrends: [5, 8, 12, 10, 15, 18, 20, 16, 14, 12, 10],
      codeChangeTrends: [245, 320, 410, 280, 510, 620, 580, 420, 390, 320, 280]
    },
    summary: {
      totalCommits: 105,
      totalAuthors: 3,
      totalInsertions: 2990,
      totalDeletions: 950,
      timeRange: {
        start: '2023-01-15T08:30:00.000Z',
        end: '2023-11-20T16:45:00.000Z'
      }
    }
  };
}