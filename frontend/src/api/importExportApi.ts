import apiClient from './api';

export interface ImportJob {
  id: number;
  file_name: string;
  file_type: string;
  import_type: 'students' | 'courses' | 'grades';
  status: 'pending' | 'validating' | 'ready' | 'importing' | 'completed' | 'failed' | 'cancelled';
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  validation_errors: Record<string, any> | null;
  created_at: string;
  completed_at: string | null;
  imported_by?: number;
}

export interface ExportJob {
  id: number;
  export_type: string;
  file_format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  created_at: string;
}

export const importExportApi = {
  // Import Operations
  uploadImportFile: (type: 'students' | 'courses' | 'grades', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ImportJob>(`/api/v1/import-export/imports/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getImportJob: (id: number) => {
    return apiClient.get<ImportJob>(`/api/v1/import-export/imports/${id}`);
  },

  commitImportJob: (id: number) => {
    return apiClient.post<ImportJob>(`/api/v1/import-export/imports/${id}/commit`);
  },

  listImportJobs: (params?: { type?: string; status?: string; page?: number; limit?: number }) => {
    return apiClient.get<{ jobs: ImportJob[]; total: number }>(`/api/v1/import-export/imports`, { params });
  },

  // Export Operations
  createExport: (data: { export_type: string; file_format: 'csv' | 'xlsx' | 'pdf'; filters?: any }) => {
    return apiClient.post<ExportJob>('/api/v1/import-export/exports', data);
  },

  getExportJob: (id: number) => {
    return apiClient.get<ExportJob>(`/api/v1/import-export/exports/${id}`);
  },

  listExportJobs: (params?: { type?: string; status?: string; page?: number; limit?: number }) => {
    return apiClient.get<{ exports: ExportJob[]; total: number }>(`/api/v1/import-export/exports`, { params });
  },

  // History
  getHistory: (params?: { operation_type?: string; resource_type?: string; limit?: number }) => {
    return apiClient.get<{ history: any[]; total: number }>('/api/v1/import-export/history', { params });
  }
};
