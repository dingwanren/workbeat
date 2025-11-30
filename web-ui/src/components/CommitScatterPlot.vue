<template>
  <div class="commit-scatter-plot">
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import VChart from 'vue-echarts'

export default {
  name: 'CommitScatterPlot',
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
    // 计算每个提交的文件数量和代码行数（以提交为粒度）
    const computeAuthorScatterData = () => {
      // 直接为每个提交创建数据点
      const commitData = props.data.commits.map((commit, index) => {
        const authorInfo = `${commit.author.name} <${commit.author.email}>`
        return [
          commit.filesChanged || 0,  // X轴：文件数量
          (commit.insertions || 0) + (commit.deletions || 0), // Y轴：代码行数
          authorInfo,                // 名称
          index + 1                  // 序号
        ]
      })

      // 在浏览器控制台输出调试信息
      if (typeof window !== 'undefined') {
        console.log('CommitScatterPlot data:', commitData)
        console.log('Number of commits:', commitData.length)
      }
      return commitData
    }

    const scatterData = computed(() => computeAuthorScatterData())
    
    const chartOption = computed(() => {
      // 如果没有数据，显示空提示
      if (scatterData.value.length === 0) {
        return {
          title: {
            text: '暂无提交数据',
            left: 'center',
            top: 'center'
          }
        }
      }
      
      return {
        title: {
          text: '提交习惯分析',
          subtext: '文件数量 vs 代码行数',
          left: 'center'
        },
        tooltip: {
          formatter: (params) => {
            const data = params.data
            return `
              作者: ${data[2]}<br/>
              文件数量: ${data[0]}<br/>
              代码行数: ${data[1]}
            `
          }
        },
        legend: {
          top: '10%',
          data: ['提交习惯']
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%',
          top: '20%'
        },
        xAxis: {
          type: 'value',
          name: '文件数量',
          splitLine: {
            lineStyle: {
              type: 'dashed'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '代码行数',
          splitLine: {
            lineStyle: {
              type: 'dashed'
            }
          }
        },
        series: [
          {
            name: '提交习惯',
            type: 'scatter',
            data: scatterData.value,
            symbolSize: function (data) {
              // 根据提交总数调整点的大小，增加视觉效果
              return Math.max(Math.min(data[0] + data[1] / 10, 50), 10) // 大小限制在10-50之间
            },
            emphasis: {
              focus: 'series',
              label: {
                show: true,
                formatter: function (param) {
                  return param.data[2].split(' ')[0] // 显示作者名字
                }
              }
            },
            itemStyle: {
              color: '#5470c6',
              opacity: 0.7
            }
          }
        ]
      }
    })
    
    return {
      chartOption
    }
  }
}
</script>

<style scoped>
.commit-scatter-plot {
  width: 100%;
  height: 100%;
}

.chart-container {
  height: 500px;
  width: 100%;
}

.chart {
  height: 100%;
  width: 100%;
}
</style>