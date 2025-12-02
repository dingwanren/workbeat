/**
 * 数据加载工具
 * 从 API 接口或本地文件加载分析数据
 */

export async function loadData() {
  try {
    // 在开发模式下，从 public 目录加载分析数据
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch('/analysis-data.json');
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('本地 analysis-data.json 文件未找到，请确保文件放置在 public 目录下');
        }
        throw new Error(`加载本地分析数据失败: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // 验证数据结构
      if (!data || !data.authorMetrics || !data.commits) {
        throw new Error('本地分析结果数据格式不正确，缺少必要的字段');
      }

      console.log('成功加载本地分析数据');
      return data;
    } else {
      // 在生产模式下，从 API 接口获取分析结果
      const response = await fetch('/api/analysis-data');

      if (!response.ok) {
        throw new Error(`加载数据失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 验证数据结构
      if (!data || !data.authorMetrics || !data.commits) {
        throw new Error('分析结果数据格式不正确，缺少必要的字段');
      }

      return data;
    }
  } catch (error) {
    console.error('加载分析数据时发生错误:', error);

    // 如果是开发模式且无法加载本地文件，提供更清晰的错误提示
    if (process.env.NODE_ENV === 'development') {
      console.error('请确保 analysis-result.json 文件已放置在 web-ui/public 目录下');
    }

    throw error;
  }
}