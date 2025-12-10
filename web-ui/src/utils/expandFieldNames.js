/**
 * Convert timestamp to Date object if needed
 */
function convertTimestamp(timestamp) {
  if (typeof timestamp === 'number' && timestamp > 0) {
    // If it's a Unix timestamp (seconds), convert to milliseconds
    if (timestamp < 10000000000) { // Rough check for second-based timestamps (not milliseconds)
      return new Date(timestamp * 1000);
    } else {
      // Assume it's already in milliseconds
      return new Date(timestamp);
    }
  } else if (typeof timestamp === 'string' || timestamp instanceof Date) {
    return new Date(timestamp);
  }
  return timestamp;
}

/**
 * Expand compact field names back to original structure
 */
export function expandFieldNames(compact) {
  if (!compact) return null;

  return {
    repositoryPath: compact.rp,
    analysisDate: convertTimestamp(compact.ad),

    authorMetrics: Array.isArray(compact.am) ? compact.am.map(m => ({
      author: {
        name: m.an,
        email: m.ae
      },
      commitCount: m.cc,
      totalInsertions: m.ti,
      totalDeletions: m.td,
      netChanges: m.nc,
      firstCommitDate: convertTimestamp(m.fcd),
      lastCommitDate: convertTimestamp(m.lcd)
    })) : [],

    commits: Array.isArray(compact.cs) ? compact.cs.map(c => ({
      hash: c.h,
      author: {
        name: c.an,
        email: c.ae
      },
      timestamp: convertTimestamp(c.t),
      message: c.m,
      parentHashes: Array.isArray(c.ph) ? c.ph : [],
      fileChanges: Array.isArray(c.fc) ? c.fc.map(f => ({
        filename: f.fn,
        insertions: f.i,
        deletions: f.d,
        language: f.l
      })) : [],
      totalInsertions: c.ti,
      totalDeletions: c.td,
      filesChanged: c.fcnt
    })) : [],

    summary: {
      totalCommits: compact.s.tc,
      totalAuthors: compact.s.ta,
      totalInsertions: compact.s.ti,
      totalDeletions: compact.s.td,
      timeRange: {
        start: convertTimestamp(compact.s.tr.s),
        end: convertTimestamp(compact.s.tr.e)
      }
    }
  };
}

/**
 * Check if the data is in compact format
 */
export function isCompactFormat(data) {
  return data && data.cs && data.am && data.s;
}