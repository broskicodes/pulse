import Fastify from 'fastify';
import cors from './plugins/cors';
import websocketPlugin from './plugins/websocket';
import config from './config';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import 'dotenv/config';

const server = Fastify({
    logger: true
});

// Register plugins
server.register(cors);
server.register(websocketPlugin);

server.register(routes);
server.setErrorHandler(errorHandler);

const start = async () => {
    try {
      await server.listen({
        port: config.port as number,
        host: '0.0.0.0'
      });
      console.log(`Server listening on http://localhost:${config.port}`);
  
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  
  start();