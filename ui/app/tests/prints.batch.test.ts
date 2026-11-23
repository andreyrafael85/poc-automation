import { describe, expect, it } from 'vitest';

import { BATCH_MAX, intakeBatch, looseImagesOf } from '../features/wrapup/prints/capture/batch';
import { parseManifest } from '../features/wrapup/prints/capture/manifest';
import { isBlockedTenant } from '../features/wrapup/prints/capture/tenantGuard';
import {
  baseName,
  captureOrder,
  leadingNumber,
  matchBatch,
  nameTimestamp,
  suggestedFileName,
  wordsOf,
  type BatchImage,
  type MatchTarget,
} from '../features/wrapup/prints/capture/match';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM script, no declaration file
import * as zipModule from '../../../scripts/visual/zipStore.mjs';

/**
 * The batch import (3.3.2): the owner retired the capture companion and kept the import, "in a
 * batch with the intelligence to know which print of the batch is which". These pin how the
 * matcher guesses, how sure it says it is, and that it never decides a tie.
 */

const zipStore = (zipModule as { zipStore(entries: { name: string; data: Buffer }[], when?: Date): Buffer }).zipStore;

/** A PNG header the sniffer reads (type and size only). */
function png(width: number, height: number, salt = 0): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(34);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(out.buffer).setUint32(16, width);
  new DataView(out.buffer).setUint32(20, height);
  out.set([8, 6, 0, 0, 0], 24);
  out[33] = salt;
  return out;
}

const image = (key: string, name: string, extra: Partial<BatchImage> = {}): BatchImage => ({ key, name, lastModified: null, sha256: `sha-${key}`, width: 1920, height: 1080, ...extra });

const TARGETS: MatchTarget[] = [
  { slotId: 'problem--p-260914359', position: 1, terms: ['Problem P-260914359', 'Problema P-260914359', 'dynatrace.davis.problems', 'problem'], hasPrint: false },
  { slotId: 'root-cause--service-c44033de8492cf45', position: 2, terms: ['Root cause: easyTradeManager', 'Causa raiz: easyTradeManager', 'easyTradeManager', 'dynatrace.services', 'root-cause'], hasPrint: false },
  { slotId: 'logs-errors--status-error-2h', position: 4, terms: ['Error logs', 'Logs de erro', 'dynatrace.logs', 'logs-errors'], hasPrint: false },
  { slotId: 'vulnerabilities--list', position: 5, terms: ['Vulnerabilities', 'Vulnerabilidades', 'dynatrace.security.vulnerabilities', 'vulnerabilities'], hasPrint: false },
];

describe('reading a screenshot’s name', () => {
  it('takes a leading deck number, never the start of a date', () => {
    expect(leadingNumber('03-problem--p-1.png')).toBe(3);
    expect(leadingNumber('3 logs.png')).toBe(3);
    expect(leadingNumber('folder/12_vulns.jpg')).toBe(12);
    expect(leadingNumber('2026-11-16 at 10.22.33.png')).toBeNull();
    expect(leadingNumber('00-x.png')).toBeNull();
    expect(leadingNumber('Screenshot.png')).toBeNull();
    // A date written day first is not a screen number (review 3.3.2 #9).
    expect(leadingNumber('16-11-2026 10.22.png')).toBeNull();
    expect(leadingNumber('16.11.26 tela.png')).toBeNull();
  });

  it('reads the time stamps operating systems write, AM/PM included', () => {
    const at = (h: number, m: number, s: number) => Date.UTC(2026, 10, 16, h, m, s);
    expect(nameTimestamp('Screenshot 2026-11-16 at 10.22.33.png')).toBe(at(10, 22, 33));
    expect(nameTimestamp('Screenshot 2026-11-16 at 1.02.03 PM.png')).toBe(at(13, 2, 3));
    expect(nameTimestamp('Screenshot 2026-11-16 at 12.05.00 AM.png')).toBe(at(0, 5, 0));
    expect(nameTimestamp('Captura de tela 2026-11-16 102233.png')).toBe(at(10, 22, 33));
    expect(nameTimestamp('Screenshot_20261116_102233.png')).toBe(at(10, 22, 33));
    expect(nameTimestamp('Screenshot 2026-11-16 10:22:33.png')).toBe(at(10, 22, 33));
    expect(nameTimestamp('logs.png')).toBeNull();
  });

  it('keeps meaningful words only', () => {
    expect([...wordsOf('Screenshot 2026-11-16 — Logs de erro (copy).png')]).toEqual(['logs', 'erro']);
    expect([...wordsOf('Causa raiz: easyTradeManager')]).toEqual(['causa', 'raiz', 'easytrademanager']);
    expect(baseName('a/b/03-x.final.png')).toBe('03-x.final');
  });

  it('orders by the name’s stamp, then the file time, then the name naturally', () => {
    const order = captureOrder([
      image('c', 'shot 10.png'),
      image('b', 'Screenshot 2026-11-16 at 10.00.05.png'),
      image('a', 'Screenshot 2026-11-16 at 09.59.59.png'),
      image('d', 'shot 2.png'),
      image('e', 'x.png', { lastModified: Date.UTC(2026, 10, 16, 9, 0, 0) }),
    ]);
    expect(order.map((item) => item.key)).toEqual(['e', 'a', 'b', 'd', 'c']);
  });
});

