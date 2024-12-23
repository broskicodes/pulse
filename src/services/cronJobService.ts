import { getJobById, updateJobStatus, addJobToDb, addTweetsToDb } from '../lib/db/drizzle';
import { Job, Tweet, TwitterScrapeType } from '../lib/types';
import { runApifyActor } from '../lib/apify';
import { APIFY_TWEET_SCRAPER_ACTOR } from '../lib/constant';
import { chunkArray, getSinceDate } from '../lib/utils';

export class CronJobService {
  // async scheduleDailyTwitterScrapeJobs(type?: TwitterScrapeType): Promise<void> {
  //   try {
  //     // Fetch all handles from the twitterHandles table
  //     const handles = await getHandleForSubscribedUsers();
  //     // const handles = await getTwitterHandles();

  //     // Group handles into batches of 10
  //     const handleBatches = chunkArray(handles, 50);

  //     // Create a job for each batch
  //     const sinceDate = getSinceDate(type || TwitterScrapeType.Update);

  //     for (const batch of handleBatches) {
  //       const input = {
  //         "searchTerms": batch.map((handle: string) => 
  //           `from:${handle} since:${sinceDate} -filter:replies`
  //         ),
  //         "sort": "Latest",
  //         "tweetLanguage": "en",
  //       };

  //       await addJobToDb({
  //         id: crypto.randomUUID(),
  //         status: 'pending',
  //         type: 'twitter_scrape',
  //         params: JSON.stringify({
  //           input: input,
  //           env: process.env.ENVIRONMENT
  //           // env: 'production'
  //         }),
  //         created_at: new Date(),
  //         updated_at: new Date(),
  //       });
  //     }
    
  //     console.log(`Scheduled ${handleBatches.length} Twitter scrape jobs`);
  //   } catch (error) {
  //     console.error('Error scheduling daily Twitter scrape jobs:', error);
  //   }
  // }

  async processJob(jobId: string): Promise<void> {
    const job = await getJobById(jobId);

    if (!job) {
      console.error(`Job with ID ${jobId} not found`);
      return;
    }

    if (job.status !== 'pending') {
      console.log(`Job ${jobId} is not pending, skipping`);
      return;
    }

    try {
      const params = JSON.parse(job.params);

      if (params.env !== process.env.ENVIRONMENT) {
        console.log(`Job ${jobId} is not in the correct environment, skipping`);
        return;
      }

      await updateJobStatus(jobId, 'running');
      switch (job.type) {
        case 'twitter_scrape': {
          const tweets = await this.runScrapeJob(jobId, params.input);
          await addTweetsToDb(tweets);
          break;
        }
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await updateJobStatus(jobId, 'completed');
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      await updateJobStatus(jobId, 'failed');
    }
  }

  async runScrapeJob(jobId: string, input: any): Promise<Tweet[]> {
    try {
      await updateJobStatus(jobId, 'running');
      console.log('Running scrape job', jobId);

      const result = await runApifyActor(APIFY_TWEET_SCRAPER_ACTOR, input);

      const tweets: Tweet[] = result.filter((item: any) => item.author).map((item: any) => ({
        author: {
          id: item.author.id,
          name: item.author.name,
          handle: item.author.userName,
          pfp: item.author.profilePicture,
          url: item.author.url,
          verified: item.author.isBlueVerified,
          followers: item.author.followers,
        },
        tweet_id: item.id,
        url: item.url,
        text: item.text,
        date: item.createdAt,
        bookmark_count: item.bookmarkCount,
        retweet_count: item.retweetCount,
        reply_count: item.replyCount,
        like_count: item.likeCount,
        quote_count: item.quoteCount,
        view_count: item.viewCount,
        language: item.lang,
        is_reply: item.isReply,
        is_retweet: item.retweeted_tweet ? true : false,
        is_quote: item.quoted_tweet ? true : false,
        entities: item.entities,
        is_thread: false,
        parent_tweet_id: item.isReply ? item.conversationId : item.quoted_tweet ? item.quoted_tweet.id : item.retweeted_tweet ? item.retweeted_tweet.id : undefined,
      }));

      return tweets;
    } catch (error) {
      console.error('Error in runScrapeJob:', error);
      await updateJobStatus(jobId, 'failed');
      return [];
    }
  }
}
