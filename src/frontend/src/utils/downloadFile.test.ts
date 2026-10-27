import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let nativePlatform = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatform },
}));

const writeFile = vi.fn();
const share = vi.fn();

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: (opts: unknown) => writeFile(opts) },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: (opts: unknown) => share(opts) },
}));

import { downloadBlob, downloadText } from './downloadFile';

describe('downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeFile.mockResolvedValue({ uri: 'file:///cache/report.pdf' });
    share.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('web', () => {
    beforeEach(() => {
      nativePlatform = false;
      Object.defineProperty(window, 'URL', {
        value: { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() },
        configurable: true,
      });
    });

    it('clicks a temporary anchor and never touches the native plugins', async () => {
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') Object.defineProperty(el, 'click', { value: clickSpy });
        return el;
      });

      await downloadBlob(new Blob(['x'], { type: 'application/pdf' }), 'report.pdf');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
      expect(writeFile).not.toHaveBeenCalled();
      expect(share).not.toHaveBeenCalled();
    });
  });

  describe('native (Android)', () => {
    beforeEach(() => {
      nativePlatform = true;
    });

    it('writes the bytes to the cache dir as base64 and opens the share sheet', async () => {
      await downloadBlob(new Blob(['hello'], { type: 'text/plain' }), 'note.txt');

      expect(writeFile).toHaveBeenCalledWith({
        path: 'note.txt',
        data: btoa('hello'),
        directory: 'CACHE',
      });
      expect(share).toHaveBeenCalledWith({ title: 'note.txt', files: ['file:///cache/report.pdf'] });
    });

    it('treats a dismissed share sheet as success', async () => {
      share.mockRejectedValue(new Error('Share canceled'));

      await expect(downloadBlob(new Blob(['x']), 'a.csv')).resolves.toBeUndefined();
    });

    it('propagates real share failures', async () => {
      share.mockRejectedValue(new Error('No activity found'));

      await expect(downloadBlob(new Blob(['x']), 'a.csv')).rejects.toThrow('No activity found');
    });

    it('downloadText builds the blob with the given MIME type', async () => {
      await downloadText('a,b', 'rows.csv', 'text/csv');

      expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'rows.csv', data: btoa('a,b') }));
    });
  });
});
