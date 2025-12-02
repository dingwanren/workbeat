<template>
  <div class="heatmap-chart">
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
      console.log('热力图数据处理开始，提交总数：', props.data.commits.length)

      props.data.commits.forEach((commit, index) => {
        const date = new Date(commit.timestamp)
        const dayOfWeek = date.getDay() // 0为周日，1为周一，...，6为周六
        // 将周日移到最后，使周一为0，周二为1，...，周日为6
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const hour = date.getHours()

        console.log(`提交 #${index + 1}:`, {
          timestamp: commit.timestamp,
          date: date.toString(),
          dayOfWeek: dayOfWeek,
          adjustedDay: adjustedDay,
          hour: hour
        })

        // 创建时间键，格式为 "hour-day"，对应 [x, y]
        const timeKey = `${hour}-${adjustedDay}`
        timeCount[timeKey] = (timeCount[timeKey] || 0) + 1
      })

      // 将计数映射转换为ECharts热力图数据格式 [x, y, value]
      const heatmapData = Object.entries(timeCount).map(([timeKey, count]) => {
        const [hour, day] = timeKey.split('-').map(Number)
        return [hour, day, count]  // [x轴-小时, y轴-星期, 提交数]
      })

      console.log('热力图数据统计：', heatmapData)

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
          text: '工作时段热力图',
          left: 'center'
        },
        tooltip: {
          position: 'top',
          formatter: (params) => {
            const hour = params.value[0]  // x轴是小时
            const day = params.value[1]   // y轴是星期
            const count = params.value[2]
            return `${dayLabels[day]} ${hour}点<br/>提交数: ${count}`
          }
        },
        grid: {
          height: '70%',
          top: '15%'
        },
        xAxis: {
          type: 'category',
          data: hourLabels,
          splitArea: {
            show: true
          },
          name: '小时',
          nameLocation: 'middle',
          nameGap: 25
        },
        yAxis: {
          type: 'category',
          data: dayLabels,
          splitArea: {
            show: true
          }
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.value.map(item => item[2]), 1),
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '0%',
          textStyle: {
            fontSize: 12
          }
        },
        series: [{
          name: '提交数',
          type: 'heatmap',
          data: heatmapData.value,
          label: {
            show: true
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
  height: 500px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>