describe('matching a batch to the screens', () => {
  it('reads back the file names the plan offers, with high confidence, whatever the order', () => {
    const images = [...TARGETS].reverse().map((target, index) => image(`k${index}`, suggestedFileName(target.position, target.slotId)));
    const proposals = matchBatch(images, TARGETS);
    expect(proposals.map((proposal) => proposal.slotId)).toEqual([...TARGETS].reverse().map((target) => target.slotId));
    expect(proposals.every((proposal) => proposal.confidence === 'high')).toBe(true);
    expect(suggestedFileName(4, 'logs-errors--status-error-2h')).toBe('04-logs-errors--status-error-2h.png');
  });

  it('takes the deck number alone, and refuses to decide when two images claim the same number', () => {
    expect(matchBatch([image('a', '05 anything.png')], TARGETS)[0]).toMatchObject({ slotId: 'vulnerabilities--list', confidence: 'high', reason: 'number' });
    const clash = matchBatch([image('a', '05 first.png'), image('b', '05 second.png')], TARGETS);
    expect(clash.every((proposal) => proposal.confidence !== 'high')).toBe(true);
  });

  it('matches clear words with medium confidence, and never a tie', () => {
    const [words] = matchBatch([image('a', 'causa raiz easytrademanager.png')], TARGETS);
    expect(words).toMatchObject({ slotId: 'root-cause--service-c44033de8492cf45', confidence: 'medium', reason: 'words' });
    // One shared word is not enough: it falls to the order, "to confirm".
    const [weak] = matchBatch([image('a', 'logs.png')], TARGETS);
    expect(weak).toMatchObject({ confidence: 'confirm', reason: 'order' });
  });

  it('fills the rest in the order taken, onto the screens without a print, and says "to confirm"', () => {
    const targets = TARGETS.map((target) => (target.position === 1 ? { ...target, hasPrint: true } : target));
    const proposals = matchBatch(
      [image('late', 'Screenshot 2026-11-16 at 10.05.00.png'), image('early', 'Screenshot 2026-11-16 at 10.01.00.png'), image('mid', 'Screenshot 2026-11-16 at 10.03.00.png')],
      targets,
    );
    const by = new Map(proposals.map((proposal) => [proposal.key, proposal]));
    expect(by.get('early')).toMatchObject({ slotId: 'root-cause--service-c44033de8492cf45', confidence: 'confirm', reason: 'order' });
    expect(by.get('mid')?.slotId).toBe('logs-errors--status-error-2h');
    expect(by.get('late')?.slotId).toBe('vulnerabilities--list');
  });

  it('never trusts the number of a name that carries a screen id the plan does not have (review 3.3.2 #9)', () => {
    const [foreign] = matchBatch([image('a', '05-problem--p-999999.png')], TARGETS);
    expect(foreign?.confidence).not.toBe('high');
  });

  it('says when the proposed screen already has a print, so the review never replaces it by default (review 3.3.2 #1)', () => {
    const targets = TARGETS.map((target) => (target.position === 4 ? { ...target, hasPrint: true } : target));
    const [again] = matchBatch([image('a', suggestedFileName(4, 'logs-errors--status-error-2h'))], targets);
    expect(again).toMatchObject({ slotId: 'logs-errors--status-error-2h', confidence: 'high', replaces: true });
    const [fresh] = matchBatch([image('a', suggestedFileName(5, 'vulnerabilities--list'))], targets);
    expect(fresh?.replaces).toBe(false);
  });

  it('sets aside duplicates and what has no screen left, and flags a tall image', () => {
    const proposals = matchBatch(
      [image('a', '01.png'), image('b', 'copy.png', { sha256: 'sha-a' }), ...['c', 'd', 'e', 'f', 'g'].map((key) => image(key, `${key}.png`, { height: 2400 }))],
      TARGETS,
    );
    const by = new Map(proposals.map((proposal) => [proposal.key, proposal]));
    expect(by.get('b')).toMatchObject({ slotId: null, reason: 'duplicate', duplicateOf: 'a' });
    expect(proposals.filter((proposal) => proposal.reason === 'unplaced')).toHaveLength(2);
    expect(by.get('c')?.tall).toBe(true);
    expect(by.get('a')?.tall).toBe(false);
    // No screen gets two images.
    const placed = proposals.flatMap((proposal) => (proposal.slotId === null ? [] : [proposal.slotId]));
    expect(new Set(placed).size).toBe(placed.length);
  });
});

