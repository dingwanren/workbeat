export function expandFieldNames(compact: any) {
  return {
    repositoryPath: compact.rp,
    analysisDate: compact.ad,

    authorMetrics: compact.am.map((m: any) => ({
      author: {
        name: m.an,
        email: m.ae
      },
      commitCount: m.cc,
      totalInsertions: m.ti,
      totalDeletions: m.td,
      netChanges: m.nc,
      firstCommitDate: m.fcd,
      lastCommitDate: m.lcd
    })),

    commits: compact.cs.map((c: any) => ({
      hash: c.h,
      author: {
        name: c.an,
        email: c.ae
      },
      timestamp: c.t,
      message: c.m,
      parentHashes: c.ph,
      fileChanges: c.fc.map((f: any) => ({
        filename: f.fn,
        insertions: f.i,
        deletions: f.d,
        language: f.l
      })),
      totalInsertions: c.ti,
      totalDeletions: c.td,
      filesChanged: c.fcnt
    })),

    summary: {
      totalCommits: compact.s.tc,
      totalAuthors: compact.s.ta,
      totalInsertions: compact.s.ti,
      totalDeletions: compact.s.td,
      timeRange: {
        start: compact.s.tr.s,
        end: compact.s.tr.e
      }
    }
  };
}