import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Import/Export client must hand the wizard and the dialogs the server's own message. Since
// v1.18.75 a refusal arrives as an HTTP status of 400 or more with that message in the body,
// where it used to be an answer of 200 with `success: false`.
vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import apiClient from '../api';
import { importExportApi } from '../importExportApi';

const api = apiClient as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

const refusal = (status: number, message: string) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data: { success: false, data: null, error: { code: 'X', message } } },
});

describe('importExportApi errors', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it('gives the server message for an upload that was refused', async () => {
    api.post.mockRejectedValue(refusal(422, 'Only .csv and .xlsx files can be imported'));

    await expect(importExportApi.uploadImportFile('students', new File(['x'], 'a.txt'))).rejects.toThrow(
      'Only .csv and .xlsx files can be imported',
    );
  });

  it('gives the server message for a job that is not there', async () => {
    api.get.mockRejectedValue(refusal(404, 'Import job 7 not found'));

    await expect(importExportApi.getImportJob(7)).rejects.toThrow('Import job 7 not found');
  });

  it('reads the message of a failed download out of the Blob that came back', async () => {
    const body = JSON.stringify({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'The file is gone' } });
    api.get.mockRejectedValue({
      message: 'Request failed with status code 404',
      response: { status: 404, data: new Blob([body], { type: 'application/json' }) },
    });

    await expect(importExportApi.downloadExport(3)).rejects.toThrow('The file is gone');
  });

  it('leaves an error that has no message of the server as it is', async () => {
    const network = new Error('Network Error');
    api.post.mockRejectedValue(network);

    await expect(importExportApi.createExport('students', 'csv')).rejects.toBe(network);
  });

  it('still reads an older answer of 200 with success false', async () => {
    api.get.mockResolvedValue({ data: { success: false, data: null, error: { message: 'Refused the old way' } } });

    await expect(importExportApi.listExportJobs()).rejects.toThrow('Refused the old way');
  });
});
