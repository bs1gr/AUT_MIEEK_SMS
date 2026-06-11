import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboards } from '../useDashboards';
import apiClient from '@/api/api';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

const sampleDashboards: Dashboard[] = [
  {
    id: 1,
    name: 'Math Performance',
    description: 'Dashboard for tracking math student performance',
    configuration: { charts: ['performance', 'gradeDistribution', 'scatter'] },
    is_default: true,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Attendance Analysis',
    description: 'Focus on attendance patterns',
    configuration: { charts: ['attendance', 'trend'] },
    is_default: false,
    created_at: '2024-01-11T00:00:00Z',
    updated_at: '2024-01-11T00:00:00Z',
  },
  {
    id: 3,
    name: 'Complete Dashboard',
    description: undefined,
    configuration: {
      charts: [
        'performance',
        'gradeDistribution',
        'attendance',
        'trend',
        'pieChart',
        'scatter',
        'heatmap',
        'sankey',
        'treemap',
        'boxplot',
      ],
    },
    is_default: false,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
];

describe('useDashboards hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Fetching dashboards', () => {
    it('fetches all dashboards successfully', async () => {
      const spy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({ data: { data: sampleDashboards } });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      expect(result.current.dashboards).toEqual(sampleDashboards);
      expect(spy).toHaveBeenCalledWith('/dashboards');
    });

    it('extracts default dashboard from dashboards list', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { data: sampleDashboards },
      });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.defaultDashboard).toBeDefined());

      expect(result.current.defaultDashboard).toEqual(sampleDashboards[0]);
      expect(result.current.defaultDashboard?.is_default).toBe(true);
    });

    it('handles empty dashboards list', async () => {
      // Only the dashboards query will call the API; defaultDashboard uses getQueryData
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [] } });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.isLoadingDashboards).toBe(false));

      expect(result.current.dashboards).toEqual([]);
      // With empty dashboards, the defaultDashboard query won't run due to enabled condition
      // Wait for it to complete or ensure it's null
      await waitFor(() => {
        expect(result.current.defaultDashboard === null || result.current.defaultDashboard === undefined).toBe(true);
      });
    });

    it('handles API errors gracefully', async () => {
      const error = new Error('Network error');
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(error);

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.isLoadingDashboards).toBe(false));

      expect(result.current.dashboards).toEqual([]);
    });
  });

  describe('Creating dashboards', () => {
    it('creates a new dashboard successfully', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [] } });
      const createSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          data: {
            id: 4,
            name: 'New Dashboard',
            description: 'Test dashboard',
            configuration: { charts: ['performance'] },
            is_default: false,
            created_at: '2024-01-13T00:00:00Z',
            updated_at: '2024-01-13T00:00:00Z',
          },
        },
      });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        result.current.createDashboard(
          {
            name: 'New Dashboard',
            description: 'Test dashboard',
            configuration: { charts: ['performance'] },
          },
          {
            onSuccess: () => {
              // success callback handled
            },
          }
        );
      });

      await waitFor(() => expect(result.current.isCreating).toBe(false));

      expect(createSpy).toHaveBeenCalledWith('/dashboards', {
        name: 'New Dashboard',
        description: 'Test dashboard',
        configuration: { charts: ['performance'] },
      });
    });

    it('handles create errors', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [] } });
      const error = { response: { data: { message: 'Name already exists' } } };
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(error);

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        result.current.createDashboard(
          {
            name: 'Duplicate',
            configuration: { charts: ['performance'] },
          },
          {
            onError: (err) => {
              expect(err.message).toContain('Name already exists');
            },
          }
        );
      });

      await waitFor(() => expect(result.current.createError).toBeDefined());
    });
  });

  describe('Updating dashboards', () => {
    it('updates a dashboard successfully', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: sampleDashboards } });
      const updateSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
        data: {
          data: {
            ...sampleDashboards[0],
            name: 'Updated Name',
          },
        },
      });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      await act(async () => {
        result.current.updateDashboard(
          {
            id: 1,
            data: {
              name: 'Updated Name',
            },
          },
          {
            onSuccess: () => {},
          }
        );
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(updateSpy).toHaveBeenCalledWith('/dashboards/1', {
        name: 'Updated Name',
      });
    });
  });

  describe('Deleting dashboards', () => {
    it('deletes a dashboard successfully', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: sampleDashboards } });
      const deleteSpy = vi
        .spyOn(apiClient, 'delete')
        .mockResolvedValueOnce({ data: { data: { message: 'Dashboard deleted successfully' } } });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      await act(async () => {
        result.current.deleteDashboard(1, {
          onSuccess: () => {},
        });
      });

      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      expect(deleteSpy).toHaveBeenCalledWith('/dashboards/1');
    });
  });

  describe('Setting default dashboard', () => {
    it('sets a dashboard as default', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: sampleDashboards } });
      const setDefaultSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          data: {
            ...sampleDashboards[1],
            is_default: true,
          },
        },
      });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      await act(async () => {
        result.current.setDefaultDashboard(2);
      });

      await waitFor(() => expect(result.current.isSettingDefault).toBe(false));

      expect(setDefaultSpy).toHaveBeenCalledWith('/dashboards/2/set-default');
    });
  });

  describe('Loading states', () => {
    it('provides correct loading states during fetch', async () => {
      vi.spyOn(apiClient, 'get').mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { data: sampleDashboards } }),
              100
            )
          )
      );

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      expect(result.current.isLoadingDashboards).toBe(true);

      await waitFor(() => expect(result.current.isLoadingDashboards).toBe(false));

      expect(result.current.dashboards.length).toBe(3);
    });
  });

  describe('Chart configuration', () => {
    it('preserves chart configuration in dashboards', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: sampleDashboards } });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      const dashboard = result.current.dashboards[0];
      expect(dashboard.configuration.charts).toContain('performance');
      expect(dashboard.configuration.charts).toContain('gradeDistribution');
      expect(dashboard.configuration.charts).toContain('scatter');
    });

    it('supports various chart types in configuration', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: sampleDashboards } });

      const queryClient = makeClient();
      const { result } = renderHook(() => useDashboards(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.dashboards.length).toBe(3));

      const fullDashboard = result.current.dashboards[2];
      const allCharts = [
        'performance',
        'gradeDistribution',
        'attendance',
        'trend',
        'pieChart',
        'scatter',
        'heatmap',
        'sankey',
        'treemap',
        'boxplot',
      ];

      allCharts.forEach((chart) => {
        expect(fullDashboard.configuration.charts).toContain(chart);
      });
    });
  });
});
