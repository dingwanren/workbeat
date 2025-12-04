<template>
  <div id="app">
    <header class="header">
      <h1>Git 仓库分析仪表板</h1>
    </header>
    
    <main class="main-content">
      <div v-if="loading" class="loading">
        <p>正在加载分析数据...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>加载数据时出现错误: {{ error }}</p>
      </div>
      
      <div v-else-if="data" class="dashboard">
        <!-- 汇总信息 -->
        <section class="summary-section">
          <h2>分析摘要</h2>
          <div class="summary-cards">
            <div class="card">
              <h3>{{ data.summary.totalCommits }}</h3>
              <p>总提交数</p>
            </div>
            <div class="card">
              <h3>{{ data.summary.totalAuthors }}</h3>
              <p>贡献者数量</p>
            </div>
            <div class="card">
              <h3>{{ data.summary.totalInsertions }}</h3>
              <p>总新增行数</p>
            </div>
            <div class="card">
              <h3>{{ data.summary.totalDeletions }}</h3>
              <p>总删除行数</p>
            </div>
          </div>
        </section>
        
        <!-- 团队成员分析 -->
        <section class="team-analysis-section">
          <h2>团队成员分析</h2>
          <TeamAnalysis :data="data" />
        </section>
        
        <!-- 工作时段热力图 -->
        <section class="heatmap-section">
          <h2>工作时段热力图</h2>
          <HeatmapChart :data="data" />
        </section>

        <!-- 提交趋势图 -->
        <section class="commit-trend-section">
          <h2>提交趋势图</h2>
          <CommitTrendChart :data="data" />
        </section>
        
        <!-- 代码产出趋势 -->
        <section class="code-trend-section">
          <h2>代码产出趋势</h2>
          <CodeChangeTrendChart :data="data" />
        </section>
        
        <!-- 提交习惯分析 -->
        <!-- <section class="commit-scatter-section">
          <h2>提交习惯分析</h2>
          <CommitScatterPlot :data="data" />
        </section> -->
      </div>
      
      <div v-else class="no-data">
        <p>未找到分析数据，请确保 analysis-result.json 文件存在。</p>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import TeamAnalysis from './components/TeamAnalysis.vue'
import WorkTimeChart from './components/WorkTimeChart.vue'
import CodeTrendChart from './components/CodeTrendChart.vue'
import CommitScatterPlot from './components/CommitScatterPlot.vue'
import HeatmapChart from './components/HeatmapChart.vue'
import CommitTrendChart from './components/CommitTrendChart.vue'
import CodeChangeTrendChart from './components/CodeChangeTrendChart.vue'
import { loadData } from './utils/data-loader.js'

export default {
  name: 'App',
  components: {
    TeamAnalysis,
    WorkTimeChart,
    CodeTrendChart,
    CommitScatterPlot,
    HeatmapChart,
    CommitTrendChart,
    CodeChangeTrendChart
  },
  setup() {
    const data = ref(null)
    const loading = ref(true)
    const error = ref(null)
    
    onMounted(async () => {
      try {
        data.value = await loadData()
        console.log('数据', data.value)
      } catch (err) {
        error.value = err.message
        console.error('加载数据失败:', err)
      } finally {
        loading.value = false
      }
    })
    
    return {
      data,
      loading,
      error
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}

.error {
  color: #e74c3c;
}

.summary-section {
  margin-bottom: 2rem;
}

.summary-section h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}

.card h3 {
  font-size: 2rem;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.section {
  margin-bottom: 2rem;
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.section h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}
</style>