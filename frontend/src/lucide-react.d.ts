declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  // Icon components - declare using shared IconProps
  export const AlertCircle: ComponentType<IconProps>;
  export const AlertTriangle: ComponentType<IconProps>;
  export const ArrowDown: ComponentType<IconProps>;
  export const Calendar: ComponentType<IconProps>;
  export const Check: ComponentType<IconProps>;
  export const Copy: ComponentType<IconProps>;
  export const Edit: ComponentType<IconProps>;
  export const Eye: ComponentType<IconProps>;
  export const Menu: ComponentType<IconProps>;
  export const Moon: ComponentType<IconProps>;
  export const Search: ComponentType<IconProps>;
  export const Settings: ComponentType<IconProps>;
  export const Sun: ComponentType<IconProps>;
  export const Trash: ComponentType<IconProps>;
  export const X: ComponentType<IconProps>;
}
