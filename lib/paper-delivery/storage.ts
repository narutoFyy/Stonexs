import 'server-only';

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_BUCKET_NAME, r2Client } from '@/lib/r2';
import { PaperDeliveryError, type ValidatedPdf } from './types';

function configuredBucket() {
  if (!R2_BUCKET_NAME || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new PaperDeliveryError('STORAGE_NOT_CONFIGURED', '论文存储服务尚未配置', 503);
  }
  return R2_BUCKET_NAME;
}

export function paperObjectKey(userId: string, orderId: string, sha256: string) {
  return `paper-downloads/${encodeURIComponent(userId)}/${orderId}/${sha256}.pdf`;
}

export async function storePaperPdf(objectKey: string, pdf: ValidatedPdf, title: string) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: configuredBucket(),
      Key: objectKey,
      Body: pdf.bytes,
      ContentType: 'application/pdf',
      ContentLength: pdf.sizeBytes,
      Metadata: { title: title.slice(0, 512), sha256: pdf.sha256 },
    }),
  );
}

function safeFilename(title: string) {
  const normalized = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${(normalized || 'paper').slice(0, 120)}.pdf`;
}

export async function createPaperDownloadUrl(objectKey: string, title: string) {
  const filename = safeFilename(title).replace(/[\r\n"]/g, '');
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: configuredBucket(),
      Key: objectKey,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 10 * 60 },
  );
}
