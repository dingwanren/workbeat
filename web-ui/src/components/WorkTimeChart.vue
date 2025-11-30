<template>
  <div class="work-time-chart">
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
        const hour = new Date(commit.timestamp).getUTCHours()
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
        text: '24小时提交活跃度分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const param = params[0]
          return `时间: ${param.value[0]}点<br/>提交数: ${param.value[1]}`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: Array.from({length: 24}, (_, i) => `${i}`)
      },
      yAxis: {
        type: 'value',
        name: '提交数'
      },
      series: [{
        name: '提交数',
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#5470c6',
          width: 3
        },
        itemStyle: {
          color: '#5470c6'
        },
        areaStyle: {
          opacity: 0.3
        },
        data: hourlyCommits.value,
        symbolSize: 6
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