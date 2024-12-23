import { ApifyClient } from 'apify-client';

// Function to get or create ApifyClient
function getApifyClient(): ApifyClient {
    if (!process.env.APIFY_API_TOKEN) {
        throw new Error('APIFY_API_TOKEN is not set in the environment variables');
    }
    return new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });
}

export async function runApifyActor(actorId: string, input: any) {
    const apifyClient = getApifyClient();

    const run = await apifyClient.actor(actorId).call(input);
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    return items;
}
