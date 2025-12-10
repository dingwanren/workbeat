export function shortenFieldNames(data: any) {
  return {
    rp: data.repositoryPath,
    ad: data.analysisDate,

    // authorMetrics → am
    am: data.authorMetrics.map((m: any) => ({
      an: m.author.name,
      ae: m.author.email,
      cc: m.commitCount,
      ti: m.totalInsertions,
      td: m.totalDeletions,
      nc: m.netChanges,
      fcd: m.firstCommitDate,
      lcd: m.lastCommitDate
    })),

    // commits → cs
    cs: data.commits.map((c: any) => ({
      h: c.hash,
      an: c.author.name,
      ae: c.author.email,
      t: c.timestamp,
      m: c.message,
      ph: c.parentHashes,
      fc: c.fileChanges.map((f: any) => ({
        fn: f.filename,
        i: f.insertions,
        d: f.deletions,
        l: f.language
      })),
      ti: c.totalInsertions,
      td: c.totalDeletions,
      fcnt: c.filesChanged
    })),

    // summary → s
    s: {
      tc: data.summary.totalCommits,
      ta: data.summary.totalAuthors,
      ti: data.summary.totalInsertions,
      td: data.summary.totalDeletions,
      tr: {
        s: data.summary.timeRange.start,
        e: data.summary.timeRange.end
      }
    }
  };
}

/**
 * Compact parent hashes to 7 characters and convert timestamps to seconds
 */
