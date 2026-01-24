// Type augmentation for lucide-react to support non-prefixed icon names
// This file re-exports all Lucide-prefixed icons with their plain names
// to maintain backward compatibility with our existing imports.

declare module 'lucide-react' {
  import type {
    ForwardRefExoticComponent,
    RefAttributes,
    SVGProps,
  } from 'react';

  export interface LucideProps extends Partial<Omit<SVGProps<SVGSVGElement>, 'ref'>> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;

  // Re-export all used icons with both prefixed and non-prefixed names
  export {
    LucideRefreshCw as RefreshCw,
    LucideCheckCircle as CheckCircle,
    LucideXCircle as XCircle,
    LucideMail as Mail,
    LucideAward as Award,
    LucideCheck as Check,
    LucideX as X,
    LucideClock as Clock,
    LucideAlertCircle as AlertCircle,
    LucideEye as Eye,
    LucideEyeOff as EyeOff,
    LucideAlertTriangle as AlertTriangle,
    LucideChevronDown as ChevronDown,
    LucideChevronRight as ChevronRight,
    LucideChevronUp as ChevronUp,
    LucideChevronLeft as ChevronLeft,
    LucideUser as User,
    LucideUserPlus as UserPlus,
    LucideUsers as Users,
    LucideSettings as Settings,
    LucideLogOut as LogOut,
    LucideLogIn as LogIn,
    LucideSave as Save,
    LucideDownload as Download,
    LucideUpload as Upload,
    LucideTrash as Trash,
    LucideTrash2 as Trash2,
    LucideEdit as Edit,
    LucidePenLine as Edit3,
    LucidePlus as Plus,
    LucideMinus as Minus,
    LucideSearch as Search,
    LucideFilter as Filter,
    LucideCalendar as Calendar,
    LucideBook as Book,
    LucideFileText as FileText,
    LucideHelpCircle as HelpCircle,
    LucidePower as Power,
    LucideActivity as Activity,
    LucideRotateCw as RotateCw,
    LucideHome as Home,
    LucideHeart as Heart,
    LucideGraduationCap as GraduationCap,
    LucideBookOpen as BookOpen,
    LucideClipboard as Clipboard,
    LucideBarChart as BarChart,
    LucideChartColumn as BarChart3,
    LucideTrendingUp as TrendingUp,
    LucideSun as Sun,
    LucideMoon as Moon,
    LucideGlobe as Globe,
    LucideArrowLeft as ArrowLeft,
    LucideArrowRight as ArrowRight,
    LucideBriefcase as Briefcase,
    LucideCalculator as Calculator,
    LucideCloudUpload as CloudUpload,
    LucideContainer as Container,
    LucideCpu as Cpu,
    LucideDatabase as Database,
    LucideExternalLink as ExternalLink,
    LucideFileCheck as FileCheck,
    LucideFileSpreadsheet as FileSpreadsheet,
    LucideFlower2 as Flower2,
    LucideLockKeyhole as LockKeyhole,
    LucideMessageCircle as MessageCircle,
    LucideMonitor as Monitor,
    LucidePackage as Package,
    LucidePalette as Palette,
    LucidePieChart as PieChart,
    LucideServer as Server,
    LucideShield as Shield,
    LucideShieldCheck as ShieldCheck,
    LucideSparkles as Sparkles,
    LucideStar as Star,
    LucideTarget as Target,
    LucideTerminal as Terminal,
    LucideUserCheck as UserCheck,
    LucideVideo as Video,
  } from 'lucide-react';
}
