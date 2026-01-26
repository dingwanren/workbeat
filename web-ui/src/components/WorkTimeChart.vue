<template>
  <div class="work-time-chart bg-white p-6 rounded-lg shadow-md card">
    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
      <i class="fas fa-clock mr-2 text-primary"></i>
      24小时提交活跃度分布
    </h3>
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import VChart from 'vue-echarts'

export default {
  name: 'WorkTimeChart',
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
    // 计算各小时的提交频率
    const computeHourlyCommits = () => {
      const hourlyCount = new Array(24).fill(0)

      props.data.commits.forEach(commit => {
        const hour = new Date(commit.timestamp).getHours() // 多时区成员的怎么办
        hourlyCount[hour]++
      })

      return hourlyCount
    }

    const hourlyCommits = computed(() => computeHourlyCommits())

    // 准备图表数据
    const chartData = computed(() => {
      return hourlyCommits.value.map((count, hour) => [hour, count])
    })

    // 图表配置 - 使用雷达图和柱状图
    const chartOption = computed(() => ({
      title: {
        show: false // Hide title since we have it in the header
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        formatter: (params) => {
          const param = params[0]
          return `<div class="p-2">
                    <div>时间: ${param.name}点</div>
                    <div>提交数: ${param.value}</div>
                  </div>`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: Array.from({length: 24}, (_, i) => `${i}`),
        axisLine: {
          lineStyle: {
            color: '#E5E7EB'
          }
        },
        axisLabel: {
          color: '#6B7280'
        }
      },
      yAxis: {
        type: 'value',
        name: '提交数',
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: {
          lineStyle: {
            color: '#E5E7EB'
          }
        },
        axisLabel: {
          color: '#6B7280'
        }
      },
      series: [{
        name: '提交数',
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
        data: hourlyCommits.value,
        markPoint: {
          data: [
            { type: 'max', name: '峰值' },
            { type: 'min', name: '低谷' }
          ],
          symbolSize: 40
        }
      }]
    }))

    return {
      chartOption
    }
  }
}
</script>

<style scoped>
.work-time-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  height: 400px;
  width: 100%;
}

.chart {
  height: 100%;
  width: 100%;
}
</style>