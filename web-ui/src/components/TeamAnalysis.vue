<template>
  <div class="team-analysis">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>作者</th>
            <th>提交数</th>
            <th>新增行</th>
            <th>删除行</th>
            <th>净变化</th>
            <th>首次提交</th>
            <th>最后提交</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(author, index) in data.authorMetrics"
            :key="author.author.email"
            class="table-row"
            :class="{ 'even-row': index % 2 === 0 }"
          >
            <td class="author-cell">
              <div class="author-info">
                <div class="author-avatar">
                  {{ author.author.name.charAt(0).toUpperCase() }}
                </div>
                <div class="author-details">
                  <div class="author-name">{{ author.author.name }}</div>
                  <div class="author-email">{{ author.author.email }}</div>
                </div>
              </div>
            </td>
            <td class="stats-cell">
              <div class="commit-count">{{ author.commitCount }}</div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: calculatePercentage(author.commitCount, maxCommitCount) + '%' }"
                ></div>
              </div>
            </td>
            <td class="positive-stat">{{ author.totalInsertions.toLocaleString() }}</td>
            <td class="negative-stat">{{ author.totalDeletions.toLocaleString() }}</td>
            <td class="net-changes" :class="author.netChanges >= 0 ? 'positive' : 'negative'">
              {{ author.netChanges >= 0 ? '+' + author.netChanges.toLocaleString() : author.netChanges.toLocaleString() }}
            </td>
            <td class="date-cell">{{ formatDate(author.firstCommitDate) }}</td>
            <td class="date-cell">{{ formatDate(author.lastCommitDate) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TeamAnalysis',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  computed: {
    maxCommitCount() {
      if (!this.data.authorMetrics || this.data.authorMetrics.length === 0) return 1;
      return Math.max(...this.data.authorMetrics.map(author => author.commitCount));
    }
  },
  methods: {
    // 计算百分比
    calculatePercentage(value, max) {
      if (max === 0) return 0;
      return (value / max) * 100;
    },

    // 格式化日期函数
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('zh-CN');
    }
  }
}
</script>

<style scoped>
.team-analysis {
  width: 100%;
}

.table-container {
  overflow-x: auto;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background-color: #f9fafb;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 600;
}

.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: #f9fafb;
}

.even-row {
  background-color: #f8fafc;
}

.author-cell {
  display: flex;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
}

.author-avatar {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.author-details {
  margin-left: 1rem;
}

.author-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.author-email {
  font-size: 0.875rem;
  color: #6b7280;
}

.stats-cell {
  vertical-align: top;
}

.commit-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.progress-bar {
  margin-top: 0.25rem;
  width: 100%;
  background-color: #e5e7eb;
  border-radius: 9999px;
  height: 0.5rem;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

.positive-stat {
  color: #059669;
  font-weight: 600;
}

.negative-stat {
  color: #dc2626;
  font-weight: 600;
}

.net-changes {
  font-weight: 600;
}

.net-changes.positive {
  color: #059669;
  background-color: #ecfdf5;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}

.net-changes.negative {
  color: #dc2626;
  background-color: #fef2f2;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}

.date-cell {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>