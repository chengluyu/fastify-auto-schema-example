import ts from 'typescript';
import { createParser, createFormatter, SchemaGenerator, Config, DEFAULT_CONFIG } from 'ts-json-schema-generator';
import JSON5 from 'json5';
import fs from 'fs';

/**
 * Create a schema generator with an existing TypeScript program.
 * Copied from https://github.com/vega/ts-json-schema-generator/blob/master/ts-json-schema-generator.ts
 * @param filePath path to the source file
 * @param program the TypeScript program
 */
function createGenerator(filePath: string, program: ts.Program) {
  const parser = createParser(program, {
    ...DEFAULT_CONFIG,
    path: filePath,
    tsconfig: 'tsconfig.json'
  });
  const formatter = createFormatter();
  return new SchemaGenerator(program, parser, formatter);
}

const filePath = 'server.ts';
const tsConfig = JSON5.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
const program = ts.createProgram([filePath], tsConfig.compilerOptions);
const checker = program.getTypeChecker();
const generator = createGenerator(filePath, program);

/**
 * Route methods supported by fastify.
 */
const routeMethods = new Set([
  'delete', 'get', 'head', 'patch', 'post', 'put', 'options', 'all'
]);

/**
 * Naively identify the invocation of route methods.
 * @param node the call expression to be identifed
 */
function isFastifyRouteCall(node: ts.CallExpression): boolean {
  // Route registration methods are generic and have four type arguments.
  if (node.typeArguments === undefined || node.typeArguments.length !== 4) {
    return false;
  }
  // The function should be in the from `instance.method`
  // where type of `instance` should be FastifyInstacne and
  // `method` should be one of names off route methods.
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return false;
  }
  const { expression, name } = node.expression;
  if (!routeMethods.has(name.text)) {
    return false;
  }
  const type = checker.getTypeAtLocation(expression);
  if (type === undefined) {
    return false;
  }
  const typeNode = checker.typeToTypeNode(type);
  if (typeNode === undefined) {
    return false;
  }
  return (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === 'FastifyInstance'
  );
}

/**
 * Serialize a object into literal AST node.
 * Will raise error if encounters symbols and functions.
 * @param value the object to be serialized
 */
function makeObjectLiteral(value: any): ts.Expression {
  if (typeof value === 'bigint') {
    return ts.createBigIntLiteral(value.toString());
  } else if (typeof value === 'boolean') {
    return value ? ts.createTrue() : ts.createFalse();
  } else if (typeof value === 'function') {
    throw new Error('cannot serialize function');
  } else if (typeof value === 'number') {
    return ts.createNumericLiteral(value.toString());
  } else if (typeof value === 'object') {
    // Because typeof null === 'object'
    if (value === null) {
      return ts.createNull();
    }
    const properties: ts.PropertyAssignment[] = [];
    for (const key of Object.keys(value)) {
      properties.push(ts.createPropertyAssignment(
        ts.createStringLiteral(key),
        makeObjectLiteral(value[key])
      ));
    }
    return ts.createObjectLiteral(properties, true);
  } else if (typeof value === 'string') {
    return ts.createStringLiteral(value);
  } else if (typeof value === 'symbol') {
    throw new Error('cannot serialize symbol');
  } else {
    return ts.createIdentifier('undefined');
  }
}

function getTypeName(typeNode: ts.TypeNode): string {
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.text;
  }
  throw new Error('cannot identify the type name');
}

function routeTransformer<T extends ts.Node>(): ts.TransformerFactory<T> {
  return context => {
    const visitor: ts.Visitor = node => {
      if (ts.isCallExpression(node) && isFastifyRouteCall(node)) {
        const [queryType, paramsType, bodyType, headersType] = node.typeArguments!.map(getTypeName);
        console.log(queryType, paramsType, bodyType, headersType);

        const routeOptions = ({
          schema: {
            query: generator.createSchema(queryType).definitions![queryType],
            params: generator.createSchema(paramsType).definitions![paramsType],
            body: generator.createSchema(bodyType).definitions![bodyType],
            headers: generator.createSchema(headersType).definitions![headersType],
          }
        });

        return ts.updateCall(node, node.expression, node.typeArguments, [
          node.arguments[0], makeObjectLiteral(routeOptions), node.arguments[1]
        ]);
      }
      return ts.visitEachChild(node, child => visitor(child), context);
    };
    return node => ts.visitNode(node, visitor);
  };
}

const emitResult = program.emit(
  undefined,
  undefined,
  undefined,
  undefined,
  { before: [routeTransformer()] }
);
