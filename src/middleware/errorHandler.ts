import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  console.log('errorHandler', error);
  // request.log.error(error);
  reply.status(500).send({ error: 'Internal Server Error' });
}
