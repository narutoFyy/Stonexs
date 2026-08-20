export const PAPER_DOWNLOAD_PRICE_YUAN = 1;
export const PAPER_DOWNLOAD_PRICE_FEN = 100;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;

export type PaperDownloadStatus =
  | 'requested'
  | 'stored'
  | 'debited'
  | 'delivered'
  | 'refund_pending'
  | 'refunded'
  | 'failed';

export interface ValidatedPdf {
  bytes: Uint8Array;
  contentType: 'application/pdf';
  sha256: string;
  sizeBytes: number;
  finalUrl: string;
}

export class PaperDeliveryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = 'PaperDeliveryError';
  }
}
