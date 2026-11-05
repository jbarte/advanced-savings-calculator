import type { PlanDocument } from "./plan-document";
import { failWith } from "./plan-problem";
import { readPlanText, serializePlan } from "./read-plan";

/*
 * A share link carries the whole plan in the part after "#", which a browser never sends to a server:
 *   <page>#plan=<token>, token = "z." + base64url(deflate(json))   (or "u." + base64url(json) without compression)
 * Everything in a link is untrusted, so decoding limits the size before and after inflating and then reads the
 * plan with the same checks as a saved plan.
 */

const MAX_TOKEN_LENGTH = 30_000;
/** The largest allowed plan is about 10 kB of JSON; this leaves room and still stops a decompression bomb. */
const MAX_JSON_BYTES = 100_000;

type LinkProblemCode = "link-damaged" | "link-too-large" | "link-unsupported" | "not-a-plan-link";

function fail(code: LinkProblemCode, message: string): never {
  return failWith({ code }, message);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return fail("link-damaged", "The link has characters that don't belong in it");
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return fail("link-damaged", "The link is damaged");
  }
}

/** Runs bytes through a (de)compression stream and stops as soon as the output would pass `maxBytes`. */
async function runStream(
  bytes: Uint8Array,
  stream: { readonly readable: ReadableStream<Uint8Array>; readonly writable: WritableStream<BufferSource> },
  maxBytes: number,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // A write error (bad data) also shows up on the read side, which is where it is handled.
  void writer.write(new Uint8Array(bytes)).then(() => writer.close()).catch(() => undefined);

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return fail("link-too-large", "The link holds too large a plan");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RangeError) throw error;
    return fail("link-damaged", "The link is damaged or cut off");
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export interface EncodeOptions {
  /** Compress the plan. Off only when the browser can't, and in tests. */
  readonly compress?: boolean;
}

/** Packs a plan into a link token. Compresses when the browser can. */
export async function encodePlan(plan: PlanDocument, options: EncodeOptions = {}): Promise<string> {
  const bytes = new TextEncoder().encode(serializePlan(plan));
  const compress = options.compress ?? typeof CompressionStream !== "undefined";
  if (!compress) return `u.${toBase64Url(bytes)}`;
  return `z.${toBase64Url(await runStream(bytes, new CompressionStream("deflate"), MAX_JSON_BYTES * 2))}`;
}

/** Reads a plan from a link token. Throws a PlanError that says what is wrong when the link is bad. */
export async function decodePlan(token: string): Promise<PlanDocument> {
  if (token.length > MAX_TOKEN_LENGTH) return fail("link-too-large", "The link is too long to be a plan");
  const kind = token.slice(0, 2);
  const body = token.slice(2);

  let bytes: Uint8Array;
  if (kind === "u.") {
    bytes = fromBase64Url(body);
    if (bytes.length > MAX_JSON_BYTES) return fail("link-too-large", "The link holds too large a plan");
  } else if (kind === "z.") {
    if (typeof DecompressionStream === "undefined") return fail("link-unsupported", "This browser can't open compressed links");
    bytes = await runStream(fromBase64Url(body), new DecompressionStream("deflate"), MAX_JSON_BYTES);
  } else {
    return fail("not-a-plan-link", "This is not a plan link");
  }

  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("link-damaged", "The link is damaged");
  }
  return readPlanText(json);
}

/** The token in a URL hash like "#plan=z.abc", or null when the hash is not a plan link. */
export function planTokenFromHash(hash: string): string | null {
  const match = /^#plan=(.*)$/s.exec(hash);
  return match ? (match[1] ?? "") : null;
}

/** The link for a token: the page's own address, with any hash replaced. */
export function buildShareUrl(pageUrl: string, token: string): string {
  const hashAt = pageUrl.indexOf("#");
  const base = hashAt === -1 ? pageUrl : pageUrl.slice(0, hashAt);
  return `${base}#plan=${token}`;
}
