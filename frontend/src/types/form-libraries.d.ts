declare module 'react-hook-form' {
  import type * as React from 'react'

  export type FieldValues = Record<string, unknown>
  export type FieldPath<TFieldValues extends FieldValues = FieldValues> = Extract<keyof TFieldValues, string>
  export type FieldError = {
    type?: string
    message?: string
    ref?: { name?: string }
  }
  export type FieldErrors<TFieldValues extends FieldValues = FieldValues> = Partial<
    Record<keyof TFieldValues, FieldError>
  >

  export type ResolverResult<TFieldValues extends FieldValues = FieldValues> = {
    values: TFieldValues
    errors: FieldErrors<TFieldValues>
  }

  export type Resolver<TFieldValues extends FieldValues = FieldValues, TContext = any> = (
    values: TFieldValues,
    context: TContext | undefined,
    options: { names?: string[] }
  ) => Promise<ResolverResult<TFieldValues>> | ResolverResult<TFieldValues>

  export type RegisterReturn = {
    name: string
    onChange: (...event: unknown[]) => void
    onBlur: () => void
    ref: (instance: unknown) => void
  }

  export type SubmitHandler<TFieldValues extends FieldValues = FieldValues> = (
    data: TFieldValues
  ) => void | Promise<void>

  export type SubmitErrorHandler<TFieldValues extends FieldValues = FieldValues> = (
    errors: FieldErrors<TFieldValues>
  ) => void

  export type UseFormProps<TFieldValues extends FieldValues = FieldValues, TContext = any> = {
    defaultValues?: Partial<TFieldValues>
    resolver?: Resolver<TFieldValues, TContext>
    mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'all'
    shouldFocusError?: boolean
  }

  export type Control<
    TFieldValues extends FieldValues = FieldValues,
    TContext = any,
    TTransformedValues = TFieldValues
  > = any

  export type UseFormReturn<
    TFieldValues extends FieldValues = FieldValues,
    TContext = any,
    TTransformedValues = TFieldValues
  > = {
    control: Control<TFieldValues, TContext, TTransformedValues>
    register: (name: FieldPath<TFieldValues>) => RegisterReturn
    handleSubmit: (
      onValid: SubmitHandler<TFieldValues>,
      onInvalid?: SubmitErrorHandler<TFieldValues>
    ) => (e?: React.FormEvent) => Promise<void>
    formState: {
      errors: FieldErrors<TFieldValues>
      isSubmitting: boolean
      isValid: boolean
      dirtyFields: Partial<Record<keyof TFieldValues, boolean>>
      touchedFields: Partial<Record<keyof TFieldValues, boolean>>
    }
    getFieldState: (
      name: FieldPath<TFieldValues>,
      formState: { errors: FieldErrors<TFieldValues> }
    ) => {
      error?: FieldError
      invalid?: boolean
    }
    reset: (values?: Partial<TFieldValues>) => void
    setValue: (
      name: FieldPath<TFieldValues>,
      value: any,
      options?: Record<string, boolean>
    ) => void
    getValues: () => TFieldValues
    watch: (name?: FieldPath<TFieldValues>) => any
    trigger: (name?: FieldPath<TFieldValues>) => Promise<boolean>
    clearErrors: (name?: FieldPath<TFieldValues>) => void
  }

  export type ControllerRenderProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    onChange: (...event: any[]) => void
    onBlur: () => void
    value: any
    disabled?: boolean
    name: TName
    ref: (instance: any) => void
  }

  export type ControllerFieldState = {
    invalid: boolean
    isTouched: boolean
    isDirty: boolean
    isValidating: boolean
    error?: FieldError
  }

  export type UseControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues
  > = {
    name: TName
    control?: Control<TFieldValues, any, TTransformedValues>
    rules?: Record<string, any>
    shouldUnregister?: boolean
    defaultValue?: any
    disabled?: boolean
    exact?: boolean
  }

  export type UseControllerReturn<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    field: ControllerRenderProps<TFieldValues, TName>
    fieldState: ControllerFieldState
    formState: {
      errors: FieldErrors<TFieldValues>
      isSubmitting: boolean
      isValid: boolean
    }
  }

  export type ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues
  > = UseControllerProps<TFieldValues, TName, TTransformedValues> & {
    render: (props: UseControllerReturn<TFieldValues, TName>) => React.ReactElement
  }

  export function useForm<
    TFieldValues extends FieldValues = FieldValues,
    TContext = any,
    TTransformedValues = TFieldValues
  >(props?: UseFormProps<TFieldValues, TContext>): UseFormReturn<TFieldValues, TContext, TTransformedValues>

  export const FormProvider: React.FC<{ children?: React.ReactNode }>
  export function useFormContext<TFieldValues extends FieldValues = FieldValues>(): UseFormReturn<TFieldValues>
  export const Controller: <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues
  >(
    props: ControllerProps<TFieldValues, TName, TTransformedValues>
  ) => React.ReactElement
}

declare module '@hookform/resolvers/zod' {
  import type { Resolver } from 'react-hook-form'

  export function zodResolver(schema: any): Resolver<any, any>
}

declare module 'framer-motion' {
  import type * as React from 'react'

  export type Variants = Record<string, any>
  export const motion: any
  export const AnimatePresence: React.FC<{
    children?: React.ReactNode
    mode?: 'sync' | 'wait' | 'popLayout'
  }>
}
