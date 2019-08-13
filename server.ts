import fastify from 'fastify';

const server = fastify({
  logger: true
});

export interface Query {
  foo?: number
}

export interface Params {
  bar?: string
}

export interface Body {
  baz?: string
}

export interface Headers {
  a?: string
}

server.get<Query, Params, Body, Headers>('/ping/:bar', (request, reply) => {
  console.log(request.query)
  console.log(request.params)
  console.log(request.body)
  console.log(request.headers)
  reply.code(200).send({ pong: 'it worked!' })
});

server.get('/', (request, reply) => {
  reply.code(200).send('Hello, world!');
});

server.listen(3000).catch(e => console.log(e));
