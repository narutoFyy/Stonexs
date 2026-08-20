import 'server-only';

import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { MAX_PDF_BYTES, PaperDeliveryError, type ValidatedPdf } from './types';

const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 20_000;

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split('%')[0];
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

export function isPrivateNetworkAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export function parsePublicPdfUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PaperDeliveryError('INVALID_URL', '论文下载地址格式不正确', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new PaperDeliveryError('INVALID_URL', '论文下载地址必须是公开的 HTTP 或 HTTPS 地址', 400);
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new PaperDeliveryError('PRIVATE_ADDRESS', '论文下载地址不可访问本地网络', 400);
  }
  if (isIP(hostname) && isPrivateNetworkAddress(hostname)) {
    throw new PaperDeliveryError('PRIVATE_ADDRESS', '论文下载地址不可访问私有网络', 400);
  }
  return url;
}

async function assertPublicDns(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
    throw new PaperDeliveryError('PRIVATE_ADDRESS', '论文下载地址解析到了私有网络', 400);
  }
}

async function readLimitedBody(response: Response) {
  if (!response.body) throw new PaperDeliveryError('EMPTY_PDF', '论文文件为空');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PDF_BYTES) {
      await reader.cancel();
      throw new PaperDeliveryError('PDF_TOO_LARGE', '论文 PDF 超过 40 MB 限制', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function downloadAndValidatePdf(source: string): Promise<ValidatedPdf> {
  let url = parsePublicPdfUrl(source);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicDns(url);
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: { accept: 'application/pdf,application/octet-stream;q=0.8' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) {
        throw new PaperDeliveryError('REDIRECT_LIMIT', '论文下载地址重定向次数过多');
      }
      url = parsePublicPdfUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new PaperDeliveryError('SOURCE_HTTP_ERROR', `论文来源返回 HTTP ${response.status}`, 502);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_PDF_BYTES) {
      throw new PaperDeliveryError('PDF_TOO_LARGE', '论文 PDF 超过 40 MB 限制', 413);
    }

    const bytes = await readLimitedBody(response);
    const signature = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
    if (signature !== '%PDF-') {
      throw new PaperDeliveryError('INVALID_PDF', '来源返回的内容不是有效 PDF');
    }

    return {
      bytes,
      contentType: 'application/pdf',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.byteLength,
      finalUrl: url.toString(),
    };
  }

  throw new PaperDeliveryError('REDIRECT_LIMIT', '论文下载地址重定向次数过多');
}
