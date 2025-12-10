<template>
  <div class="team-analysis">
    <div class="table-container">
      <table class="metrics-table">
        <thead>
          <tr>
            <th>作者</th>
            <th>提交数</th>
            <th>新增行</th>
            <th>删除行</th>
            <th>净变化</th>
            <th>首次提交</th>
            <th>最后提交</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="author in data.authorMetrics" :key="author.author.email">
            <td>
              <div class="author-info">
                <span class="author-name">{{ author.author.name }}</span>
                <span class="author-email">{{ author.author.email }}</span>
              </div>
            </td>
            <td>{{ author.commitCount }}</td>
            <td class="positive">{{ author.totalInsertions }}</td>
            <td class="negative">{{ author.totalDeletions }}</td>
            <td :class="author.netChanges >= 0 ? 'positive' : 'negative'">
              {{ author.netChanges >= 0 ? '+' + author.netChanges : author.netChanges }}
            </td>
            <td>{{ formatDate(author.firstCommitDate) }}</td>
            <td>{{ formatDate(author.lastCommitDate) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 作者贡献图表 和上面表格重复了吧-->
    <!-- <div class="charts">
      <div class="chart-item">
        <h3>提交数分布</h3>
        <v-chart class="chart" :option="commitCountChartOption" autoresize />
      </div>
      
      <div class="chart-item">
        <h3>代码变更统计</h3>
        <v-chart class="chart" :option="codeChangeChartOption" autoresize />
      </div>
    </div> -->
  </div>
</template>

<script>
import { computed } from 'vue'
import VChart from 'vue-echarts'

export default {
  name: 'TeamAnalysis',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  components: {
    VChart
  },
  setup(props) {
    // 计算作者名称列表
    const authorNames = computed(() => {
      return props.data.authorMetrics.map(author => 
        `${author.author.name} (${author.author.email})`
      )
    })
    
    // 计算提交数
    const commitCounts = computed(() => {
      return props.data.authorMetrics.map(author => author.commitCount)
    })
    
    // 计算新增和删除行数
    const insertions = computed(() => {
      return props.data.authorMetrics.map(author => author.totalInsertions)
    })
    
    const deletions = computed(() => {
      return props.data.authorMetrics.map(author => author.totalDeletions)
    })
    
    // 提交数分布图表配置
    const commitCountChartOption = computed(() => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {},
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: authorNames.value
      },
      series: [
        {
          name: '提交数',
          type: 'bar',
          data: commitCounts.value,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }))
    
    // 代码变更统计图表配置
    const codeChangeChartOption = computed(() => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['新增', '删除']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: authorNames.value
      },
      series: [
        {
          name: '新增',
          type: 'bar',
          stack: 'total',
          label: {
            show: true
          },
          emphasis: {
            focus: 'series'
          },
          data: insertions.value,
          itemStyle: {
            color: '#5470c6'
          }
        },
        {
          name: '删除',
          type: 'bar',
          stack: 'total',
          label: {
            show: true
          },
          emphasis: {
            focus: 'series'
          },
          data: deletions.value,
          itemStyle: {
            color: '#ee6666'
          }
        }
      ]
    }))
    
    // 日期格式化函数
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN')
    }
    
    return {
      commitCountChartOption,
      codeChangeChartOption,
      formatDate
    }
  }
}
</script>

<style scoped>
.team-analysis {
  width: 100%;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.metrics-table th,
.metrics-table td {
  padding: 0.8rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.metrics-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
}

.author-email {
  font-size: 0.85rem;
  color: #7f8c8c;
}

.positive {
  color: #27ae60;
  font-weight: 600;
}

.negative {
  color: #e74c3c;
  font-weight: 600;
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

.chart-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-item h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
  text-align: center;
}

.chart {
  height: 400px;
  width: 100%;
}
</style>