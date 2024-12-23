import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { Worker } from 'worker_threads';
import path from 'path';
import { TwitterScrapeType } from '../lib/types';

interface WorkerWithAvailability extends Worker {
  isAvailable: boolean;
}

export class WorkerPool {
  private workers: WorkerWithAvailability[] = [];
  private taskQueue: { type: ClientMessageType, task: ClientMessagePayload, status: 'pending' | 'processing' | 'error', resolve: Function, reject: Function }[] = [];
  private readonly maxWorkers: number;

  constructor(maxWorkers = navigator.hardwareConcurrency) {
    console.log('Initializing worker pool with', maxWorkers, 'workers');
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(path.join(__dirname, '../workers/socketWorker.js')) as WorkerWithAvailability;

      worker.on('message', (result) => {
        worker.isAvailable = true;
        this.taskQueue[0]?.resolve(result);
        this.taskQueue.shift();
        this.processNextTask();
      });
      worker.on('error', (error) => {
        console.error('Worker error:', error);
        worker.isAvailable = true;
        this.taskQueue[0]?.reject(error);
        this.taskQueue.shift();
        this.processNextTask();
      });
      worker.isAvailable = true;
      this.workers.push(worker);
      console.log(`Scrape Worker ${i+1} initialized`);
    }
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => w.isAvailable);
    if (!availableWorker) return;

    availableWorker.isAvailable = false;
    const task = this.taskQueue.find(t => t.status === 'pending');
    if (!task) return;

    task.status = 'processing';
    availableWorker.postMessage({ type: task.type, payload: task.task });
  }

  runTask(type: ClientMessageType, payload: ClientMessagePayload): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ 
        type,
        task: payload, 
        status: 'pending',
        resolve, 
        reject 
      });
      this.processNextTask();
    });
  }
}

export enum ClientMessageType {
    Tweets = "tweets",
    Engagements = "engagements",
}

export enum WebSocketMessageType {
    Ready = "ready",
    Success = "success",
    Error = "error",
}

export interface TweetsPayload {
  scrapeType: TwitterScrapeType;
  handles: string[];
}

export interface EngagementsPayload {
    tweetIds: string[];
    handle: string;
}

export type ClientMessagePayload = TweetsPayload | EngagementsPayload;

interface ClientMessage {
  id?: string;
  type: ClientMessageType;
  payload: ClientMessagePayload;
}

interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

// Store active connections
const connections = new Set<WebSocket>();
let workerPool: WorkerPool;

export const broadcast = (message: WebSocketMessage) => {
  connections.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
};

export default fp(async (fastify: FastifyInstance) => {
  // Register the websocket plugin first
  await fastify.register(websocket);
  workerPool = new WorkerPool(3);

  fastify.get('/ws', { websocket: true }, (socket, req) => {
    connections.add(socket);

    socket.on('message', (rawMessage: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(rawMessage.toString());
        handleMessage(socket, message);
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'ERROR',
          payload: 'Invalid message format'
        }));
      }
    });

    socket.on('close', () => {
      connections.delete(socket);
    });

    socket.send(JSON.stringify({
      type: WebSocketMessageType.Ready,
      payload: 'Connected to WebSocket server'
    }));
  });
}, {
  name: 'websocket-plugin'
});

async function handleMessage(socket: WebSocket, message: ClientMessage) {
  console.log('Received message:', message);
  switch (message.type) {
    case ClientMessageType.Tweets:
      const tweets = await workerPool.runTask(message.type, message.payload);

        socket.send(JSON.stringify({
          messageId: message.id,
          type: WebSocketMessageType.Success,
          clientMessageType: message.type,
          payload: tweets
        }));
     
      break;
    case ClientMessageType.Engagements:
      const engagements = await workerPool.runTask(message.type, message.payload);
      socket.send(JSON.stringify({
        messageId: message.id,
        type: WebSocketMessageType.Success,
        clientMessageType: message.type,
        payload: engagements
      }));
      break;
    default:
      socket.send(JSON.stringify({
        message: "Unknown message type"
      }));
  }
} 