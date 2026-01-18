/**
 * Type definitions for event handlers and callbacks
 * Reduces reliance on 'any' types in test files and components
 */

// React event handlers
export type ChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
export type ClickHandler = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
export type FormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;
export type FocusHandler = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

// Generic callback types
export type VoidCallback = () => void;
export type DataCallback<T> = (data: T) => void;
export type AsyncCallback = () => Promise<void>;
export type AsyncDataCallback<T> = (data: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;

// Common UI callback patterns
export type StringCallback = (value: string) => void;
export type BooleanCallback = (value: boolean) => void;
export type NumberCallback = (value: number) => void;

// Form-specific types
export type FormData = Record<string, unknown>;
export type FormErrors = Record<string, string>;
export type FormTouched = Record<string, boolean>;

// API response handler
export type ApiResponseHandler<T> = (data: T, status: number) => void;
export type ApiErrorHandler = (error: Error, status?: number) => void;

// PerformanceObserver callback for performance tracking
export type PerformanceObserverCallback = (list: PerformanceEntryList) => void;
