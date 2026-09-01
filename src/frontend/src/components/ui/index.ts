// shadcn/ui components
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog';

export { Input } from './input';
export type { InputProps } from './input';

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from './select';

export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table';

export { Label } from './label';

export { Textarea } from './textarea';
export type { TextareaProps } from './textarea';

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField, useFormField } from './form';

// Skeleton loaders
export {
  Skeleton,
  StudentCardSkeleton,
  CourseCardSkeleton,
  TableRowSkeleton,
  DashboardStatSkeleton,
  ListSkeleton
} from './Skeleton';

// Custom components (keep our Modal for now)
export { default as Modal } from './Modal';
export type { ModalProps } from './Modal';
