import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { JobStatus, Tweet } from "../types";
import { jobs } from "./schema";
import { Job } from "../types";
import { eq } from "drizzle-orm";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in the environment variables');
  }
  
  if (!pool) {
    pool = new Pool({
      max: 20,
      connectionString: process.env.DATABASE_URL,
    });
  }
  
  return pool;
}

export function getDb() {
  const pool = getPool();
  return drizzle(pool, { schema });
}


export async function addTweetsToDb(tweets: Tweet[]) {
  const db = getDb();

  // const searchTerms: string[] = [];

  for (const tweet of tweets) {
    // Check if the author already exists in twitterHandles
    const [handle] = await db.insert(schema.twitterHandles)
      .values({
        id: BigInt(tweet.author.id),
        handle: tweet.author.handle,
        url: tweet.author.url,
        pfp: tweet.author.pfp,
        name: tweet.author.name,
        verified: tweet.author.verified,
        description: tweet.author.description,
      })
      .onConflictDoUpdate({
        target: schema.twitterHandles.id,
        set: {
          handle: tweet.author.handle,
          url: tweet.author.url,
          pfp: tweet.author.pfp,
          name: tweet.author.name,
          verified: tweet.author.verified,
          description: tweet.author.description,
          updated_at: new Date()
        }
      })
      .returning({ id: schema.twitterHandles.id });

    const handleId = handle.id;

    // Insert the tweet
    await db.insert(schema.tweets)
      .values({
        tweet_id: BigInt(tweet.tweet_id),
        handle_id: handleId,
        url: tweet.url,
        text: tweet.text,
        date: new Date(tweet.date),
        bookmark_count: tweet.bookmark_count,
        retweet_count: tweet.retweet_count,
        reply_count: tweet.reply_count,
        like_count: tweet.like_count,
        quote_count: tweet.quote_count,
        view_count: tweet.view_count,
        language: tweet.language,
        is_reply: tweet.is_reply,
        is_retweet: tweet.is_retweet,
        is_quote: tweet.is_quote,
        entities: tweet.entities,
        parent_tweet_id: tweet.parent_tweet_id ? BigInt(tweet.parent_tweet_id) : null,
      })
      .onConflictDoUpdate({
        target: schema.tweets.tweet_id,
        set: {
          text: tweet.text,
          bookmark_count: tweet.bookmark_count,
          retweet_count: tweet.retweet_count,
          reply_count: tweet.reply_count,
          like_count: tweet.like_count,
          quote_count: tweet.quote_count,
          view_count: tweet.view_count,
          entities: tweet.entities,
          parent_tweet_id: tweet.parent_tweet_id ? BigInt(tweet.parent_tweet_id) : null,
          updated_at: new Date(),
        },
      });
  }
}

export async function addJobToDb(job: Job): Promise<void> {
  const db = getDb();
  await db.insert(jobs).values(job);
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const db = getDb();
  await db.update(jobs).set({ status, updated_at: new Date() }).where(eq(jobs.id, jobId));
}

export async function getJobById(jobId: string): Promise<Job | undefined> {
  const db = getDb();
  const result = await db.select().from(jobs).where(eq(jobs.id, jobId));
  return result[0];
}