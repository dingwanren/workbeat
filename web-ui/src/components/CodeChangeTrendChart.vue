<template>
  <div class="code-change-trend-chart bg-white p-6 rounded-lg shadow-md card">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-gray-800 flex items-center">
        <i class="fas fa-code mr-2 text-primary"></i>
        代码变更趋势图
      </h3>
      <div class="granularity-controls">
        <button
          v-for="opt in granularityOptions"
          :key="opt.value"
          :class="[
            'granularity-btn',
            activeGranularity === opt.value ? 'active' : ''
          ]"
          @click="changeGranularity(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center h-96">
      <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
    </div>
    <div v-else-if="!hasData" class="flex justify-center items-center h-96 text-gray-500">
      <p>暂无代码变更数据</p>
    </div>
    <VChart
      v-else
      class="chart"
      :option="chartOption"
      autoresize
    />

    <div class="chart-summary mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" v-if="!loading && hasData">
      <div class="summary-card">
        <div class="summary-label">新增代码行</div>
        <div class="summary-value positive">{{ summary.totalInsertions.toLocaleString() }} 行</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">删除代码行</div>
        <div class="summary-value negative">{{ summary.totalDeletions.toLocaleString() }} 行</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">净增代码行</div>
        <div class="summary-value" :class="summary.netChanges >= 0 ? 'positive' : 'negative'">
          {{ summary.netChanges >= 0 ? '+' : '' }}{{ summary.netChanges.toLocaleString() }} 行
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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

// 计算当前显示的数据范围
const currentVisibleRange = ref({ start: 0, end: 100 })

// 判断当前粒度下是否应该显示x轴标签
const shouldShowXAxisLabels = computed(() => {
  if (!hasData.value) return true

  const processedData = processCodeChangeData(activeGranularity.value)
  const totalPoints = processedData.dates.length

  // 计算当前可见的数据点数量
  const visibleRatio = (currentVisibleRange.value.end - currentVisibleRange.value.start) / 100
  const visiblePoints = Math.ceil(totalPoints * visibleRatio)

  // 根据不同的粒度设置阈值
  let threshold = 15 // 默认阈值为15个单位
  if (activeGranularity.value === 'week') {
    threshold = 8 // 周粒度下最多显示8个标签
  } else if (activeGranularity.value === 'month') {
    threshold = 6 // 月粒度下最多显示6个标签
  }

  return visiblePoints <= threshold
})

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
      show: false // Hide title since we have it in the header
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params) => {
        let html = `<div class="p-2"><div><strong>${params[0].axisValue}</strong></div>`
        params.forEach(param => {
          const color = param.color
          const value = param.value
          const sign = value >= 0 ? '+' : ''

          switch(param.seriesName) {
            case '新增代码行':
              html += `<div class="flex items-center mt-1">
                <span class="inline-block w-3 h-3 rounded-sm mr-2" style="background: ${color};"></span>
                ${param.seriesName}: <b class="ml-1" style="color: ${color}">${sign}${value.toLocaleString()}</b>
              </div>`
              break
            case '删除代码行':
              html += `<div class="flex items-center mt-1">
                <span class="inline-block w-3 h-3 rounded-sm mr-2" style="background: ${color};"></span>
                ${param.seriesName}: <b class="ml-1" style="color: ${color}">${sign}${Math.abs(value).toLocaleString()}</b>
              </div>`
              break
            case '净变更':
              const netColor = value >= 0 ? '#10B981' : '#EF4444'
              html += `<div class="flex items-center mt-2 pt-2 border-t border-gray-600">
                <span class="inline-block w-3 h-3 rounded-sm mr-2" style="background: ${netColor};"></span>
                ${param.seriesName}: <b class="ml-1" style="color: ${netColor}">${sign}${value.toLocaleString()}</b>
              </div>`
              break
          }
        })
        html += '</div>'
        return html
      }
    },
    legend: {
      data: ['新增代码行', '删除代码行', '净变更'],
      top: '5%',
      textStyle: {
        color: '#6B7280'
      }
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
        show: shouldShowXAxisLabels.value,
        rotate: processedData.dates.length > 10 ? 45 : 0,
        interval: 0,
        color: '#6B7280'
      },
      name: granularityText,
      nameLocation: 'middle',
      nameGap: 30,
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '代码行数',
      axisLabel: {
        formatter: function(value) {
          return value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString()
        },
        color: '#6B7280'
      },
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
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
          color: '#10B981'
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
          color: '#EF4444'
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
        symbolSize: 6,
        lineStyle: {
          width: 3,
          type: 'solid',
          color: '#3b82f6'
        },
        itemStyle: {
          color: '#3b82f6',
          borderColor: '#FFF',
          borderWidth: 2
        },
        data: processedData.netChanges,
        markPoint: {
          data: [
            { type: 'max', name: '最大净增' },
            { type: 'min', name: '最大净减' }
          ],
          symbolSize: 40
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
        start: currentVisibleRange.value.start,
        end: currentVisibleRange.value.end,
        throttle: 100 // 设置节流，避免频繁触发
      }
    ]
  }
})

// 切换时间粒度
const changeGranularity = (granularity) => {
  activeGranularity.value = granularity
  // 重置缩放范围
  currentVisibleRange.value = { start: 0, end: 100 }
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
}

.chart {
  width: 100%;
  height: 400px;
  min-height: 400px;
}

.granularity-controls {
  display: flex;
  gap: 0.5rem;
}

.granularity-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.granularity-btn.active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.granularity-btn:not(.active) {
  background-color: #f3f4f6;
  color: #374151;
}

.granularity-btn:not(.active):hover {
  background-color: #e5e7eb;
}

.summary-card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.summary-value.positive {
  color: #059669;
}

.summary-value.negative {
  color: #dc2626;
}
</style>