<template>
  <div class="commit-trend-chart">
    <div class="chart-header">
      <h3>提交趋势图</h3>
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
    <div v-else-if="!hasData" class="no-data">暂无提交数据</div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
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
      text: '提交趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0]
        return `${data.name}<br/>提交数量: <b>${data.value}</b> 次`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
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
      name: '提交次数',
      minInterval: 1,
      axisLabel: {
        formatter: '{value} 次'
      }
    },
    series: [
      {
        name: '提交次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#5470c6'
        },
        itemStyle: {
          color: '#5470c6'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(84, 112, 198, 0.5)' },
              { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
            ]
          }
        },
        data: processedData.counts,
        markPoint: {
          data: [
            { type: 'max', name: '峰值' },
            { type: 'min', name: '低谷' }
          ],
          symbolSize: 50,
          label: {
            formatter: '{b}'
          }
        }
      }
    ],
    animation: true,
    animationDuration: 500
  }
})

// 切换时间粒度
const changeGranularity = (granularity) => {
  activeGranularity.value = granularity
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
}

.loading, .no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: #999;
  font-size: 16px;
}
</style>