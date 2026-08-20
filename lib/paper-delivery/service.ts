import type { PaperDownloadStatus, ValidatedPdf } from './types';
import { PaperDeliveryError } from './types';

export interface PaperDeliveryOrderInput {
  id: string;
  userId: string;
  sourceUrl: string;
  title: string;
  debitIdempotencyKey: string;
  refundIdempotencyKey: string;
}

export interface PaperDeliveryUpdate {
  status: PaperDownloadStatus;
  objectKey?: string;
  contentSha256?: string;
  sizeBytes?: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  deliveredAt?: Date;
  refundedAt?: Date;
}

export interface PaperDeliveryDependencies {
  fetchPdf(sourceUrl: string): Promise<ValidatedPdf>;
  objectKey(order: PaperDeliveryOrderInput, pdf: ValidatedPdf): string;
  storePdf(objectKey: string, pdf: ValidatedPdf, title: string): Promise<void>;
  debit(idempotencyKey: string): Promise<void>;
  refund(idempotencyKey: string): Promise<void>;
  issueDownload(objectKey: string, title: string): Promise<string>;
  record(update: PaperDeliveryUpdate): Promise<void>;
}

export async function fulfillPaperDelivery(order: PaperDeliveryOrderInput, deps: PaperDeliveryDependencies) {
  let debited = false;
  let objectKey: string | undefined;

  try {
    const pdf = await deps.fetchPdf(order.sourceUrl);
    objectKey = deps.objectKey(order, pdf);
    await deps.storePdf(objectKey, pdf, order.title);
    await deps.record({
      status: 'stored',
      objectKey,
      contentSha256: pdf.sha256,
      sizeBytes: pdf.sizeBytes,
      failureCode: null,
      failureMessage: null,
    });

    await deps.debit(order.debitIdempotencyKey);
    debited = true;
    await deps.record({ status: 'debited', objectKey });

    const downloadUrl = await deps.issueDownload(objectKey, order.title);
    await deps.record({ status: 'delivered', objectKey, deliveredAt: new Date() });
    return { downloadUrl, objectKey, sha256: pdf.sha256, sizeBytes: pdf.sizeBytes };
  } catch (cause) {
    const error = cause instanceof PaperDeliveryError
      ? cause
      : new PaperDeliveryError('DELIVERY_FAILED', cause instanceof Error ? cause.message : '论文交付失败', 502);

    if (!debited) {
      await deps.record({ status: 'failed', objectKey, failureCode: error.code, failureMessage: error.message });
      throw error;
    }

    await deps.record({ status: 'refund_pending', objectKey, failureCode: error.code, failureMessage: error.message });
    try {
      await deps.refund(order.refundIdempotencyKey);
      await deps.record({ status: 'refunded', objectKey, refundedAt: new Date() });
    } catch (refundCause) {
      throw new PaperDeliveryError(
        'REFUND_PENDING',
        refundCause instanceof Error ? refundCause.message : '退款正在等待处理',
        503,
      );
    }
    throw error;
  }
}
