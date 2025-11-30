import { createApp } from 'vue'
import App from './App.vue'
import { use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'
import { BarChart, LineChart, ScatterChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  TitleComponent
} from 'echarts/components'

// 注册必要的 ECharts 模块
use([
  CanvasRenderer,  // 画布渲染器
  SVGRenderer,     // SVG渲染器
  BarChart,        // 柱状图
  LineChart,       // 折线图
  ScatterChart,    // 散点图
  PieChart,        // 饼图
  GridComponent,      // 网格组件
  TooltipComponent,   // 提示框组件
  LegendComponent,    // 图例组件
  DataZoomComponent,  // 数据区域缩放组件
  VisualMapComponent, // 视觉映射组件
  TitleComponent      // 标题组件
])

createApp(App).mount('#app')