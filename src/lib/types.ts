export enum TwitterScrapeType {
    Initialize = "initialize",
    Micro = "micro",
    Monthly = "monthly",
    Weekly = "weekly",
    Daily = "daily",
    Update = "update"
  }
  
  export interface TwitterAuthor {
    id: string;
    name: string;
    description?: string;
    handle: string;
    pfp: string;
    url: string;
    followers?: number;
    verified: boolean;
  }

  export interface TweetEntity {
    urls: Array<{
      url: string;
    }>;
    media: Array<{
      type: string;
      url: string;
    }> | null;
  }
  
  export interface Tweet {
    tweet_id: string;
    author: TwitterAuthor;
    url: string;
    text: string;
    date: string;
    bookmark_count: number;
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    view_count: number;
    language: string;
    entities: TweetEntity;
    is_reply: boolean;
    is_retweet: boolean;
    is_quote: boolean;
    is_thread: boolean;
    parent_tweet_id?: string;
  }

  export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
  
  export interface Job {
    id: string;
    status: JobStatus;
    type: string;
    params: string;
    created_at: Date;
    updated_at: Date;
  }
