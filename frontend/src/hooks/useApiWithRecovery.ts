import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { useErrorRecovery, type ErrorRetryStrategy } from './useErrorRecovery';

interface UseApiQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  errorRecovery?: {
    enabled?: boolean;
    strategy?: ErrorRetryStrategy;
    maxRetries?: number;
    backoffMs?: number;
  };
}

interface UseApiMutationOptions<TData, TError = Error, TVariables = unknown> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  errorRecovery?: {
    enabled?: boolean;
    strategy?: ErrorRetryStrategy;
    maxRetries?: number;
    backoffMs?: number;
  };
}

/**
 * Enhanced useQuery wrapper with error recovery
 * 
 * Automatically retries failed queries using exponential backoff strategy
 * 
 * @example
 * ```tsx
 * const { data, error } = useApiQuery(
 *   ['students'],
 *   () => studentsAPI.getAll(),
 *   { errorRecovery: { strategy: 'backoff', maxRetries: 3 } }
 * );
 * ```
 */
export function useApiQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: UseApiQueryOptions<TData, TError>
) {
  const {
    errorRecovery,
    onSuccess,
    ...queryOptions
  } = options || {};

  const {
    handleError,
    reset
  } = useErrorRecovery({
    strategy: errorRecovery?.strategy || 'backoff',
    maxRetries: errorRecovery?.maxRetries || 3,
    backoffMs: errorRecovery?.backoffMs || 1000,
  });

  const maxRetries = errorRecovery?.maxRetries ?? 3;
  const backoffMs = errorRecovery?.backoffMs ?? 1000;

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        reset(); // Reset error state on new attempt
        const result = await queryFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        if (errorRecovery?.enabled !== false) {
          handleError(error as Error);
        }
        throw error;
      }
    },
    retry: (failureCount) => {
      if (errorRecovery?.enabled === false || errorRecovery?.strategy === 'none') {
        return false;
      }
      return failureCount < maxRetries;
    },
    retryDelay: () => backoffMs,
    ...queryOptions,
  });

  return query;
}

/**
 * Enhanced useMutation wrapper with error recovery
 * 
 * Automatically retries failed mutations using exponential backoff strategy
 * 
 * @example
 * ```tsx
 * const createStudent = useApiMutation(
 *   (data) => studentsAPI.create(data),
 *   {
 *     onSuccess: () => queryClient.invalidateQueries(['students']),
 *     errorRecovery: { strategy: 'backoff', maxRetries: 2 }
 *   }
 * );
 * ```
 */
export function useApiMutation<TData = unknown, TError = Error, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TError, TVariables>
) {
  const {
    errorRecovery,
    ...mutationOptions
  } = options || {};

  const {
    handleError,
    retry,
    reset
  } = useErrorRecovery({
    strategy: errorRecovery?.strategy || 'immediate',
    maxRetries: errorRecovery?.maxRetries || 2,
    backoffMs: errorRecovery?.backoffMs || 1000,
  });

  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= (errorRecovery?.maxRetries || 2); attempt++) {
        try {
          reset(); // Reset error state on new attempt
          const result = await mutationFn(variables);
          return result;
        } catch (error) {
          lastError = error as Error;
          
          if (errorRecovery?.enabled !== false) {
            handleError(lastError);
            
            // Try to retry if not the last attempt
            if (attempt < (errorRecovery?.maxRetries || 2)) {
              await retry();
            }
          } else {
            throw error;
          }
        }
      }
      
      // If we exhausted all retries, throw the last error
      throw lastError;
    },
    ...mutationOptions,
  });

  return mutation;
}

export default { useApiQuery, useApiMutation };
