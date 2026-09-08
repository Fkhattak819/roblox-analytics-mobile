import type { IncomingMessage, ServerResponse } from "node:http";

export class RequestBodyTooLargeError extends Error {}

export function publicHttpError(error: unknown): { statusCode: number; body: { error: string } } {
  if (error instanceof RequestBodyTooLargeError) {
    return { statusCode: 413, body: { error: "request_body_too_large" } };
  }
  if (error instanceof SyntaxError) {
    return { statusCode: 400, body: { error: "invalid_json" } };
  }
  return { statusCode: 500, body: { error: "internal_error" } };
}

export function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new RequestBodyTooLargeError();
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
