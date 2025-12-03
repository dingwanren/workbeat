/**
 * 数据加载工具
 * 从 API 接口或本地文件加载分析数据
 */

export async function loadData() {
  try {
    // 在构建时，import.meta.env.DEV 已经被替换为 true/false
    // 为了支持在生产环境中正确加载，我们采用试探性请求的方式
    // 首先尝试从 API 获取数据 (适用于生产环境)
    try {
      const response = await fetch('/api/analysis-data');

      if (response.ok) {
        const data = await response.json();

        // 验证数据结构
        if (!data || !data.authorMetrics || !data.commits) {
          throw new Error('分析结果数据格式不正确，缺少必要的字段');
        }

        return data;
      }
    } catch (apiError) {
      console.warn('从 API 加载数据失败，尝试加载本地文件:', apiError);
    }

    // 如果 API 请求失败或不可用，则尝试加载本地文件 (适用于开发环境)
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
  } catch (error) {
    console.error('加载分析数据时发生错误:', error);
    console.error('请确保 analysis-result.json 文件已放置在 web-ui/public 目录下（开发环境）或后端 API 可用（生产环境）');

    throw error;
  }
}