declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  // Icon components - declare as any to avoid exhaustive listing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const AlertCircle: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const AlertTriangle: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ArrowDown: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Calendar: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Check: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Copy: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Edit: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Eye: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Menu: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Moon: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Search: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Settings: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Sun: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Trash: ComponentType<IconProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const X: ComponentType<IconProps>;
}
