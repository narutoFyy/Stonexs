import { describe, expect, test } from 'bun:test';
import { fulfillPaperDelivery, type PaperDeliveryDependencies } from '@/lib/paper-delivery/service';
import { isPrivateNetworkAddress, parsePublicPdfUrl } from '@/lib/paper-delivery/validation';
import { PaperDeliveryError, type ValidatedPdf } from '@/lib/paper-delivery/types';

const order = {
  id: '018f-test-order',
  userId: '42',
  sourceUrl: 'https://example.org/paper.pdf',
  title: 'Example paper',
  debitIdempotencyKey: 'paper:018f-test-order:debit',
  refundIdempotencyKey: 'paper:018f-test-order:refund',
};

const pdf: ValidatedPdf = {
  bytes: new TextEncoder().encode('%PDF-1.7 test'),
  contentType: 'application/pdf',
  sha256: 'a'.repeat(64),
  sizeBytes: 13,
  finalUrl: order.sourceUrl,
};

function dependencies(overrides: Partial<PaperDeliveryDependencies> = {}) {
  const events: string[] = [];
  const deps: PaperDeliveryDependencies = {
    fetchPdf: async () => { events.push('fetch'); return pdf; },
    objectKey: () => 'paper-downloads/42/order/file.pdf',
    storePdf: async () => { events.push('store'); },
    debit: async (key) => { events.push(`debit:${key}`); },
    refund: async (key) => { events.push(`refund:${key}`); },
    issueDownload: async () => { events.push('sign'); return 'https://download.example/signed'; },
    record: async ({ status }) => { events.push(`status:${status}`); },
    ...overrides,
  };
  return { deps, events };
}

describe('paper delivery URL boundary', () => {
  test('rejects local and private network targets', () => {
    expect(() => parsePublicPdfUrl('http://localhost/paper.pdf')).toThrow(PaperDeliveryError);
    expect(() => parsePublicPdfUrl('http://127.0.0.1/paper.pdf')).toThrow(PaperDeliveryError);
    expect(isPrivateNetworkAddress('10.0.0.4')).toBe(true);
    expect(isPrivateNetworkAddress('192.168.1.1')).toBe(true);
    expect(isPrivateNetworkAddress('8.8.8.8')).toBe(false);
  });
});

describe('paper delivery charging state machine', () => {
  test('stores and validates before charging, then delivers', async () => {
    const { deps, events } = dependencies();
    const result = await fulfillPaperDelivery(order, deps);
    expect(result.downloadUrl).toContain('signed');
    expect(events).toEqual([
      'fetch',
      'store',
      'status:stored',
      `debit:${order.debitIdempotencyKey}`,
      'status:debited',
      'sign',
      'status:delivered',
    ]);
  });

  test('does not charge when PDF acquisition fails', async () => {
    const { deps, events } = dependencies({
      fetchPdf: async () => { throw new PaperDeliveryError('INVALID_PDF', 'bad pdf'); },
    });
    await expect(fulfillPaperDelivery(order, deps)).rejects.toMatchObject({ code: 'INVALID_PDF' });
    expect(events).toEqual(['status:failed']);
  });

  test('refunds with a separate idempotency key when delivery fails after debit', async () => {
    const { deps, events } = dependencies({
      issueDownload: async () => { throw new Error('signing failed'); },
    });
    await expect(fulfillPaperDelivery(order, deps)).rejects.toMatchObject({ code: 'DELIVERY_FAILED' });
    expect(events).toContain(`refund:${order.refundIdempotencyKey}`);
    expect(events.slice(-2)).toEqual([`refund:${order.refundIdempotencyKey}`, 'status:refunded']);
  });

  test('leaves an explicit refund_pending state when compensation is unavailable', async () => {
    const { deps, events } = dependencies({
      issueDownload: async () => { throw new Error('signing failed'); },
      refund: async () => { throw new Error('wallet offline'); },
    });
    await expect(fulfillPaperDelivery(order, deps)).rejects.toMatchObject({ code: 'REFUND_PENDING' });
    expect(events).toContain('status:refund_pending');
    expect(events).not.toContain('status:refunded');
  });
});
