<template>
  <div class="code-trend-chart bg-white p-6 rounded-lg shadow-md card">
    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
      <i class="fas fa-code mr-2 text-primary"></i>
      代码产出趋势
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
  name: 'CodeTrendChart',
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
    // 使用现有 chartData 中的趋势数据
    const chartOption = computed(() => {
      // 从现有数据中提取所需字段
      const dates = props.data.chartData.dates || []
      const commitTrends = props.data.chartData.commitTrends || []
      const codeChangeTrends = props.data.chartData.codeChangeTrends || []

      // 分别计算新增和删除趋势（如果需要）
      // 这里简化为使用现有数据，实际可以根据 commits 重新计算
      const insertions = []
      const deletions = []

      // 基于提交数据计算各时间段的新增和删除行数
      if (props.data.commits && props.data.commits.length > 0) {
        // 按日期分组
        const commitsByDate = {}
        props.data.commits.forEach(commit => {
          const date = new Date(commit.timestamp).toISOString().split('T')[0]
          if (!commitsByDate[date]) {
            commitsByDate[date] = { insertions: 0, deletions: 0 }
          }
          commitsByDate[date].insertions += commit.insertions || 0
          commitsByDate[date].deletions += commit.deletions || 0
        })

        // 生成时间序列数据
        const sortedDates = Object.keys(commitsByDate).sort()
        const timeSeriesInsertions = []
        const timeSeriesDeletions = []
        const timeSeriesDates = []

        sortedDates.forEach(date => {
          timeSeriesDates.push(date)
          timeSeriesInsertions.push(commitsByDate[date].insertions)
          timeSeriesDeletions.push(-1 * Math.abs(commitsByDate[date].deletions)) // 使用绝对值表示删除
        })

        // 如果数据量合适，使用新计算的数据
        if (timeSeriesDates.length > 0) {
          return {
            title: {
              show: false // Hide title since we have it in the header
            },
            tooltip: {
              trigger: 'axis',
              axisPointer: {
                type: 'cross',
                label: {
                  backgroundColor: '#6a7985'
                }
              },
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderColor: '#3b82f6',
              borderWidth: 1,
              textStyle: {
                color: '#fff',
                fontSize: 12
              }
            },
            legend: {
              data: ['新增行', '删除行'],
              top: '5%',
              textStyle: {
                color: '#6B7280'
              }
            },
            grid: {
              left: '3%',
              right: '4%',
              bottom: '10%',
              top: '15%',
              containLabel: true
            },
            xAxis: [
              {
                type: 'category',
                boundaryGap: false,
                data: timeSeriesDates,
                axisLine: {
                  lineStyle: {
                    color: '#E5E7EB'
                  }
                },
                axisLabel: {
                  color: '#6B7280'
                }
              }
            ],
            yAxis: [
              {
                type: 'value',
                name: '行数',
                axisLine: {
                  lineStyle: {
                    color: '#E5E7EB'
                  }
                },
                axisLabel: {
                  color: '#6B7280'
                }
              }
            ],
            series: [
              {
                name: '新增行',
                type: 'line',
                // stack: 'code',
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
                emphasis: {
                  focus: 'series'
                },
                data: timeSeriesInsertions,
                itemStyle: {
                  color: '#3b82f6',
                  borderColor: '#FFF',
                  borderWidth: 2
                },
                lineStyle: {
                  width: 3
                },
                smooth: true
              },
              {
                name: '删除行',
                type: 'line',
                // stack: 'code',
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
                      { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
                    ]
                  }
                },
                emphasis: {
                  focus: 'series'
                },
                data: timeSeriesDeletions,
                itemStyle: {
                  color: '#EF4444',
                  borderColor: '#FFF',
                  borderWidth: 2
                },
                lineStyle: {
                  width: 3
                },
                smooth: true
              }
            ]
          }
        }
      }

      // 如果没有详细数据，则使用基本趋势数据
      return {
        title: {
          show: false // Hide title since we have it in the header
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontSize: 12
          }
        },
        legend: {
          data: ['提交数', '代码变更'],
          top: '5%',
          textStyle: {
            color: '#6B7280'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            boundaryGap: false,
            data: dates,
            axisLine: {
              lineStyle: {
                color: '#E5E7EB'
              }
            },
            axisLabel: {
              color: '#6B7280'
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '数量',
            axisLine: {
              lineStyle: {
                color: '#E5E7EB'
              }
            },
            axisLabel: {
              color: '#6B7280'
            }
          }
        ],
        series: [
          {
            name: '提交数',
            type: 'line',
            stack: 'total',
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(145, 204, 117, 0.3)' },
                  { offset: 1, color: 'rgba(145, 204, 117, 0.05)' }
                ]
              }
            },
            emphasis: {
              focus: 'series'
            },
            data: commitTrends,
            itemStyle: {
              color: '#91CC75',
              borderColor: '#FFF',
              borderWidth: 2
            },
            lineStyle: {
              width: 3
            },
            smooth: true
          },
          {
            name: '代码变更',
            type: 'line',
            stack: 'total',
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(115, 192, 222, 0.3)' },
                  { offset: 1, color: 'rgba(115, 192, 222, 0.05)' }
                ]
              }
            },
            emphasis: {
              focus: 'series'
            },
            data: codeChangeTrends,
            itemStyle: {
              color: '#73C0DE',
              borderColor: '#FFF',
              borderWidth: 2
            },
            lineStyle: {
              width: 3
            },
            smooth: true
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
.code-trend-chart {
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