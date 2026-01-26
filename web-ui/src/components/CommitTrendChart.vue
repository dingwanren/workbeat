<template>
  <div class="commit-trend-chart bg-white p-6 rounded-lg shadow-md card">
    <div class="chart-header mb-4">
      <div class="chart-title-container">
        <h3 class="chart-title">
          <i class="fas fa-chart-line"></i>
          提交趋势图
        </h3>
      </div>
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
      <p>暂无提交数据</p>
    </div>
    <VChart
      v-else
      class="chart"
      :option="chartOption"
      :loading="chartLoading"
      autoresize
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
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
const chartLoading = ref(false)

// 当前可视范围
const currentVisibleRange = ref({ start: 0, end: 100 })

// 粒度选项
const granularityOptions = [
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' }
]

// 计算属性：检查是否有数据
const hasData = computed(() => {
  return props.data?.commits?.length > 0
})

// 辅助函数：计算一年中的第几周
const getWeekNumber = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

// 核心函数：根据粒度处理提交数据
const processCommitData = (granularity) => {
  if (!hasData.value) return { dates: [], counts: [] }

  const commits = props.data.commits
  const groupedData = {}

  commits.forEach(commit => {
    const date = new Date(commit.timestamp)
    let key

    switch (granularity) {
      case 'month':
        // 格式：YYYY-MM
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'week':
        // 格式：YYYY-WW (WW是周数)
        const weekNumber = getWeekNumber(date)
        key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
        break
      case 'day':
      default:
        // 格式：YYYY-MM-DD
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        break
    }

    if (!groupedData[key]) {
      groupedData[key] = 0
    }
    groupedData[key]++
  })

  // 确保时间顺序正确
  const sortedKeys = Object.keys(groupedData).sort()
  const dates = []
  const counts = []

  sortedKeys.forEach(key => {
    dates.push(key)
    counts.push(groupedData[key])
  })

  return { dates, counts }
}

// 判断当前是否应该显示x轴标签
const shouldShowXAxisLabels = computed(() => {
  if (!hasData.value) return true

  const processedData = processCommitData(activeGranularity.value)
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

  const processedData = processCommitData(activeGranularity.value)

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
      confine: true, // 限制tooltip在图表区域内
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params) => {
        if (!params || params.length === 0) return ''
        const data = params[0]
        if (!data) return ''
        return `${data.name}<br/>提交数量: <b>${data.value}</b> 次`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%', // 增加底部空间以容纳DataZoom
      top: '10%',
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
      name: '提交次数',
      minInterval: 1,
      axisLabel: {
        formatter: '{value} 次',
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
        name: '提交次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#3b82f6'
        },
        itemStyle: {
          color: '#3b82f6',
          borderColor: '#FFF',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        },
        data: processedData.counts,
        markPoint: {
          data: [
            { type: 'max', name: '峰值' },
            { type: 'min', name: '低谷' }
          ],
          symbolSize: 40,
          label: {
            formatter: '{b}',
            fontSize: 10
          }
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside', // 滚轮缩放
        throttle: 100,
        zoomOnMouseWheel: true, // 直接使用鼠标滚轮进行缩放
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: false
      },
      {
        type: 'slider', // 底部滑块
        show: true,
        realtime: true,
        start: currentVisibleRange.value.start,
        end: currentVisibleRange.value.end,
        bottom: '3%', // 位置在底部
        height: 20, // 滑块高度
        borderColor: '#E5E7EB',
        backgroundColor: 'rgba(229, 231, 235, 0.3)',
        fillerColor: 'rgba(59, 130, 246, 0.6)',
        handleIcon: 'M8.2,13.6V3.9H6.3v9.7H3.1v14.9h3.3v9.7h1.8v-9.7h3.3V13.6H8.2z M9.7,24.4H4.8v-1.4h4.9V24.4z M9.7,19.1H4.8v-1.4h4.9V19.1z M9.7,32.2H4.8v-1.4h4.9V32.2z M9.7,26.8H4.8v-1.4h4.9V26.8z M9.7,29.4H4.8v-1.4h4.9V29.4z M9.7,21.7H4.8v-1.4h4.9V21.7z M9.7,34.8H4.8v-1.4h4.9V34.8z M9.7,16.5H4.8v-1.4h4.9V16.5z',
        handleSize: '100%',
        handleStyle: {
          color: '#3b82f6',
          shadowBlur: 2,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 1,
          shadowOffsetY: 1
        }
      }
    ],
    animation: false, // 关闭动画以避免缩放时的重置问题
    animationDuration: 0
  }
})

// 切换时间粒度
const changeGranularity = (granularity) => {
  activeGranularity.value = granularity
  // 重置缩放范围
  currentVisibleRange.value = { start: 0, end: 100 }
  chartLoading.value = true
  // 短暂延迟后取消加载状态，让图表平滑更新
  setTimeout(() => {
    chartLoading.value = false
  }, 300)
}

// 监听数据变化
watch(() => props.data, () => {
  loading.value = false
  chartLoading.value = false
}, { immediate: true, deep: true })
</script>

<style scoped>
.commit-trend-chart {
  width: 100%;
  height: 100%;
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-title-container {
  display: flex;
  align-items: center;
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
}

.chart-title i {
  margin-right: 0.5rem;
  color: #3b82f6;
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

.chart {
  width: 100%;
  height: 400px;
}

.loading, .no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: #6b7280;
  font-size: 1rem;
}
</style>