describe('the batch intake', () => {
  const file = (bytes: Uint8Array, name: string, type = 'image/png') => new File([bytes as BlobPart], name, { type, lastModified: Date.UTC(2026, 10, 16) });

  it('checks every image by its bytes and hashes it', async () => {
    const batch = await intakeBatch([file(png(1920, 1080, 1), 'a.png'), file(new TextEncoder().encode('<svg/>'), 'evil.png'), file(png(100, 100, 2), 'tiny.png')]);
    expect(batch.files).toHaveLength(1);
    expect(batch.files[0]?.image).toMatchObject({ name: 'a.png', width: 1920, height: 1080 });
    expect(batch.files[0]?.image.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(batch.refused.map((refusal) => refusal.why).sort()).toEqual(['dims', 'type']);
  });

  it('opens a ZIP of loose screenshots, skipping folders, __MACOSX and dot files', async () => {
    const zip = zipStore([
      { name: 'prints/', data: Buffer.alloc(0) },
      { name: 'prints/01-logs.png', data: Buffer.from(png(1920, 1080, 3)) },
      { name: '__MACOSX/prints/._01-logs.png', data: Buffer.from('x') },
      { name: 'prints/.DS_Store', data: Buffer.from('x') },
      { name: 'prints/readme.txt', data: Buffer.from('x') },
    ]);
    const loose = await looseImagesOf(file(new Uint8Array(zip), 'prints.zip', 'application/zip'));
    expect(loose?.map((item) => item.name)).toEqual(['01-logs.png']);
    const batch = await intakeBatch([file(new Uint8Array(zip), 'prints.zip', 'application/zip')]);
    expect(batch.files.map((item) => item.image.name)).toEqual(['01-logs.png']);
  });

  it('sends a ZIP with the companion’s manifest to the companion import, and refuses a ZIP with `..`', async () => {
    const companion = zipStore([{ name: 'manifest.json', data: Buffer.from('{}') }]);
    const batch = await intakeBatch([file(new Uint8Array(companion), 'run.zip', 'application/zip')]);
    expect(batch.companionZips).toHaveLength(1);
    expect(batch.files).toHaveLength(0);
    const evil = zipStore([{ name: '../escape.png', data: Buffer.from(png(1920, 1080)) }]);
    const refused = await intakeBatch([file(new Uint8Array(evil), 'evil.zip', 'application/zip')]);
    expect(refused.refused).toEqual([{ name: 'evil.zip', why: 'zip' }]);
  });

  it('reads UTF-8 names (macOS pt-BR “Captura de Tela … às …”, the narrow space before PM) and skips what it cannot read, keeping the rest (review 3.3.2 #2)', async () => {
    const zip = zipStore([
      { name: 'Prints/Captura de Tela 2026-11-16 às 10.22.33.png', data: Buffer.from(png(1920, 1080, 4)) },
      { name: 'Prints/Screenshot 2026-11-16 at 1.02.03\u202fPM.png', data: Buffer.from(png(1920, 1080, 5)) },
      ...Array.from({ length: 30 }, (_, index) => ({ name: `__MACOSX/Prints/._${index}.png`, data: Buffer.from('x') })),
    ]);
    const loose = await looseImagesOf(file(new Uint8Array(zip), 'prints.zip', 'application/zip'));
    expect(loose?.map((item) => item.name)).toEqual(['Captura de Tela 2026-11-16 às 10.22.33.png', 'Screenshot 2026-11-16 at 1.02.03\u202fPM.png']);
  });

  it('refuses a companion ZIP re-zipped inside a folder: its manifest would otherwise be skipped (review 3.3.2 #4, rule 11)', async () => {
    const nested = zipStore([
      { name: 'run/manifest.json', data: Buffer.from('{"tenantHost":"custa001.apps.dynatrace.com"}') },
      { name: 'run/shots/01_problem--p-1.jpg', data: Buffer.from(png(1920, 1080, 6)) },
    ]);
    const batch = await intakeBatch([file(new Uint8Array(nested), 'run.zip', 'application/zip')]);
    expect(batch.files).toHaveLength(0);
    expect(batch.companionZips).toHaveLength(0);
    expect(batch.refused).toEqual([{ name: 'run.zip', why: 'nested_manifest' }]);
  });

  it('refuses a ZIP over the size cap before reading a byte of it (review 3.3.2 #3)', async () => {
    const huge = { name: 'huge.zip', type: 'application/zip', size: 61 * 1024 * 1024, lastModified: 0, arrayBuffer: () => Promise.reject(new Error('read')) } as unknown as File;
    const batch = await intakeBatch([huge]);
    expect(batch.refused).toEqual([{ name: 'huge.zip', why: 'size' }]);
  });

  it(`takes at most ${BATCH_MAX} images`, async () => {
    const many = Array.from({ length: BATCH_MAX + 2 }, (_, index) => file(png(1920, 1080, index), `${index}.png`));
    const batch = await intakeBatch(many);
    expect(batch.files).toHaveLength(BATCH_MAX);
    expect(batch.refused.filter((refusal) => refusal.why === 'too_many')).toHaveLength(2);
  });
});

describe('the customer tenants (rule 11), after the companion left', () => {
  // In this repository the guard holds the SHA-256 of two placeholder ids (`custa001`, `custb002`).

  it('refuses the two customer tenants by hash, as a host or a bare id, and nothing else', () => {
    for (const id of ['custa001', 'custb002']) {
      expect(isBlockedTenant(id), id).toBe(true);
      expect(isBlockedTenant(`${id}.apps.dynatrace.com`), id).toBe(true);
      expect(isBlockedTenant(`${id.toUpperCase()}.live.dynatrace.com`), id).toBe(true);
    }
    for (const host of ['abc12345.apps.dynatrace.com', 'xyz98765.apps.dynatrace.com', '', 'custa00']) expect(isBlockedTenant(host), host).toBe(false);
  });

  it('refuses a companion manifest from a customer tenant even when the app claims to run there', () => {
    const manifest = { schema: 'pvs.capture.manifest.v1', tenantHost: 'custa001.apps.dynatrace.com', shots: [], viewport: { width: 1920, height: 1080 }, startedAt: '2026-11-16T10:00:00.000Z' };
    expect(parseManifest(manifest, 'custa001.apps.dynatrace.com')).toMatchObject({ ok: false, reason: 'prt.err.tenant' });
    // Control: the same manifest on the lab's own host imports.
    expect(parseManifest({ ...manifest, tenantHost: 'abc12345.apps.dynatrace.com' }, 'abc12345.apps.dynatrace.com').ok).toBe(true);
  });
});
