export function sampleHome() {
  return {
    mode: "sample",
    source: "sample_data",
    freshness: "fixture",
    portfolio: {
      revenueRobux: 18420,
      dailyActiveUsers: 12840,
      forwardD1Retention: 31.4,
      averagePlaytimeMinutes: 18.7,
    },
    message: "Sample Data — connect Roblox to load your experiences.",
  } as const;
}
