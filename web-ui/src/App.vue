<template>
  <div id="app" class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">
            <i class="fas fa-code-branch"></i>
          </div>
          <h1 class="app-title">Git 仓库分析仪表板</h1>
        </div>
        <div class="date-display">
          <i class="fas fa-calendar-alt"></i>
          <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">正在加载分析数据...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <div class="error-content">
          <div class="error-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="error-message">
            <p>
              <span class="error-label">加载数据时出现错误:</span> {{ error }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="analysisData" class="dashboard">
        <!-- 汇总信息 -->
        <section class="summary-section">
          <h2 class="section-title">
            <i class="fas fa-chart-bar"></i>
            分析摘要
          </h2>
          <div class="summary-grid">
            <div class="stat-card">
              <div class="stat-value">{{ analysisData.summary.totalCommits }}</div>
              <div class="stat-label">总提交数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ analysisData.summary.totalAuthors }}</div>
              <div class="stat-label">贡献者数量</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ analysisData.summary.totalInsertions }}</div>
              <div class="stat-label">总新增行数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ analysisData.summary.totalDeletions }}</div>
              <div class="stat-label">总删除行数</div>
            </div>
          </div>
        </section>

        <!-- 团队成员分析 -->
        <section class="team-analysis-section">
          <h2 class="section-title">
            <i class="fas fa-users"></i>
            团队成员分析
          </h2>
          <TeamAnalysis :data="analysisData" />
        </section>

        <!-- 工作时段热力图 -->
        <section class="heatmap-section">
          <HeatmapChart :data="analysisData" />
        </section>

        <!-- 提交趋势图 -->
        <section class="commit-trend-section">
          <CommitTrendChart :data="analysisData" />
        </section>

        <!-- 代码产出趋势 -->
        <section class="code-trend-section">
          <CodeChangeTrendChart :data="analysisData" />
        </section>
      </div>

      <div v-else class="no-data-container">
        <div class="no-data-content">
          <div class="no-data-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="no-data-message">
            <p>
              <span class="no-data-label">未找到分析数据:</span> 请确保数据已正确注入到页面中。
            </p>
          </div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>Git 仓库分析仪表板 &copy; {{ new Date().getFullYear() }} - 开源项目</p>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { expandFieldNames, isCompactFormat } from './utils/expandFieldNames.js'
import TeamAnalysis from './components/TeamAnalysis.vue'
// import WorkTimeChart from './components/WorkTimeChart.vue'
// import CodeTrendChart from './components/CodeTrendChart.vue'
// import CommitScatterPlot from './components/CommitScatterPlot.vue'
import HeatmapChart from './components/HeatmapChart.vue'
import CommitTrendChart from './components/CommitTrendChart.vue'
import CodeChangeTrendChart from './components/CodeChangeTrendChart.vue'

export default {
  name: 'App',
  components: {
    TeamAnalysis,
    // WorkTimeChart,
    // CodeTrendChart,
    // CommitScatterPlot,
    HeatmapChart,
    CommitTrendChart,
    CodeChangeTrendChart
  },
  setup() {
    const analysisData = ref(null)
    const loading = ref(true)
    const error = ref(null)

    console.log('🔄 Vue 应用启动...');
    console.log('检查 window.__GIT_ANALYSIS_DATA__:', !!window.__GIT_ANALYSIS_DATA__);

    // 使用嵌入式数据 (now the only method)
    if (window.__GIT_ANALYSIS_DATA__) {
      console.log('📦 使用嵌入式数据');
      console.log('✅ 嵌入式数据可用');
      console.log('数据内容:', {
        commits: window.__GIT_ANALYSIS_DATA__?.commits?.length || window.__GIT_ANALYSIS_DATA__?.cs?.length || 0,
        authors: window.__GIT_ANALYSIS_DATA__?.authorMetrics?.length || window.__GIT_ANALYSIS_DATA__?.am?.length || 0,
        hasData: !!window.__GIT_ANALYSIS_DATA__
      });

      // 检查数据格式并进行转换
      if (isCompactFormat(window.__GIT_ANALYSIS_DATA__)) {
        console.log('🔄 检测到压缩数据格式，正在转换为原始格式...');
        analysisData.value = expandFieldNames(window.__GIT_ANALYSIS_DATA__);
        console.log('✅ 数据格式转换完成');
      } else {
        console.log('📦 使用原始数据格式');
        analysisData.value = window.__GIT_ANALYSIS_DATA__;
      }

      loading.value = false;
    } else {
      console.error('❌ 未找到嵌入式数据！请确保数据已正确注入到HTML中。');
      error.value = '未找到分析数据，请确保数据已正确注入到HTML中。';
      loading.value = false;
    }

    return {
      analysisData,
      loading,
      error
    }
  }
}
</script>

<style>
@import 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
  margin: 0;
  padding: 0;
}

.app-container {
  min-height: 100vh;
  background-color: #f8fafc;
}

.app-header {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-icon {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.25rem;
  color: #4b5563;
  font-weight: 500;
}

.error-container {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  max-width: 48rem;
  margin: 0 auto;
}

.error-content {
  display: flex;
  align-items: start;
}

.error-icon {
  flex-shrink: 0;
  color: #f87171;
  font-size: 1.25rem;
}

.error-message {
  margin-left: 1rem;
}

.error-label {
  font-weight: 600;
}

.error-message p {
  margin: 0;
  color: #dc2626;
  font-size: 0.875rem;
}

.no-data-container {
  background-color: #fffbf0;
  border-left: 4px solid #fbbf24;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  max-width: 48rem;
  margin: 0 auto;
}

.no-data-content {
  display: flex;
  align-items: start;
}

.no-data-icon {
  flex-shrink: 0;
  color: #fbbf24;
  font-size: 1.25rem;
}

.no-data-message {
  margin-left: 1rem;
}

.no-data-label {
  font-weight: 600;
}

.no-data-message p {
  margin: 0;
  color: #ca8a04;
  font-size: 0.875rem;
}

.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.summary-section {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.team-analysis-section,
.heatmap-section,
.commit-trend-section,
.code-trend-section {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.app-footer {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 3rem;
}

/* Card hover effect */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Fade-in animation */
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Define CSS variables for consistent color scheme */
:root {
  --primary: #3b82f6;
  --secondary: #60a5fa;
  --accent: #93c5fd;
  --dark: #1e293b;
  --light: #f8fafc;
}
</style>