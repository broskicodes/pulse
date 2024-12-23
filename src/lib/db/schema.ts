import { pgTable, bigint, text, boolean, timestamp, uuid, integer, pgEnum, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from 'drizzle-orm';

export const twitterHandles = pgTable("twitter_handles", {
    id: bigint("id", { mode: "bigint" }).primaryKey().notNull(),
    handle: text("handle").notNull().unique(),
    name: text("name").notNull().default(""),
    verified: boolean("verified").notNull().default(false),
    url: text("url").notNull(),
    description: text("description"),
    pfp: text("pfp"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  });
  
  export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    twitter_handle_id: bigint("twitter_handle_id", { mode: "bigint" })
      .references(() => twitterHandles.id)
      .notNull()
      .unique(),
    onboarded: boolean("onboarded").notNull().default(false),
    oauth_token: text("oauth_token"),
    oauth_token_secret: text("oauth_token_secret"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  });
  
  export const tweets = pgTable("tweets", {
    tweet_id: bigint("tweet_id", { mode: "bigint" }).primaryKey(),
    handle_id: bigint("handle_id", { mode: "bigint" })
      .references(() => twitterHandles.id)
      .notNull(),
    url: text("url").notNull(),
    text: text("text").notNull(),
    date: timestamp("date").notNull(),
    bookmark_count: integer("bookmark_count").notNull(),
    retweet_count: integer("retweet_count").notNull(),
    reply_count: integer("reply_count").notNull(),
    like_count: integer("like_count").notNull(),
    quote_count: integer("quote_count").notNull(),
    view_count: integer("view_count").notNull(),
    language: text("language").notNull(),
    is_reply: boolean("is_reply").notNull(),
    is_retweet: boolean("is_retweet").notNull(),
    is_quote: boolean("is_quote").notNull(),
    parent_tweet_id: bigint("parent_tweet_id", { mode: "bigint" }),
    entities: jsonb("entities").notNull().default("{}"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  });

  export const tweetsRelations = relations(tweets, ({ one }) => ({
    parent: one(tweets, {
      fields: [tweets.parent_tweet_id],
      references: [tweets.tweet_id],
    }),
  }));
  
  export const engagementTypeEnum = pgEnum("engagement_type", ["like", "retweet", "reply", "quote"]);

export const engagements = pgTable("engagements", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  handle_id: bigint("handle_id", { mode: "bigint" }).references(() => twitterHandles.id).notNull(),
  engaged_tweet_id: bigint("engaged_tweet_id", { mode: "bigint" }).references(() => tweets.tweet_id).notNull(),
  engagement_type: engagementTypeEnum("engagement_type").notNull(),
  tweet_id: bigint("tweet_id", { mode: "bigint" }).references(() => tweets.tweet_id).unique(undefined, { nulls: "distinct" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
} as const, (table) => ({
  uniqueEngagement: uniqueIndex("unique_engagement_idx")
  .on(table.user_id, table.handle_id, table.engaged_tweet_id, table.engagement_type)
  .where(sql`${table.engagement_type} IN ('like', 'retweet')`),
}));

export const jobStatus = pgEnum("job_status", ["pending", "running", "completed", "failed"]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  status: jobStatus("status").notNull(),
  type: text("type").notNull(),
  params: text("params").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
