import { updateJobStatus, addJobToDb, addTweetsToDb } from "../lib/db/drizzle";
import { TwitterScrapeType, Tweet, Job } from "../lib/types";
import { getSinceDate } from "../lib/utils";
import { CronJobService } from "./cronJobService";

export class TwitterScraperService {
    private cronJobService: CronJobService;

  constructor() {
    this.cronJobService = new CronJobService();
  }
    async runScrapeJob(scrapeType: TwitterScrapeType, handles: string[]): Promise<Tweet[] | null>;
    async runScrapeJob(input: {
        input?: {
            searchTerms?: string[],
            tweetIDs?: string[],
            sort?: string,
            tweetLanguage?: string,
            maxItems?: number
        }
    }): Promise<Tweet[] | null>;


    async runScrapeJob(
        scrapeTypeOrInput: TwitterScrapeType | { input?: {
          searchTerms?: string[],
          tweetIDs?: string[],
          sort?: string,
          tweetLanguage?: string,
          maxItems?: number
        } },
        handles?: string[]
      ): Promise<Tweet[] | null> {
        const isSimpleVersion = typeof scrapeTypeOrInput === 'string';
        
        let input;
        
        if (isSimpleVersion) {
          const sinceDate = getSinceDate(scrapeTypeOrInput);
    
          input = {
            searchTerms: handles!.map(handle => `from:${handle} since:${sinceDate} -filter:replies`),
            sort: "Latest",
            tweetLanguage: "en",
            maxItems: 1500,
          };
        } else {
          input = scrapeTypeOrInput.input;
        }

        const job: Job = {
            id: crypto.randomUUID(),
            status: 'running',
            type: 'twitter_scrape',
            params: JSON.stringify({input: input, env: process.env.ENVIRONMENT}),
            created_at: new Date(),
            updated_at: new Date(),
          };
      
          await addJobToDb(job);
      
          try {
            const tweets = await this.cronJobService.runScrapeJob(job.id, input);
            await updateJobStatus(job.id, 'completed');
            await addTweetsToDb(tweets);
            return tweets;
          } catch (error) {
            console.error('Error in runScrapeJob:', error);
            return null;
          }
    }
}