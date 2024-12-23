import { TwitterScrapeType } from "./types";

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function getSinceDate(scrapeType: TwitterScrapeType): string {
    const now = new Date();
    let sinceDate: Date;
  
    switch (scrapeType) {
      case TwitterScrapeType.Initialize:
        sinceDate = new Date('2023-01-01T00:00:00Z');
        break;
      case TwitterScrapeType.Monthly:
        sinceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        break;
      case TwitterScrapeType.Weekly:
        sinceDate = new Date(now);
        sinceDate.setUTCDate(now.getUTCDate() - 7);
        sinceDate.setUTCHours(0, 0, 0, 0);
        break;
      case TwitterScrapeType.Daily:
        sinceDate = new Date(now);
        sinceDate.setUTCHours(now.getUTCHours() - 24, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
        break;
      case TwitterScrapeType.Update:
        sinceDate = new Date(now);
        sinceDate.setUTCDate(now.getUTCDate() - 2);
        sinceDate.setUTCHours(0, 0, 0, 0);
        break;
      case TwitterScrapeType.Micro:
        sinceDate = new Date(now);
        sinceDate.setMonth(now.getMonth() - 3);
        break;
      default:
        throw new Error('Invalid scrape type');
    }
  
    // Format as YYYY-MM-DD_HH:mm:ss_UTC
    return sinceDate.toISOString().replace('T', '_').replace(/\.\d{3}Z$/, '_UTC');
  }
  