export function compactParentHashesAndTimestamps(data: any) {
  const result = JSON.parse(JSON.stringify(data)); // Deep clone

  // Compact parent hashes to 7 characters
  if (result.cs && Array.isArray(result.cs)) {
    result.cs.forEach((commit: any) => {
      if (commit.ph && Array.isArray(commit.ph)) {
        commit.ph = commit.ph.map((hash: string) => hash.substring(0, 7));
      }
    });
  } else if (result.commits && Array.isArray(result.commits)) {
    result.commits.forEach((commit: any) => {
      if (commit.parentHashes && Array.isArray(commit.parentHashes)) {
        commit.parentHashes = commit.parentHashes.map((hash: string) => hash.substring(0, 7));
      }
    });
  }

  // Convert timestamps to seconds
  if (result.cs) {
    // Working with compacted structure
    result.cs.forEach((commit: any) => {
      if (commit.t instanceof Date || (typeof commit.t === 'string' && !isNaN(Date.parse(commit.t)))) {
        const date = new Date(commit.t);
        commit.t = Math.floor(date.getTime() / 1000);
      } else if (typeof commit.t === 'number' && commit.t > 1000000000 && commit.t < 10000000000000) { // Basic check for timestamp
        // Already in seconds, no further action needed
      } else if (typeof commit.t === 'number' && commit.t > 1000000000000) { // Assuming millisecond timestamp
        commit.t = Math.floor(commit.t / 1000);
      }
    });

    // Convert authorMetrics timestamps
    result.am.forEach((metric: any) => {
      if (metric.fcd instanceof Date || (typeof metric.fcd === 'string' && !isNaN(Date.parse(metric.fcd)))) {
        const date = new Date(metric.fcd);
        metric.fcd = Math.floor(date.getTime() / 1000);
      } else if (typeof metric.fcd === 'number' && metric.fcd > 1000000000 && metric.fcd < 10000000000000) { // Already in seconds
      } else if (typeof metric.fcd === 'number' && metric.fcd > 1000000000000) { // Millisecond timestamp
        metric.fcd = Math.floor(metric.fcd / 1000);
      }

      if (metric.lcd instanceof Date || (typeof metric.lcd === 'string' && !isNaN(Date.parse(metric.lcd)))) {
        const date = new Date(metric.lcd);
        metric.lcd = Math.floor(date.getTime() / 1000);
      } else if (typeof metric.lcd === 'number' && metric.lcd > 1000000000 && metric.lcd < 10000000000000) { // Already in seconds
      } else if (typeof metric.lcd === 'number' && metric.lcd > 1000000000000) { // Millisecond timestamp
        metric.lcd = Math.floor(metric.lcd / 1000);
      }
    });

    // Convert summary timeRange timestamps
    if (result.s.tr.s instanceof Date || (typeof result.s.tr.s === 'string' && !isNaN(Date.parse(result.s.tr.s)))) {
      const date = new Date(result.s.tr.s);
      result.s.tr.s = Math.floor(date.getTime() / 1000);
    } else if (typeof result.s.tr.s === 'number' && result.s.tr.s > 1000000000 && result.s.tr.s < 10000000000000) { // Already in seconds
    } else if (typeof result.s.tr.s === 'number' && result.s.tr.s > 1000000000000) { // Millisecond timestamp
      result.s.tr.s = Math.floor(result.s.tr.s / 1000);
    }

    if (result.s.tr.e instanceof Date || (typeof result.s.tr.e === 'string' && !isNaN(Date.parse(result.s.tr.e)))) {
      const date = new Date(result.s.tr.e);
      result.s.tr.e = Math.floor(date.getTime() / 1000);
    } else if (typeof result.s.tr.e === 'number' && result.s.tr.e > 1000000000 && result.s.tr.e < 10000000000000) { // Already in seconds
    } else if (typeof result.s.tr.e === 'number' && result.s.tr.e > 1000000000000) { // Millisecond timestamp
      result.s.tr.e = Math.floor(result.s.tr.e / 1000);
    }
  } else {
    // Working with original structure
    result.commits.forEach((commit: any) => {
      if (commit.timestamp instanceof Date || (typeof commit.timestamp === 'string' && !isNaN(Date.parse(commit.timestamp)))) {
        const date = new Date(commit.timestamp);
        commit.timestamp = Math.floor(date.getTime() / 1000);
      } else if (typeof commit.timestamp === 'number' && commit.timestamp > 1000000000 && commit.timestamp < 10000000000000) { // Already in seconds
      } else if (typeof commit.timestamp === 'number' && commit.timestamp > 1000000000000) { // Millisecond timestamp
        commit.timestamp = Math.floor(commit.timestamp / 1000);
      }
    });

    // Convert authorMetrics timestamps
    result.authorMetrics.forEach((metric: any) => {
      if (metric.firstCommitDate instanceof Date || (typeof metric.firstCommitDate === 'string' && !isNaN(Date.parse(metric.firstCommitDate)))) {
        const date = new Date(metric.firstCommitDate);
        metric.firstCommitDate = Math.floor(date.getTime() / 1000);
      } else if (typeof metric.firstCommitDate === 'number' && metric.firstCommitDate > 1000000000 && metric.firstCommitDate < 10000000000000) { // Already in seconds
      } else if (typeof metric.firstCommitDate === 'number' && metric.firstCommitDate > 1000000000000) { // Millisecond timestamp
        metric.firstCommitDate = Math.floor(metric.firstCommitDate / 1000);
      }

      if (metric.lastCommitDate instanceof Date || (typeof metric.lastCommitDate === 'string' && !isNaN(Date.parse(metric.lastCommitDate)))) {
        const date = new Date(metric.lastCommitDate);
        metric.lastCommitDate = Math.floor(date.getTime() / 1000);
      } else if (typeof metric.lastCommitDate === 'number' && metric.lastCommitDate > 1000000000 && metric.lastCommitDate < 10000000000000) { // Already in seconds
      } else if (typeof metric.lastCommitDate === 'number' && metric.lastCommitDate > 1000000000000) { // Millisecond timestamp
        metric.lastCommitDate = Math.floor(metric.lastCommitDate / 1000);
      }
    });

    // Convert summary timeRange timestamps
    if (result.summary.timeRange.start instanceof Date || (typeof result.summary.timeRange.start === 'string' && !isNaN(Date.parse(result.summary.timeRange.start)))) {
      const date = new Date(result.summary.timeRange.start);
      result.summary.timeRange.start = Math.floor(date.getTime() / 1000);
    } else if (typeof result.summary.timeRange.start === 'number' && result.summary.timeRange.start > 1000000000 && result.summary.timeRange.start < 10000000000000) { // Already in seconds
    } else if (typeof result.summary.timeRange.start === 'number' && result.summary.timeRange.start > 1000000000000) { // Millisecond timestamp
      result.summary.timeRange.start = Math.floor(result.summary.timeRange.start / 1000);
    }

    if (result.summary.timeRange.end instanceof Date || (typeof result.summary.timeRange.end === 'string' && !isNaN(Date.parse(result.summary.timeRange.end)))) {
      const date = new Date(result.summary.timeRange.end);
      result.summary.timeRange.end = Math.floor(date.getTime() / 1000);
    } else if (typeof result.summary.timeRange.end === 'number' && result.summary.timeRange.end > 1000000000 && result.summary.timeRange.end < 10000000000000) { // Already in seconds
    } else if (typeof result.summary.timeRange.end === 'number' && result.summary.timeRange.end > 1000000000000) { // Millisecond timestamp
      result.summary.timeRange.end = Math.floor(result.summary.timeRange.end / 1000);
    }
  }

  return result;
}