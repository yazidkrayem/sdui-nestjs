import { randomUUID } from 'crypto';
import type {
  ComponentType,
  ComponentPropsMap,
  DescriptorNode,
  StyleProps,
} from '../schema/descriptor.schema';

// ── ComponentMeta ─────────────────────────────────────────────────────────────

export interface ComponentMeta<T extends ComponentType = ComponentType> {
  type: T;
  label: string;
  description: string;
  icon: string;
  isLeaf: boolean;
  allowedChildren: ComponentType[] | 'all';
  defaultProps: ComponentPropsMap[T];
  category?:
    | 'layout'
    | 'content'
    | 'data'
    | 'input'
    | 'action'
    | 'utility'
    | 'feedback';
}

// ── Registry ──────────────────────────────────────────────────────────────────

type Registry = { [T in ComponentType]: ComponentMeta<T> };

export const COMPONENT_REGISTRY: Registry = {
  // ── Root (screen wrapper — never shown in the palette) ────────────────────

  scaffold: {
    type: 'scaffold',
    label: 'Scaffold',
    description:
      'Screen root wrapper. Always the top-level node; never added manually.',
    icon: 'Layout',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: {},
  },

  // ── Layout ────────────────────────────────────────────────────────────────

  CONTAINER: {
    type: 'CONTAINER',
    label: 'Container',
    description:
      'Decoration box: background, padding, border-radius. Use COLUMN or ROW for layout.',
    icon: 'Square',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: { direction: 'vertical', scrollable: false, padding: 0 },
  },

  COLUMN: {
    type: 'COLUMN',
    label: 'Column',
    description: 'Vertical stack of children — maps to Flutter Column.',
    icon: 'AlignJustify',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: {
      padding: 0,
      gap: 8,
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
    },
  },

  ROW: {
    type: 'ROW',
    label: 'Row',
    description: 'Horizontal stack of children — maps to Flutter Row.',
    icon: 'AlignHorizontalDistributeCenter',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: {
      padding: 0,
      gap: 8,
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'center',
    },
  },

  STACK: {
    type: 'STACK',
    label: 'Stack',
    description: 'Z-axis overlay — children stack on top of each other.',
    icon: 'Layers',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: { alignment: 'topLeft' },
  },

  WRAP: {
    type: 'WRAP',
    label: 'Wrap',
    description:
      'Flow layout — children wrap to next line when there is no space.',
    icon: 'WrapText',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: { spacing: 8, runSpacing: 8, alignment: 'start' },
  },

  EXPANDED: {
    type: 'EXPANDED',
    label: 'Expanded',
    description:
      'Fills remaining space in a Row or Column — maps to Flutter Expanded.',
    icon: 'Maximize2',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: { flex: 1 },
  },

  SAFE_AREA: {
    type: 'SAFE_AREA',
    label: 'Safe Area',
    description: 'Pads children to avoid system UI (notch, home bar).',
    icon: 'Shield',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: { top: true, bottom: true, left: false, right: false },
  },

  SCROLL_VIEW: {
    type: 'SCROLL_VIEW',
    label: 'Scroll View',
    description:
      'Scrollable container — maps to Flutter SingleChildScrollView.',
    icon: 'ScrollText',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'layout',
    defaultProps: {
      direction: 'vertical',
      showScrollbar: false,
      physics: 'auto',
    },
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  APP_BAR: {
    type: 'APP_BAR',
    label: 'App Bar',
    description:
      'Top navigation bar with title, back button, and up to 3 action icons.',
    icon: 'PanelTop',
    isLeaf: true,
    allowedChildren: [],
    category: 'layout',
    defaultProps: {
      title: { en: 'Screen Title', ar: 'عنوان الشاشة' },
      backgroundColor: '#FFFFFF',
      titleColor: '#000000',
      titleFontSize: 18,
      titleFontWeight: '600',
      elevation: 1,
      centerTitle: true,
      showBackButton: true,
      backButtonColor: '#000000',
      backButtonIcon: 'arrow-left',
      actions: [],
    },
  },

  HEADER: {
    type: 'HEADER',
    label: 'Header',
    description:
      'Simpler top bar with title, optional subtitle and notification bell.',
    icon: 'Heading',
    isLeaf: true,
    allowedChildren: [],
    category: 'layout',
    defaultProps: {
      title: { en: 'Screen Title', ar: 'عنوان الشاشة' },
      showBackButton: false,
      showNotificationBell: false,
    },
  },

  TABS: {
    type: 'TABS',
    label: 'Tabs',
    description: 'Tabbed view where each tab holds its own set of components.',
    icon: 'LayoutDashboard',
    isLeaf: true,
    allowedChildren: [],
    category: 'layout',
    defaultProps: {
      tabs: [
        { label: { en: 'Tab 1', ar: 'التبويب 1' }, children: [] },
        { label: { en: 'Tab 2', ar: 'التبويب 2' }, children: [] },
      ],
      defaultIndex: 0,
    },
  },

  // ── Content ───────────────────────────────────────────────────────────────

  TEXT_BLOCK: {
    type: 'TEXT_BLOCK',
    label: 'Text',
    description: 'Styled text — headings, body copy, captions.',
    icon: 'Type',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      text: { en: 'Text goes here', ar: 'النص هنا' },
      variant: 'body',
      align: 'left',
    },
  },

  ICON: {
    type: 'ICON',
    label: 'Icon',
    description: 'Standalone icon from the Lucide icon set.',
    icon: 'Star',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: { name: 'Star', size: 24 },
  },

  AVATAR: {
    type: 'AVATAR',
    label: 'Avatar',
    description:
      'Circular image with initials fallback — maps to Flutter CircleAvatar.',
    icon: 'CircleUser',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      size: 48,
      backgroundColor: '#3b82f6',
      textColor: '#FFFFFF',
    },
  },

  CARD: {
    type: 'CARD',
    label: 'Card',
    description:
      'Generic data card sourced from any endpoint — image, title, subtitle, tap action.',
    icon: 'LayoutList',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      title: { en: 'Item Title', ar: 'عنوان العنصر' },
      subtitle: { en: 'Subtitle', ar: 'العنوان الفرعي' },
      imagePosition: 'top',
      elevation: 2,
      borderRadius: 12,
      padding: 12,
      dataSource: 'items',
      limit: 10,
    },
  },

  CAROUSEL: {
    type: 'CAROUSEL',
    label: 'Carousel',
    description: 'Horizontal swipeable cards sourced from any data endpoint.',
    icon: 'GalleryHorizontal',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      dataSource: 'banners',
      aspectRatio: '16:9',
      autoPlay: false,
      showIndicator: true,
    },
  },

  CHIP: {
    type: 'CHIP',
    label: 'Chip',
    description: 'Small interactive tag / filter pill.',
    icon: 'Tag',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      label: { en: 'Chip', ar: 'وسم' },
      variant: 'filled',
      selected: false,
    },
  },

  RICH_TEXT: {
    type: 'RICH_TEXT',
    label: 'Rich Text',
    description:
      'Multi-span text with per-span bold, italic, color, and tap actions.',
    icon: 'ALargeSmall',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      spans: [
        { text: { en: 'Hello ', ar: 'مرحبا ' } },
        { text: { en: 'world', ar: 'بالعالم' }, bold: true },
      ],
    },
  },

  BANNER: {
    type: 'BANNER',
    label: 'Banner',
    description: 'Full-width image banner with optional tap action.',
    icon: 'Image',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: { imageUrl: '', aspectRatio: '16:9' },
  },

  BADGE: {
    type: 'BADGE',
    label: 'Badge',
    description: 'Status pill — success, warning, error, info.',
    icon: 'BadgeCheck',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      label: { en: 'New', ar: 'جديد' },
      variant: 'default',
      shape: 'pill',
    },
  },

  DYNAMIC_TEXT: {
    type: 'DYNAMIC_TEXT',
    label: 'Dynamic Text',
    description:
      'Live-updating text — countdown, datetime, relative, currency, number.',
    icon: 'Timer',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: {
      source: 'item.endsAt',
      format: 'countdown',
      style: 'default',
    },
  },

  IMAGE: {
    type: 'IMAGE',
    label: 'Image',
    description: 'Standalone image with fit, border-radius, and tap action.',
    icon: 'ImageIcon',
    isLeaf: true,
    allowedChildren: [],
    category: 'content',
    defaultProps: { src: '', fit: 'cover' },
  },

  // ── Data ──────────────────────────────────────────────────────────────────

  PRODUCT_GRID: {
    type: 'PRODUCT_GRID',
    label: 'Product Grid',
    description: '2 or 3-column grid sourced from any data endpoint.',
    icon: 'LayoutGrid',
    isLeaf: true,
    allowedChildren: [],
    category: 'data',
    defaultProps: { columns: 2, dataSource: 'products/featured' },
  },

  LIST_FEED: {
    type: 'LIST_FEED',
    label: 'List Feed',
    description: 'Scrollable list sourced from any data endpoint.',
    icon: 'List',
    isLeaf: true,
    allowedChildren: [],
    category: 'data',
    defaultProps: { dataSource: 'items', limit: 20 },
  },

  // ── Input / Form ──────────────────────────────────────────────────────────

  FORM: {
    type: 'FORM',
    label: 'Form',
    description:
      'Collects inputs and fires a submit action. Add TEXT_INPUT, DROPDOWN, CHECKBOX, BUTTON as children.',
    icon: 'ClipboardList',
    isLeaf: false,
    allowedChildren: 'all',
    category: 'input',
    defaultProps: {
      submitAction: {
        type: 'dispatchEvent',
        payload: { event: 'form.submit' },
      },
      validationMode: 'onSubmit',
      submitLabel: { en: 'Submit', ar: 'إرسال' },
    },
  },

  TEXT_INPUT: {
    type: 'TEXT_INPUT',
    label: 'Text Input',
    description: 'Single-line text field bound to a form key.',
    icon: 'TextCursorInput',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'field',
      label: { en: 'Label', ar: 'التسمية' },
      placeholder: { en: 'Enter value…', ar: 'أدخل قيمة…' },
      type: 'text',
      required: false,
    },
  },

  PASSWORD_INPUT: {
    type: 'PASSWORD_INPUT',
    label: 'Password Input',
    description: 'Secure password field with visibility toggle.',
    icon: 'KeyRound',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'password',
      label: { en: 'Password', ar: 'كلمة المرور' },
      placeholder: { en: 'Enter password…', ar: 'أدخل كلمة المرور…' },
      required: true,
      showToggle: true,
    },
  },

  DROPDOWN: {
    type: 'DROPDOWN',
    label: 'Dropdown',
    description:
      'Select one option from a list — maps to Flutter DropdownButtonFormField.',
    icon: 'ChevronDown',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'selection',
      label: { en: 'Select', ar: 'اختر' },
      placeholder: { en: 'Choose…', ar: 'اختر…' },
      options: [
        { value: 'option1', label: { en: 'Option 1', ar: 'الخيار 1' } },
        { value: 'option2', label: { en: 'Option 2', ar: 'الخيار 2' } },
      ],
      required: false,
    },
  },

  CHECKBOX: {
    type: 'CHECKBOX',
    label: 'Checkbox',
    description: 'Boolean checkbox bound to a form key.',
    icon: 'CheckSquare',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'agree',
      label: { en: 'I agree to the terms', ar: 'أوافق على الشروط' },
      value: false,
    },
  },

  RADIO_GROUP: {
    type: 'RADIO_GROUP',
    label: 'Radio Group',
    description: 'Mutually-exclusive radio buttons bound to a form key.',
    icon: 'CircleDot',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'choice',
      label: { en: 'Choose one', ar: 'اختر واحدًا' },
      options: [
        { value: 'a', label: { en: 'Option A', ar: 'الخيار أ' } },
        { value: 'b', label: { en: 'Option B', ar: 'الخيار ب' } },
      ],
      direction: 'vertical',
    },
  },

  SWITCH: {
    type: 'SWITCH',
    label: 'Switch',
    description: 'Toggle switch — standalone or bound to a form key.',
    icon: 'ToggleLeft',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      label: { en: 'Enable notifications', ar: 'تفعيل الإشعارات' },
      value: false,
      activeColor: '#3b82f6',
    },
  },

  SLIDER: {
    type: 'SLIDER',
    label: 'Slider',
    description: 'Range slider — bound to a form key or standalone.',
    icon: 'SlidersHorizontal',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      label: { en: 'Amount', ar: 'المبلغ' },
      min: 0,
      max: 100,
      value: 50,
      activeColor: '#3b82f6',
      showLabel: true,
    },
  },

  DATE_PICKER: {
    type: 'DATE_PICKER',
    label: 'Date Picker',
    description: 'Date selection field — maps to Flutter showDatePicker.',
    icon: 'CalendarDays',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      bindTo: 'date',
      label: { en: 'Select date', ar: 'اختر التاريخ' },
      placeholder: { en: 'DD / MM / YYYY', ar: 'يوم / شهر / سنة' },
      required: false,
    },
  },

  SEARCH_BAR: {
    type: 'SEARCH_BAR',
    label: 'Search Bar',
    description: 'Search input with debounce and clear button.',
    icon: 'Search',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {
      placeholder: { en: 'Search…', ar: 'ابحث…' },
      debounceMs: 300,
      showClearButton: true,
      borderRadius: 24,
    },
  },

  // ── Action ────────────────────────────────────────────────────────────────

  BUTTON: {
    type: 'BUTTON',
    label: 'Button',
    description: 'Tappable button — variant, size, icon, custom colors.',
    icon: 'MousePointerClick',
    isLeaf: true,
    allowedChildren: [],
    category: 'action',
    defaultProps: {
      label: { en: 'Button', ar: 'زر' },
      variant: 'primary',
      size: 'md',
      action: { type: 'navigate', payload: {} },
      fullWidth: false,
    },
  },

  // ── Utility ───────────────────────────────────────────────────────────────

  SPACER: {
    type: 'SPACER',
    label: 'Spacer',
    description: 'Invisible fixed-size spacing.',
    icon: 'MoveVertical',
    isLeaf: true,
    allowedChildren: [],
    category: 'utility',
    defaultProps: { size: 'md' },
  },

  DIVIDER: {
    type: 'DIVIDER',
    label: 'Divider',
    description: 'Horizontal separator line.',
    icon: 'Minus',
    isLeaf: true,
    allowedChildren: [],
    category: 'utility',
    defaultProps: {},
  },

  STEPPER: {
    type: 'STEPPER',
    label: 'Stepper',
    description: 'Multi-step progress indicator — great for onboarding.',
    icon: 'ListChecks',
    isLeaf: true,
    allowedChildren: [],
    category: 'utility',
    defaultProps: {
      steps: [
        { label: { en: 'Step 1', ar: 'الخطوة 1' } },
        { label: { en: 'Step 2', ar: 'الخطوة 2' } },
        { label: { en: 'Step 3', ar: 'الخطوة 3' } },
      ],
      currentStep: 0,
      orientation: 'horizontal',
    },
  },

  PROGRESS_BAR: {
    type: 'PROGRESS_BAR',
    label: 'Progress Bar',
    description: 'Linear progress bar driven by a 0–100 value.',
    icon: 'BarChart2',
    isLeaf: true,
    allowedChildren: [],
    category: 'utility',
    defaultProps: { value: 50, animated: true, showLabel: false },
  },

  // ── Feedback ──────────────────────────────────────────────────────────────

  CIRCULAR_PROGRESS: {
    type: 'CIRCULAR_PROGRESS',
    label: 'Circular Progress',
    description: 'Circular indicator — determinate (0-100) or indeterminate.',
    icon: 'Loader',
    isLeaf: true,
    allowedChildren: [],
    category: 'feedback',
    defaultProps: { size: 48, strokeWidth: 4 },
  },

  SKELETON: {
    type: 'SKELETON',
    label: 'Skeleton',
    description: 'Shimmer loading placeholder — rectangle, circle, card, list.',
    icon: 'RectangleHorizontal',
    isLeaf: true,
    allowedChildren: [],
    category: 'feedback',
    defaultProps: {
      variant: 'rectangle',
      height: 80,
      borderRadius: 8,
      animated: true,
      count: 1,
    },
  },

  EMPTY_STATE: {
    type: 'EMPTY_STATE',
    label: 'Empty State',
    description: 'Icon + message + optional CTA for zero-data screens.',
    icon: 'PackageOpen',
    isLeaf: true,
    allowedChildren: [],
    category: 'feedback',
    defaultProps: {
      icon: 'PackageOpen',
      title: { en: 'Nothing here yet', ar: 'لا يوجد شيء هنا بعد' },
      message: { en: 'Check back later.', ar: 'تحقق لاحقاً.' },
    },
  },

  RATING: {
    type: 'RATING',
    label: 'Rating',
    description: 'Star rating widget — read-only display or interactive input.',
    icon: 'Star',
    isLeaf: true,
    allowedChildren: [],
    category: 'feedback',
    defaultProps: {
      value: 4,
      maxValue: 5,
      size: 24,
      activeColor: '#f59e0b',
      readOnly: false,
    },
  },

  IMAGE_UPLOAD: {
    type: 'IMAGE_UPLOAD',
    label: 'Image Upload',
    description:
      'Native file picker — picks images/files and uploads to storage.',
    icon: 'ImagePlus',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: { bindTo: 'images', maxFiles: 1 },
  },

  STRIPE_CARD_INPUT: {
    type: 'STRIPE_CARD_INPUT',
    label: 'Stripe Card Input',
    description:
      'Native Stripe card form (flutter_stripe CardFormField). Tokenisation fires on stripe.tokenizeCard event.',
    icon: 'CreditCard',
    isLeaf: true,
    allowedChildren: [],
    category: 'input',
    defaultProps: {},
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getComponentMeta<T extends ComponentType>(
  type: T,
): ComponentMeta<T> {
  return COMPONENT_REGISTRY[type];
}

export function createNode<T extends ComponentType>(
  type: T,
  idOverride?: string,
  stylesOverride?: StyleProps,
): DescriptorNode {
  const meta = getComponentMeta(type);
  return {
    id: idOverride ?? randomUUID(),
    type,
    props: meta.defaultProps,
    children: [],
    ...(stylesOverride !== undefined && { styles: stylesOverride }),
  };
}

export function getContainerTypes(): ComponentType[] {
  return (Object.values(COMPONENT_REGISTRY) as ComponentMeta[])
    .filter((m) => !m.isLeaf)
    .map((m) => m.type);
}

export function getLeafTypes(): ComponentType[] {
  return (Object.values(COMPONENT_REGISTRY) as ComponentMeta[])
    .filter((m) => m.isLeaf)
    .map((m) => m.type);
}

export function isChildAllowed(
  parent: ComponentType,
  child: ComponentType,
): boolean {
  const meta = getComponentMeta(parent);
  if (meta.isLeaf) return false;
  if (meta.allowedChildren === 'all') return true;
  return meta.allowedChildren.includes(child);
}

export interface PaletteEntry {
  type: ComponentType;
  label: string;
  description: string;
  icon: string;
  isLeaf: boolean;
  category?: string;
}

export function getPalette(): PaletteEntry[] {
  return (Object.values(COMPONENT_REGISTRY) as ComponentMeta[]).map((m) => ({
    type: m.type,
    label: m.label,
    description: m.description,
    icon: m.icon,
    isLeaf: m.isLeaf,
    category: m.category,
  }));
}
