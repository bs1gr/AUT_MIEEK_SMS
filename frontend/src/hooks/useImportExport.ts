import { useState, useCallback } from 'react';
import { importExportApi, ImportJob, ExportJob } from '../api/importExportApi';

export const useImportExport = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadImportFile = useCallback(async (type: 'students' | 'courses' | 'grades', file: File): Promise<ImportJob | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await importExportApi.uploadImportFile(type, file);
            if (!response.data) {
                setError('Upload failed: No data received');
                return null;
            }
            return response.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during upload');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createExport = useCallback(async (data: { export_type: string; file_format: 'csv' | 'xlsx' | 'pdf'; filters?: any }): Promise<ExportJob | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await importExportApi.createExport(data);
            if (!response.data) {
                setError('Export failed: No data received');
                return null;
            }
            return response.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during export');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        uploadImportFile,
        createExport
    };
};
