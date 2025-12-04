<template>
  <div class="code-change-trend-chart">
    <div class="chart-header">
      <h3>代码变更趋势图</h3>
      <div class="granularity-controls">
        <button 
          v-for="opt in granularityOptions" 
          :key="opt.value"
          :class="['granularity-btn', { 'active': activeGranularity === opt.value }]"
          @click="changeGranularity(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">加载图表数据...</div>
    <div v-else-if="!hasData" class="no-data">暂无代码变更数据</div>
    <VChart 
      v-else
      class="chart"
      :option="chartOption"
      autoresize
    />
    
    <div class="chart-summary" v-if="!loading && hasData">
      <div class="summary-item">
        <span class="summary-label">新增代码行:</span>
        <span class="summary-value positive">{{ summary.totalInsertions.toLocaleString() }} 行</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">删除代码行:</span>
        <span class="summary-value negative">{{ summary.totalDeletions.toLocaleString() }} 行</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">净增代码行:</span>
        <span class="summary-value" :class="summary.netChanges >= 0 ? 'positive' : 'negative'">
          {{ summary.netChanges.toLocaleString() }} 行
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent
])

// 接收完整的分析数据
const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({})
  }
})

// 响应式数据
const activeGranularity = ref('day')
const loading = ref(true)
const summary = ref({
  totalInsertions: 0,
  totalDeletions: 0,
  netChanges: 0
})

// 粒度选项
const granularityOptions = [
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' }
]

// 修正的 hasData 计算属性
const hasData = computed(() => {
  if (!props.data?.commits?.length) return false
  
  // 检查数据格式：可能有 totalInsertions/totalDeletions 或 fileChanges
  const commits = props.data.commits
  const hasAnyChanges = commits.some(commit => {
    // 方式1：直接有 totalInsertions/totalDeletions
    if (commit.totalInsertions > 0 || commit.totalDeletions > 0) return true
    
    // 方式2：通过 fileChanges 计算
    if (commit.fileChanges?.length) {
      const hasFileChanges = commit.fileChanges.some(file => 
        file.insertions > 0 || file.deletions > 0
      )
      if (hasFileChanges) return true
    }
    
    return false
  })
  
  return hasAnyChanges
})

// 辅助函数：计算一年中的第几周
const getWeekNumber = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

// 获取提交的变更行数（支持多种数据格式）
const getCommitChanges = (commit) => {
  // 方式1：直接使用 totalInsertions/totalDeletions
  if (commit.totalInsertions !== undefined && commit.totalDeletions !== undefined) {
    return {
      insertions: commit.totalInsertions || 0,
      deletions: commit.totalDeletions || 0
    }
  }
  
  // 方式2：通过 fileChanges 计算
  if (commit.fileChanges?.length) {
    let totalInsertions = 0
    let totalDeletions = 0
    
    commit.fileChanges.forEach(file => {
      totalInsertions += file.insertions || 0
      totalDeletions += file.deletions || 0
    })
    
    return { insertions: totalInsertions, deletions: totalDeletions }
  }
  
  // 方式3：尝试从 chartData 获取
  if (props.data.chartData?.totalInsertionsSum !== undefined) {
    // 如果只有一个作者，直接使用总量
    const commits = props.data.commits || []
    if (commits.length === 1) {
      const firstCommit = commits[0]
      return {
        insertions: firstCommit.totalInsertions || 0,
        deletions: firstCommit.totalDeletions || 0
      }
    }
  }
  
  return { insertions: 0, deletions: 0 }
}

// 核心函数：根据粒度处理代码变更数据
const processCodeChangeData = (granularity) => {
  if (!hasData.value) return { dates: [], insertions: [], deletions: [], netChanges: [] }
  
  const commits = props.data.commits
  const groupedData = {}
  
  // 初始化汇总数据
  let totalInsertions = 0
  let totalDeletions = 0
  
  commits.forEach(commit => {
    const changes = getCommitChanges(commit)
    const date = new Date(commit.timestamp)
    let key
    
    switch (granularity) {
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'week':
        const weekNumber = getWeekNumber(date)
        key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
        break
      case 'day':
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        break
    }
    
    if (!groupedData[key]) {
      groupedData[key] = { insertions: 0, deletions: 0 }
    }
    
    // 累加该时间粒度的增删行数
    groupedData[key].insertions += changes.insertions
    groupedData[key].deletions += changes.deletions
    
    // 更新总计数
    totalInsertions += changes.insertions
    totalDeletions += changes.deletions
  })
  
  // 更新汇总数据
  summary.value = {
    totalInsertions,
    totalDeletions,
    netChanges: totalInsertions - totalDeletions
  }
  
  // 按时间排序
  const sortedKeys = Object.keys(groupedData).sort()
  const dates = []
  const insertions = []
  const deletions = []
  const netChanges = []
  
  sortedKeys.forEach(key => {
    dates.push(key)
    insertions.push(groupedData[key].insertions)
    deletions.push(groupedData[key].deletions)
    netChanges.push(groupedData[key].insertions - groupedData[key].deletions)
  })
  
  return { dates, insertions, deletions, netChanges }
}

