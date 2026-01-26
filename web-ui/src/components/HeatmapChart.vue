<template>
  <div class="heatmap-chart bg-white p-6 rounded-lg shadow-md card">
    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
      <i class="fas fa-clock mr-2 text-primary"></i>
      工作时段热力图
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
  name: 'HeatmapChart',
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
    // 计算热力图数据
    const computeHeatmapData = () => {
      // 只统计有提交的时间点，创建一个计数映射
      const timeCount = {}

      props.data.commits.forEach((commit, index) => {
        const date = new Date(commit.timestamp)
        const dayOfWeek = date.getDay() // 0为周日，1为周一，...，6为周六
        // 将周日移到最后，使周一为0，周二为1，...，周日为6
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const hour = date.getHours()

        // 创建时间键，格式为 "hour-day"，对应 [x, y]
        const timeKey = `${hour}-${adjustedDay}`
        timeCount[timeKey] = (timeCount[timeKey] || 0) + 1
      })

      // 将计数映射转换为ECharts热力图数据格式 [x, y, value]
      const heatmapData = Object.entries(timeCount).map(([timeKey, count]) => {
        const [hour, day] = timeKey.split('-').map(Number)
        return [hour, day, count]  // [x轴-小时, y轴-星期, 提交数]
      })

      return heatmapData
    }

    const heatmapData = computed(() => computeHeatmapData())

    // 星期几的标签
    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    // 小时标签
    const hourLabels = Array.from({length: 24}, (_, i) => `${i}`)

    // 图表配置
    const chartOption = computed(() => {
      return {
        title: {
          show: false // Hide title since we have it in the header
        },
        tooltip: {
          position: 'top',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontSize: 12
          },
          formatter: (params) => {
            const hour = params.value[0]  // x轴是小时
            const day = params.value[1]   // y轴是星期
            const count = params.value[2]
            return `<div class="p-2">
                      <div>${dayLabels[day]} ${hour}点</div>
                      <div>提交数: ${count}</div>
                    </div>`
          }
        },
        grid: {
          height: '70%',
          top: '10%',
          left: '15%',
          right: '5%',
          bottom: '15%'
        },
        xAxis: {
          type: 'category',
          data: hourLabels,
          splitArea: {
            show: true
          },
          name: '小时',
          nameLocation: 'middle',
          nameGap: 25,
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
          type: 'category',
          data: dayLabels,
          splitArea: {
            show: true
          },
          axisLine: {
            lineStyle: {
              color: '#E5E7EB'
            }
          },
          axisLabel: {
            color: '#6B7280'
          }
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.value.map(item => item[2]), 1),
          calculable: true,
          orient: 'vertical',
          left: 'right',
          top: 'center',
          textStyle: {
            fontSize: 12,
            color: '#6B7280'
          },
          inRange: {
            color: ['#bfdbfe', '#3b82f6', '#1d4ed8'] // Light blue to dark blue gradient
          }
        },
        series: [{
          name: '提交数',
          type: 'heatmap',
          data: heatmapData.value,
          label: {
            show: false // Hide labels for cleaner look
          },
          itemStyle: {
            borderColor: '#F3F4F6',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      }
    })

    return {
      chartOption
    }
  }
}
</script>

<style scoped>
.heatmap-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>