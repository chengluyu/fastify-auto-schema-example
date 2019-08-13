"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fastify_1 = __importDefault(require("fastify"));
const server = fastify_1.default({
    logger: true
});
server.get('/ping/:bar', {
    "schema": {
        "query": {
            "type": "object",
            "properties": {
                "foo": {
                    "type": "number"
                }
            },
            "additionalProperties": false
        },
        "params": {
            "type": "object",
            "properties": {
                "bar": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        },
        "body": {
            "type": "object",
            "properties": {
                "baz": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        },
        "headers": {
            "type": "object",
            "properties": {
                "a": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}, (request, reply) => {
    console.log(request.query);
    console.log(request.params);
    console.log(request.body);
    console.log(request.headers);
    reply.code(200).send({ pong: 'it worked!' });
});
server.get('/', (request, reply) => {
    reply.code(200).send('Hello, world!');
});
server.listen(3000).catch(e => console.log(e));