// 计算属性：生成图表配置
const chartOption = computed(() => {
  if (!hasData.value) return {}
  
  const processedData = processCodeChangeData(activeGranularity.value)
  
  if (processedData.dates.length === 0) return {}
  
  const granularityText = {
    day: '日期',
    week: '周次',
    month: '月份'
  }[activeGranularity.value]
  
  return {
    title: {
      text: '代码变更趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params) => {
        let html = `<div style="margin-bottom: 5px;"><strong>${params[0].axisValue}</strong></div>`
        params.forEach(param => {
          const color = param.color
          const value = param.value
          const sign = value >= 0 ? '+' : ''
          
          switch(param.seriesName) {
            case '新增代码行':
              html += `<div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; margin-right: 5px; border-radius: 2px;"></span>
                ${param.seriesName}: <b style="margin-left: 5px; color: ${color}">${sign}${value.toLocaleString()}</b>
              </div>`
              break
            case '删除代码行':
              html += `<div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; margin-right: 5px; border-radius: 2px;"></span>
                ${param.seriesName}: <b style="margin-left: 5px; color: ${color}">${sign}${Math.abs(value).toLocaleString()}</b>
              </div>`
              break
            case '净变更':
              const netColor = value >= 0 ? '#91cc75' : '#ee6666'
              html += `<div style="display: flex; align-items: center; margin-top: 5px; padding-top: 5px; border-top: 1px solid #eee;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${netColor}; margin-right: 5px; border-radius: 2px;"></span>
                ${param.seriesName}: <b style="margin-left: 5px; color: ${netColor}">${sign}${value.toLocaleString()}</b>
              </div>`
              break
          }
        })
        return html
      }
    },
    legend: {
      data: ['新增代码行', '删除代码行', '净变更'],
      top: '5%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: processedData.dates,
      axisLabel: {
        rotate: processedData.dates.length > 10 ? 45 : 0,
        interval: 0
      },
      name: granularityText,
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: '代码行数',
      axisLabel: {
        formatter: function(value) {
          return value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString()
        }
      }
    },
    series: [
      {
        name: '新增代码行',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: {
          color: '#91cc75'
        },
        data: processedData.insertions,
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: '删除代码行',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: {
          color: '#ee6666'
        },
        data: processedData.deletions.map(v => -v),
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: '净变更',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          type: 'solid',
          color: '#5470c6'
        },
        itemStyle: {
          color: '#5470c6'
        },
        data: processedData.netChanges,
        markPoint: {
          data: [
            { type: 'max', name: '最大净增' },
            { type: 'min', name: '最大净减' }
          ],
          symbolSize: 50
        },
        markLine: {
          data: [
            { type: 'average', name: '平均值' }
          ]
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      }
    ]
  }
})

// 切换时间粒度
const changeGranularity = (granularity) => {
  activeGranularity.value = granularity
}

// 监听数据变化
watch(() => props.data, () => {
  loading.value = false
}, { immediate: true, deep: true })
</script>

<style scoped>
.code-change-trend-chart {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.granularity-controls {
  display: flex;
  gap: 8px;
}

.granularity-btn {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.granularity-btn:hover {
  border-color: #5470c6;
  color: #5470c6;
}

.granularity-btn.active {
  background: #5470c6;
  color: #fff;
  border-color: #5470c6;
}

.chart {
  width: 100%;
  height: 400px;
  min-height: 400px;
}

.loading, .no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: #999;
  font-size: 16px;
}

.chart-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
}

.summary-value.positive {
  color: #91cc75;
}

.summary-value.negative {
  color: #ee6666;
}
</style>