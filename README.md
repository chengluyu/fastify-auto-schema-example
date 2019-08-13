# Fastify Automatic Injection Schema

This example shows how to generate JSON schema and inject the generated object literal into function arguments at compilation time.

File structure:

* `index.ts` contains the plugin.
* `server.ts` contains a simple fastify server.
* `server.js` is the code emitted from `server.ts`.
