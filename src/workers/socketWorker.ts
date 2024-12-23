import { parentPort, workerData } from 'worker_threads';
import { TwitterScraperService } from '../services/twitterScraperService';
import { ClientMessagePayload, ClientMessageType, EngagementsPayload, ImportPayload, TweetsPayload } from '../plugins/websocket';
import { chunkArray, getSinceDate } from '../lib/utils';

parentPort?.on('message', async ({ type, payload }: { type: ClientMessageType, payload: ClientMessagePayload }) => {
    console.log('Received message', type, payload);
    switch (type) {
        case ClientMessageType.Tweets: {
            const { scrapeType, handles } = payload as TweetsPayload;
            const scraper = new TwitterScraperService();
            const result = await scraper.runScrapeJob({ 
                input: { 
                    searchTerms: handles.map(handle => {
                        const sinceDate = getSinceDate(scrapeType);
                        return [
                            `from:${handle} since:${sinceDate} filter:has_engagement`,
                        ];
                    }).flat(),
                    sort: "Top",
                    tweetLanguage: "en",
                 } 
            });
            parentPort?.postMessage(result);
            break;
        }
        case ClientMessageType.Engagements: {
            const { tweetIds, handle } = payload as EngagementsPayload;
            const scraper = new TwitterScraperService();
            
            const tweetBatches = chunkArray(tweetIds, 10);
            const result = (await Promise.all(
                tweetBatches
                    .map(batch => scraper.runScrapeJob({
                        input: {
                            searchTerms: batch.map(tweetId => [
                                `conversation_id:${tweetId} filter:replies -from:${handle}`, 
                                `quoted_tweet_id:${tweetId} -from:${handle}`, 
                            ]).flat(),
                            sort: "Top",
                            tweetLanguage: "en",
                        }
                    }))
            )).flat().filter(tweet => tweet !== null);
            parentPort?.postMessage(result);
            break;
        }
        case ClientMessageType.Import: {
            const { tweetIds, handle } = payload as ImportPayload;
            const scraper = new TwitterScraperService();
            const result = await scraper.runScrapeJob({
                input: {
                    tweetIDs: tweetIds,
                    sort: "Top",
                    tweetLanguage: "en",
                }
            });
            parentPort?.postMessage(result?.filter(tweet => tweet.author.handle === handle));
            break;
        }
    }
});