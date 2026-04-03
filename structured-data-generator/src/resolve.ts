import type { SchemaNode } from './types.js';

export function resolve(
  node: SchemaNode,
  aiValues: Record<string, string>,
  codeValues: Record<string, unknown>,
): unknown {
  if (typeof node === 'string') {
    if (node.startsWith('$ai:'))
      return aiValues[node.slice(4)];
    if (node.startsWith('$code:')) {
      const key = node.slice(6);
      if (!(key in codeValues))
        throw new Error(`Unknown code generator: ${key}`);
      return codeValues[key];
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item) => resolve(item, aiValues, codeValues));
  }
  if (typeof node === 'object' && node !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = resolve(v, aiValues, codeValues);
    }
    return out;
  }
  return node;
}
