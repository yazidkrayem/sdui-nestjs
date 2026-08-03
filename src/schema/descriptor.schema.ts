import { z } from 'zod';
import { LocalizedStringSchema } from './localized-string';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ComponentTypeSchema = z.enum([
  // Root (screen wrapper — always lowercase, never used as a child component)
  'scaffold',
  // Layout (containers)
  'CONTAINER',
  'COLUMN',
  'ROW',
  'STACK',
  'WRAP',
  'EXPANDED',
  'SAFE_AREA',
  'SCROLL_VIEW',
  // Navigation
  'APP_BAR',
  'HEADER',
  'TABS',
  // Content
  'TEXT_BLOCK',
  'ICON',
  'AVATAR',
  'CARD',
  'CAROUSEL',
  'CHIP',
  'RICH_TEXT',
  'BANNER',
  'BADGE',
  'DYNAMIC_TEXT',
  'IMAGE',
  // Data
  'PRODUCT_GRID',
  'LIST_FEED',
  // Input / Form
  'FORM',
  'TEXT_INPUT',
  'PASSWORD_INPUT',
  'DROPDOWN',
  'CHECKBOX',
  'RADIO_GROUP',
  'SWITCH',
  'SLIDER',
  'DATE_PICKER',
  'SEARCH_BAR',
  'IMAGE_UPLOAD',
  // Payment (native Stripe widget — renders flutter_stripe CardFormField)
  'STRIPE_CARD_INPUT',
  // Action
  'BUTTON',
  // Utility
  'SPACER',
  'DIVIDER',
  'STEPPER',
  'PROGRESS_BAR',
  // Feedback
  'CIRCULAR_PROGRESS',
  'SKELETON',
  'EMPTY_STATE',
  'RATING',
]);

export type ComponentType = z.infer<typeof ComponentTypeSchema>;

// ── Shared types ──────────────────────────────────────────────────────────────

const HexColorSchema = z
  .string()
  .regex(
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
    'Must be a hex colour (#RGB, #RRGGBB, or #RRGGBBAA)',
  );

const EdgeInsetsSchema = z.union([
  z.number().nonnegative(),
  z.object({
    top: z.number().nonnegative(),
    right: z.number().nonnegative(),
    bottom: z.number().nonnegative(),
    left: z.number().nonnegative(),
  }),
]);

export const StylePropsSchema = z
  .object({
    backgroundColor: HexColorSchema.optional(),
    borderRadius: z.number().nonnegative().optional(),
    margin: EdgeInsetsSchema.optional(),
    padding: EdgeInsetsSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    hidden: z.boolean().optional(),
    width: z.union([z.number().nonnegative(), z.string()]).optional(),
    height: z.union([z.number().nonnegative(), z.string()]).optional(),
    visibleWhen: z.string().optional(),
  })
  .strict();

export type StyleProps = z.infer<typeof StylePropsSchema>;

// ── Responsive breakpoints ────────────────────────────────────────────────────
// Optional per-node override set applied when screen width matches the range.
// Breakpoints are additive: base props apply first, then matching breakpoints
// are merged smallest-maxWidth-first so the narrowest range wins last.

export const ResponsiveBreakpointSchema = z
  .object({
    minWidth: z.number().nonnegative().optional(),
    maxWidth: z.number().nonnegative().optional(),
    props: z.record(z.string(), z.unknown()),
  })
  .refine((b) => b.minWidth !== undefined || b.maxWidth !== undefined, {
    message: 'At least one of minWidth or maxWidth must be set',
  });

export type ResponsiveBreakpoint = z.infer<typeof ResponsiveBreakpointSchema>;

// ── Analytics hooks ───────────────────────────────────────────────────────────
// Optional per-node analytics event map keyed by trigger name.
// Params values support $expr interpolation (resolved at fire time).
// Provider-agnostic: Flutter wires the concrete analytics backend.

export const AnalyticsEventSchema = z.object({
  event: z.string().min(1),
  params: z.record(z.string(), z.string()).optional(),
});

export const AnalyticsMapSchema = z.record(z.string(), AnalyticsEventSchema);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AnalyticsMap = z.infer<typeof AnalyticsMapSchema>;

// ── Data source ───────────────────────────────────────────────────────────────
// A typed data source descriptor for LIST_FEED, PRODUCT_GRID, and CAROUSEL.
// Backward-compatible: a plain string is still accepted (R4 migration path).
// Structured form enables Flutter renderers to make generic API calls without
// hardcoded domain knowledge. The endpoint field is a relative URL template;
// params are appended as query string. socketEvent, if provided, is a
// Socket.IO event name that triggers a UI refresh when received.
export const DataSourceDescriptorSchema = z.union([
  z.object({
    endpoint: z.string().optional(),
    params: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    refreshInterval: z.number().positive().optional(),
    socketEvent: z.string().optional(),
    // Template variables resolved at runtime from screen state: e.g. "{{auctionId}}"
    template: z.record(z.string(), z.string()).optional(),
  }),
  z.string(),
]);

export type DataSourceDescriptor = z.infer<typeof DataSourceDescriptorSchema>;

export const ActionDescriptorSchema = z
  .object({
    type: z.enum([
      'navigate',
      'navigateBack',
      'navigateReplace',
      'openModal',
      'dispatchEvent',
      'callApi',
      'externalUrl',
      'openUrl',
      'copyToClipboard',
      'share',
      'dismiss',
      'refresh',
      'setState',
      'submitForm',
    ]),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type ActionDescriptor = z.infer<typeof ActionDescriptorSchema>;

// ── Alignment helpers ─────────────────────────────────────────────────────────

const MainAxisAlignmentSchema = z
  .enum([
    'start',
    'center',
    'end',
    'spaceBetween',
    'spaceAround',
    'spaceEvenly',
  ])
  .optional();

const CrossAxisAlignmentSchema = z
  .enum(['start', 'center', 'end', 'stretch'])
  .optional();

// ── Scaffold (root) props ─────────────────────────────────────────────────────

const ScaffoldPropsSchema = z
  .object({
    background: HexColorSchema.optional(),
    safeAreaTop: z.boolean().optional(),
    safeAreaBottom: z.boolean().optional(),
    initAction: ActionDescriptorSchema.optional(),
    // Fired when the screen is popped/disposed (e.g. leave a socket room)
    disposeAction: ActionDescriptorSchema.optional(),
  })
  .strict();

// ── Layout props ──────────────────────────────────────────────────────────────

const ContainerPropsSchema = z
  .object({
    direction: z.enum(['vertical', 'horizontal']).optional(),
    scrollable: z.boolean().optional(),
    padding: z.number().nonnegative().optional(),
    gap: z.number().nonnegative().optional(),
    alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    justifyContent: z
      .enum(['start', 'center', 'end', 'between', 'around', 'evenly'])
      .optional(),
    backgroundColor: HexColorSchema.optional(),
    borderRadius: z.number().nonnegative().optional(),
  })
  .strict();

const ColumnPropsSchema = z
  .object({
    padding: z.number().nonnegative().optional(),
    gap: z.number().nonnegative().optional(),
    mainAxisAlignment: MainAxisAlignmentSchema,
    crossAxisAlignment: CrossAxisAlignmentSchema,
    mainAxisSize: z.enum(['max', 'min']).optional(),
    scrollable: z.boolean().optional(),
    backgroundColor: HexColorSchema.optional(),
    // expand:true → mainAxisSize.max; required when COLUMN fills Expanded parent
    expand: z.boolean().optional(),
    // flex:N → RowRenderer wraps this COLUMN in Flexible(flex:N); required for
    // TEXT_INPUT / PASSWORD_INPUT children which have 0 intrinsic width in a ROW
    flex: z.number().int().positive().optional(),
  })
  .strict();

const RowPropsSchema = z
  .object({
    padding: z.number().nonnegative().optional(),
    gap: z.number().nonnegative().optional(),
    mainAxisAlignment: MainAxisAlignmentSchema,
    crossAxisAlignment: z
      .enum(['start', 'center', 'end', 'stretch', 'baseline'])
      .optional(),
    mainAxisSize: z.enum(['max', 'min']).optional(),
    scrollable: z.boolean().optional(),
    backgroundColor: HexColorSchema.optional(),
    // expand:true → mainAxisSize.max so Flexible children (e.g. TEXT_INPUT columns)
    // receive real width allocations instead of collapsing to 0
    expand: z.boolean().optional(),
  })
  .strict();

const StackPropsSchema = z
  .object({
    alignment: z
      .enum([
        'topLeft',
        'topCenter',
        'topRight',
        'centerLeft',
        'center',
        'centerRight',
        'bottomLeft',
        'bottomCenter',
        'bottomRight',
      ])
      .optional(),
    fit: z.enum(['loose', 'expand', 'passthrough']).optional(),
    backgroundColor: HexColorSchema.optional(),
  })
  .strict();

const WrapPropsSchema = z
  .object({
    spacing: z.number().nonnegative().optional(),
    runSpacing: z.number().nonnegative().optional(),
    alignment: z
      .enum([
        'start',
        'center',
        'end',
        'spaceBetween',
        'spaceAround',
        'spaceEvenly',
      ])
      .optional(),
    runAlignment: z.enum(['start', 'center', 'end']).optional(),
    padding: z.number().nonnegative().optional(),
  })
  .strict();

const ExpandedPropsSchema = z
  .object({
    flex: z.number().int().positive().optional(),
  })
  .strict();

const SafeAreaPropsSchema = z
  .object({
    top: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    right: z.boolean().optional(),
    backgroundColor: HexColorSchema.optional(),
  })
  .strict();

const ScrollViewPropsSchema = z
  .object({
    direction: z.enum(['vertical', 'horizontal']).optional(),
    padding: z.number().nonnegative().optional(),
    showScrollbar: z.boolean().optional(),
    physics: z.enum(['auto', 'bouncing', 'clamping', 'never']).optional(),
    backgroundColor: HexColorSchema.optional(),
  })
  .strict();

// ── Navigation props ──────────────────────────────────────────────────────────

const AppBarActionSchema = z
  .object({
    id: z.string().min(1),
    icon: z.string().min(1),
    color: HexColorSchema,
    size: z.number().min(16).max(32),
    badge: z.enum(['none', 'notification_count', 'cart_count']).optional(),
    action: ActionDescriptorSchema.optional(),
  })
  .strict();

export type AppBarAction = z.infer<typeof AppBarActionSchema>;

const AppBarPropsSchema = z
  .object({
    title: LocalizedStringSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
    titleColor: HexColorSchema.optional(),
    titleFontSize: z.number().min(12).max(32).optional(),
    titleFontWeight: z.enum(['400', '500', '600', '700', '800']).optional(),
    elevation: z.number().min(0).max(8).optional(),
    centerTitle: z.boolean().optional(),
    showBackButton: z.boolean().optional(),
    backButtonColor: HexColorSchema.optional(),
    backButtonIcon: z.string().optional(),
    actions: z.array(AppBarActionSchema).max(3).optional(),
  })
  .strict();

const HeaderPropsSchema = z
  .object({
    title: LocalizedStringSchema.optional(),
    subtitle: LocalizedStringSchema.optional(),
    showBackButton: z.boolean().optional(),
    showNotificationBell: z.boolean().optional(),
    backgroundColor: HexColorSchema.optional(),
    titleColor: HexColorSchema.optional(),
  })
  .strict();

// ── Content props ─────────────────────────────────────────────────────────────

const TextBlockPropsSchema = z
  .object({
    text: LocalizedStringSchema.optional(),
    variant: z
      .enum(['h1', 'h2', 'h3', 'title', 'body', 'caption', 'label'])
      .optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    color: HexColorSchema.optional(),
    maxLines: z.number().int().positive().optional(),
    fontWeight: z.enum(['400', '500', '600', '700', '800']).optional(),
    flex: z.number().int().positive().optional(),
  })
  .strict();

const IconPropsSchema = z
  .object({
    name: z.string().min(1),
    size: z.number().positive().optional(),
    color: HexColorSchema.optional(),
    onTapAction: ActionDescriptorSchema.optional(),
  })
  .strict();

const AvatarPropsSchema = z
  .object({
    src: z.string().optional(),
    name: LocalizedStringSchema.optional(),
    size: z.number().positive().optional(),
    backgroundColor: HexColorSchema.optional(),
    textColor: HexColorSchema.optional(),
    borderColor: HexColorSchema.optional(),
    borderWidth: z.number().nonnegative().optional(),
    onTapAction: ActionDescriptorSchema.optional(),
  })
  .strict();

const CardPropsSchema = z
  .object({
    title: LocalizedStringSchema.optional(),
    subtitle: LocalizedStringSchema.optional(),
    imageUrl: z.string().optional(),
    imagePosition: z.enum(['top', 'start', 'end', 'background']).optional(),
    elevation: z.number().min(0).max(24).optional(),
    borderRadius: z.number().nonnegative().optional(),
    backgroundColor: HexColorSchema.optional(),
    padding: z.number().nonnegative().optional(),
    dataSource: DataSourceDescriptorSchema.optional(),
    limit: z.number().int().positive().optional(),
    onTapAction: ActionDescriptorSchema.optional(),
    flex: z.number().int().positive().optional(),
  })
  .strict();

const CarouselPropsSchema = z
  .object({
    dataSource: DataSourceDescriptorSchema.optional(),
    aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional(),
    autoPlay: z.boolean().optional(),
    autoPlayIntervalMs: z.number().positive().optional(),
    showIndicator: z.boolean().optional(),
    indicatorColor: HexColorSchema.optional(),
    onTapAction: ActionDescriptorSchema.optional(),
  })
  .strict();

const ChipPropsSchema = z
  .object({
    label: LocalizedStringSchema.optional(),
    icon: z.string().optional(),
    selected: z.boolean().optional(),
    variant: z.enum(['filled', 'outlined', 'elevated']).optional(),
    backgroundColor: HexColorSchema.optional(),
    textColor: HexColorSchema.optional(),
    onTapAction: ActionDescriptorSchema.optional(),
  })
  .strict();

const RichTextSpanSchema = z.object({
  text: LocalizedStringSchema,
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  color: HexColorSchema.optional(),
  fontSize: z.number().positive().optional(),
  action: ActionDescriptorSchema.optional(),
});

const RichTextPropsSchema = z
  .object({
    spans: z.array(RichTextSpanSchema).optional(),
  })
  .strict();

const BannerPropsSchema = z
  .object({
    imageUrl: z.string().optional(),
    linkAction: ActionDescriptorSchema.optional(),
    aspectRatio: z.enum(['16:9', '4:3', '1:1']).optional(),
  })
  .strict();

const BadgePropsSchema = z
  .object({
    label: LocalizedStringSchema.optional(),
    variant: z
      .enum(['default', 'success', 'warning', 'error', 'info'])
      .optional(),
    icon: z.string().optional(),
    shape: z.enum(['rounded', 'pill']).optional(),
  })
  .strict();

const DataBindingSchema = z
  .object({
    source: z.enum(['socket', 'state', 'http']),
    event: z.string().optional(),
    path: z.string(),
    fallback: z.string().optional(),
  })
  .strict();

export type DataBinding = z.infer<typeof DataBindingSchema>;

const DynamicTextPropsSchema = z
  .object({
    source: z.string().optional(),
    format: z
      .enum(['countdown', 'datetime', 'relative', 'currency', 'number'])
      .optional(),
    prefix: LocalizedStringSchema.optional(),
    suffix: LocalizedStringSchema.optional(),
    style: z.enum(['large', 'default', 'minimal']).optional(),
    color: HexColorSchema.optional(),
    fontSize: z.number().min(8).max(48).optional(),
    // Symbol used by format: 'currency' (e.g. 'SAR ', '$', '€'). Defaults to
    // 'SAR ' on the client since this is a single-currency (SAR) app.
    currencySymbol: z.string().max(8).optional(),
    updateIntervalMs: z.number().positive().optional(),
    dataBinding: DataBindingSchema.optional(),
    fallback: z.string().optional(),
    fontWeight: z.enum(['400', '500', '600', '700', '800']).optional(),
  })
  .strict();

const ImagePropsSchema = z
  .object({
    src: z.string().optional(),
    alt: LocalizedStringSchema.optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    fit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
    borderRadius: z.number().nonnegative().optional(),
    onTapAction: ActionDescriptorSchema.optional(),
  })
  .strict();

// ── Data props ────────────────────────────────────────────────────────────────

const ProductGridPropsSchema = z
  .object({
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
    dataSource: DataSourceDescriptorSchema.optional(),
    limit: z.number().int().positive().optional(),
    onTapAction: ActionDescriptorSchema.optional(),
    crossAxisSpacing: z.number().nonnegative().optional(),
    mainAxisSpacing: z.number().nonnegative().optional(),
    childAspectRatio: z.number().positive().optional(),
    padding: z.number().nonnegative().optional(),
    emptyStateText: LocalizedStringSchema.optional(),
  })
  .strict();

const ListFeedPropsSchema = z
  .object({
    dataSource: DataSourceDescriptorSchema.optional(),
    limit: z.number().int().positive().optional(),
    emptyStateText: LocalizedStringSchema.optional(),
    onTapAction: ActionDescriptorSchema.optional(),
    // Controls which Flutter card widget renders each item. Defaults to 'auction'
    // when the endpoint contains 'auctions', 'notification' otherwise.
    // Deprecated in favour of itemTemplate — kept for backward compat.
    cardType: z.enum(['auction', 'notification', 'payment_method']).optional(),
    // Server-defined item layout — a DescriptorNode tree rendered per list item.
    // Template expressions {{item.field}} are resolved from the fetched item data.
    // When present, cardType is ignored.
    itemTemplate: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ── Input / Form props ────────────────────────────────────────────────────────

const FormPropsSchema = z
  .object({
    submitAction: ActionDescriptorSchema.optional(),
    validationMode: z.enum(['onSubmit', 'onChange']).optional(),
    submitLabel: LocalizedStringSchema.optional(),
    loadingLabel: LocalizedStringSchema.optional(),
    errorBehavior: z.enum(['toast', 'inline']).optional(),
    formId: z.string().optional(),
    // Enables platform autofill grouping (AutofillGroup) for login forms
    useAutofill: z.boolean().optional(),
    // Field pre-fill map — values support {{state.*}} template expressions
    initialValues: z.record(z.string(), z.string()).optional(),
  })
  .strict();

// Visual styling for text-entry fields (TEXT_INPUT / PASSWORD_INPUT). Kept
// separate from the node-level `styles` (which decorates the outer box) because
// these map to the field's TextStyle + InputDecoration on the mobile side, so
// input appearance can be changed from the builder without an app release.
const InputStyleSchema = z
  .object({
    textColor: HexColorSchema.optional(), // colour of the typed text
    fontSize: z.number().min(8).max(48).optional(),
    fontWeight: z.enum(['400', '500', '600', '700']).optional(),
    placeholderColor: HexColorSchema.optional(), // hint text colour
    fillColor: HexColorSchema.optional(), // field background (implies filled)
    borderColor: HexColorSchema.optional(),
    focusBorderColor: HexColorSchema.optional(),
    borderWidth: z.number().min(0).max(8).optional(),
    borderRadius: z.number().min(0).max(48).optional(),
  })
  .strict();

const TextInputPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    placeholder: LocalizedStringSchema.optional(),
    type: z.enum(['text', 'email', 'phone', 'number', 'search']).optional(),
    required: z.boolean().optional(),
    prefixIcon: z.string().optional(),
    suffixIcon: z.string().optional(),
    helperText: LocalizedStringSchema.optional(),
    minLength: z.number().int().positive().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().optional(),
    errorMessage: LocalizedStringSchema.optional(),
    // Persist the value in flutter_secure_storage under this key (login autofill)
    storage: z.string().optional(),
    maxLines: z.number().int().positive().optional(),
    style: InputStyleSchema.optional(),
  })
  .strict();

const PasswordInputPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    placeholder: LocalizedStringSchema.optional(),
    required: z.boolean().optional(),
    showToggle: z.boolean().optional(),
    helperText: LocalizedStringSchema.optional(),
    errorMessage: LocalizedStringSchema.optional(),
    minLength: z.number().int().positive().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().optional(),
    // Persist the value in flutter_secure_storage under this key (login autofill)
    storage: z.string().optional(),
    // Uses AutofillHints.newPassword so password managers offer generation
    newPassword: z.boolean().optional(),
    style: InputStyleSchema.optional(),
  })
  .strict();

const SelectOptionSchema = z.object({
  value: z.string(),
  label: LocalizedStringSchema,
});

const DropdownPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    placeholder: LocalizedStringSchema.optional(),
    options: z.array(SelectOptionSchema).optional(),
    required: z.boolean().optional(),
    helperText: LocalizedStringSchema.optional(),
    errorMessage: LocalizedStringSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
  })
  .strict();

const CheckboxPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    value: z.boolean().optional(),
    required: z.boolean().optional(),
    activeColor: HexColorSchema.optional(),
  })
  .strict();

const RadioGroupPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    options: z.array(SelectOptionSchema).optional(),
    required: z.boolean().optional(),
    activeColor: HexColorSchema.optional(),
    direction: z.enum(['horizontal', 'vertical']).optional(),
  })
  .strict();

const SwitchPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    value: z.boolean().optional(),
    activeColor: HexColorSchema.optional(),
    onChangeAction: ActionDescriptorSchema.optional(),
  })
  .strict();

const SliderPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    value: z.number().optional(),
    divisions: z.number().int().positive().optional(),
    activeColor: HexColorSchema.optional(),
    showLabel: z.boolean().optional(),
  })
  .strict();

const DatePickerPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    placeholder: LocalizedStringSchema.optional(),
    format: z.string().optional(),
    required: z.boolean().optional(),
    helperText: LocalizedStringSchema.optional(),
  })
  .strict();

const SearchBarPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    placeholder: LocalizedStringSchema.optional(),
    debounceMs: z.number().int().nonnegative().optional(),
    onSearchAction: ActionDescriptorSchema.optional(),
    showClearButton: z.boolean().optional(),
    backgroundColor: HexColorSchema.optional(),
    borderRadius: z.number().nonnegative().optional(),
  })
  .strict();

const ImageUploadPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    label: LocalizedStringSchema.optional(),
    maxFiles: z.number().int().positive().optional(),
    accept: z.array(z.string()).optional(),
    uploadUrl: z.string().optional(),
    uploadField: z.string().optional(),
    // File key referenced by submitForm's fileKeys[] (defaults to node id)
    key: z.string().optional(),
    hint: LocalizedStringSchema.optional(),
    multiple: z.boolean().optional(),
    maxSizeMB: z.number().positive().optional(),
    variant: z.enum(['grid', 'list', 'avatar']).optional(),
    allowRemove: z.boolean().optional(),
  })
  .strict();

// Native Stripe card input — renders flutter_stripe CardFormField.
// The form submit button should dispatch { event: 'stripe.tokenizeCard' }.
const StripeCardInputPropsSchema = z.object({}).strict();

// ── Action props ──────────────────────────────────────────────────────────────

const ButtonPropsSchema = z
  .object({
    label: LocalizedStringSchema.optional(),
    variant: z
      .enum(['primary', 'secondary', 'outline', 'ghost', 'destructive'])
      .optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    action: ActionDescriptorSchema.optional(),
    fullWidth: z.boolean().optional(),
    disabled: z.boolean().optional(),
    loading: z.boolean().optional(),
    iconLeft: z.string().optional(),
    iconRight: z.string().optional(),
    backgroundColor: HexColorSchema.optional(),
    textColor: HexColorSchema.optional(),
    borderRadius: z.enum(['sm', 'md', 'xl', 'full']).optional(),
    validate: z.boolean().optional(),
    flex: z.number().int().positive().optional(),
  })
  .strict();

// ── Utility props ─────────────────────────────────────────────────────────────

const SpacerPropsSchema = z
  .object({ size: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl']).optional() })
  .strict();

const DividerPropsSchema = z
  .object({
    color: HexColorSchema.optional(),
    thickness: z.number().positive().optional(),
    flex: z.number().int().positive().optional(),
  })
  .strict();

const StepperPropsSchema = z
  .object({
    steps: z
      .array(
        z.object({
          label: LocalizedStringSchema.optional(),
          icon: z.string().optional(),
        }),
      )
      .optional(),
    currentStep: z.number().int().nonnegative().optional(),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    activeColor: HexColorSchema.optional(),
    completedColor: HexColorSchema.optional(),
    inactiveColor: HexColorSchema.optional(),
  })
  .strict();

const ProgressBarPropsSchema = z
  .object({
    value: z.number().min(0).max(100).optional(),
    color: HexColorSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
    height: z.number().positive().optional(),
    animated: z.boolean().optional(),
    showLabel: z.boolean().optional(),
    label: LocalizedStringSchema.optional(),
    borderRadius: z.number().nonnegative().optional(),
  })
  .strict();

// ── Feedback props ────────────────────────────────────────────────────────────

const CircularProgressPropsSchema = z
  .object({
    value: z.number().min(0).max(100).optional(),
    color: HexColorSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
    size: z.number().positive().optional(),
    strokeWidth: z.number().positive().optional(),
    showLabel: z.boolean().optional(),
    indeterminate: z.boolean().optional(),
  })
  .strict();

const SkeletonPropsSchema = z
  .object({
    variant: z.enum(['rectangle', 'circle', 'text', 'card', 'list']).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    borderRadius: z.number().nonnegative().optional(),
    count: z.number().int().positive().optional(),
    animated: z.boolean().optional(),
  })
  .strict();

const EmptyStatePropsSchema = z
  .object({
    icon: z.string().optional(),
    title: LocalizedStringSchema.optional(),
    message: LocalizedStringSchema.optional(),
    actionLabel: LocalizedStringSchema.optional(),
    action: ActionDescriptorSchema.optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();

const RatingPropsSchema = z
  .object({
    bindTo: z.string().optional(),
    value: z.number().min(0).optional(),
    maxValue: z.number().int().positive().optional(),
    allowHalf: z.boolean().optional(),
    size: z.number().positive().optional(),
    activeColor: HexColorSchema.optional(),
    readOnly: z.boolean().optional(),
    label: LocalizedStringSchema.optional(),
  })
  .strict();

// ── Recursive node schema ─────────────────────────────────────────────────────

type DescriptorNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  children: DescriptorNode[];
  styles?: StyleProps;
  responsive?: ResponsiveBreakpoint[];
  analytics?: AnalyticsMap;
  minSdkVersion?: number;
};

const lazyNode: z.ZodType<DescriptorNode> = z.lazy(() => NodeSchema);

const TabsPropsSchema = z
  .object({
    tabs: z
      .array(
        z.object({
          label: LocalizedStringSchema.optional(),
          icon: z.string().optional(),
          children: z.array(lazyNode),
        }),
      )
      .optional(),
    defaultIndex: z.number().int().nonnegative().optional(),
  })
  .strict();

// helper to keep discriminated union entries concise
// Renderer version this node requires. If the client's renderer version is
// lower, the mobile app degrades that node to a SKELETON placeholder instead
// of rendering it (mobile/lib/features/sdui/widgets/sdui_node.dart). Declared
// here so it is a first-class, validated field rather than an implicit one
// that only survived because the node object strips (not rejects) unknowns.
const minSdkVersionField = z.number().int().positive().optional();

function leaf<T extends ComponentType>(type: T, propsSchema: z.ZodTypeAny) {
  return z.object({
    id: z.string().min(1),
    type: z.literal(type),
    props: propsSchema,
    children: z.tuple([]),
    styles: StylePropsSchema.optional(),
    responsive: z.array(ResponsiveBreakpointSchema).optional(),
    analytics: AnalyticsMapSchema.optional(),
    minSdkVersion: minSdkVersionField,
  });
}

function container<T extends ComponentType>(
  type: T,
  propsSchema: z.ZodTypeAny,
) {
  return z.object({
    id: z.string().min(1),
    type: z.literal(type),
    props: propsSchema,
    children: z.array(lazyNode),
    styles: StylePropsSchema.optional(),
    responsive: z.array(ResponsiveBreakpointSchema).optional(),
    analytics: AnalyticsMapSchema.optional(),
    minSdkVersion: minSdkVersionField,
  });
}

// ── Discriminated union ───────────────────────────────────────────────────────

const NodeSchema: z.ZodType<DescriptorNode> = z.lazy(() =>
  z
    .discriminatedUnion('type', [
      // Root
      container('scaffold', ScaffoldPropsSchema),
      // Layout
      container('CONTAINER', ContainerPropsSchema),
      container('COLUMN', ColumnPropsSchema),
      container('ROW', RowPropsSchema),
      container('STACK', StackPropsSchema),
      container('WRAP', WrapPropsSchema),
      container('EXPANDED', ExpandedPropsSchema),
      container('SAFE_AREA', SafeAreaPropsSchema),
      container('SCROLL_VIEW', ScrollViewPropsSchema),
      // Navigation
      leaf('APP_BAR', AppBarPropsSchema),
      leaf('HEADER', HeaderPropsSchema),
      // TABS is a leaf: tab items are defined in props.tabs[], not in children[].
      // The canvas editor also treats TABS as a leaf (no "Add child" button).
      // Any children[] on a TABS node are ignored by the Flutter renderer.
      leaf('TABS', TabsPropsSchema),
      // Content
      leaf('TEXT_BLOCK', TextBlockPropsSchema),
      leaf('ICON', IconPropsSchema),
      leaf('AVATAR', AvatarPropsSchema),
      leaf('CARD', CardPropsSchema),
      leaf('CAROUSEL', CarouselPropsSchema),
      leaf('CHIP', ChipPropsSchema),
      leaf('RICH_TEXT', RichTextPropsSchema),
      leaf('BANNER', BannerPropsSchema),
      leaf('BADGE', BadgePropsSchema),
      leaf('DYNAMIC_TEXT', DynamicTextPropsSchema),
      leaf('IMAGE', ImagePropsSchema),
      // Data
      leaf('PRODUCT_GRID', ProductGridPropsSchema),
      leaf('LIST_FEED', ListFeedPropsSchema),
      // Input / Form
      container('FORM', FormPropsSchema),
      leaf('TEXT_INPUT', TextInputPropsSchema),
      leaf('PASSWORD_INPUT', PasswordInputPropsSchema),
      leaf('DROPDOWN', DropdownPropsSchema),
      leaf('CHECKBOX', CheckboxPropsSchema),
      leaf('RADIO_GROUP', RadioGroupPropsSchema),
      leaf('SWITCH', SwitchPropsSchema),
      leaf('SLIDER', SliderPropsSchema),
      leaf('DATE_PICKER', DatePickerPropsSchema),
      leaf('SEARCH_BAR', SearchBarPropsSchema),
      leaf('IMAGE_UPLOAD', ImageUploadPropsSchema),
      leaf('STRIPE_CARD_INPUT', StripeCardInputPropsSchema),
      // Action
      leaf('BUTTON', ButtonPropsSchema),
      // Utility
      leaf('SPACER', SpacerPropsSchema),
      leaf('DIVIDER', DividerPropsSchema),
      leaf('STEPPER', StepperPropsSchema),
      leaf('PROGRESS_BAR', ProgressBarPropsSchema),
      // Feedback
      leaf('CIRCULAR_PROGRESS', CircularProgressPropsSchema),
      leaf('SKELETON', SkeletonPropsSchema),
      leaf('EMPTY_STATE', EmptyStatePropsSchema),
      leaf('RATING', RatingPropsSchema),
    ])
    .transform((v) => v as DescriptorNode),
);

export { NodeSchema };
export type { DescriptorNode };

// ── Top-level descriptor ──────────────────────────────────────────────────────

export const DescriptorSchema = z
  .object({ version: z.number().int().positive().default(1), root: lazyNode })
  .strict();

export type Descriptor = z.infer<typeof DescriptorSchema>;

// ── Prop schemas map ──────────────────────────────────────────────────────────

export const PROP_SCHEMAS = {
  // Root
  scaffold: ScaffoldPropsSchema,
  // Layout
  CONTAINER: ContainerPropsSchema,
  COLUMN: ColumnPropsSchema,
  ROW: RowPropsSchema,
  STACK: StackPropsSchema,
  WRAP: WrapPropsSchema,
  EXPANDED: ExpandedPropsSchema,
  SAFE_AREA: SafeAreaPropsSchema,
  SCROLL_VIEW: ScrollViewPropsSchema,
  // Navigation
  APP_BAR: AppBarPropsSchema,
  HEADER: HeaderPropsSchema,
  TABS: TabsPropsSchema,
  // Content
  TEXT_BLOCK: TextBlockPropsSchema,
  ICON: IconPropsSchema,
  AVATAR: AvatarPropsSchema,
  CARD: CardPropsSchema,
  CAROUSEL: CarouselPropsSchema,
  CHIP: ChipPropsSchema,
  RICH_TEXT: RichTextPropsSchema,
  BANNER: BannerPropsSchema,
  BADGE: BadgePropsSchema,
  DYNAMIC_TEXT: DynamicTextPropsSchema,
  IMAGE: ImagePropsSchema,
  // Data
  PRODUCT_GRID: ProductGridPropsSchema,
  LIST_FEED: ListFeedPropsSchema,
  // Input / Form
  FORM: FormPropsSchema,
  TEXT_INPUT: TextInputPropsSchema,
  PASSWORD_INPUT: PasswordInputPropsSchema,
  DROPDOWN: DropdownPropsSchema,
  CHECKBOX: CheckboxPropsSchema,
  RADIO_GROUP: RadioGroupPropsSchema,
  SWITCH: SwitchPropsSchema,
  SLIDER: SliderPropsSchema,
  DATE_PICKER: DatePickerPropsSchema,
  SEARCH_BAR: SearchBarPropsSchema,
  IMAGE_UPLOAD: ImageUploadPropsSchema,
  STRIPE_CARD_INPUT: StripeCardInputPropsSchema,
  // Action
  BUTTON: ButtonPropsSchema,
  // Utility
  SPACER: SpacerPropsSchema,
  DIVIDER: DividerPropsSchema,
  STEPPER: StepperPropsSchema,
  PROGRESS_BAR: ProgressBarPropsSchema,
  // Feedback
  CIRCULAR_PROGRESS: CircularProgressPropsSchema,
  SKELETON: SkeletonPropsSchema,
  EMPTY_STATE: EmptyStatePropsSchema,
  RATING: RatingPropsSchema,
} as const satisfies Record<ComponentType, z.ZodTypeAny>;

export type PropSchemasMap = typeof PROP_SCHEMAS;

// ── Inferred prop types ───────────────────────────────────────────────────────

export type ScaffoldProps = z.infer<typeof ScaffoldPropsSchema>;
export type ContainerProps = z.infer<typeof ContainerPropsSchema>;
export type ColumnProps = z.infer<typeof ColumnPropsSchema>;
export type RowProps = z.infer<typeof RowPropsSchema>;
export type StackProps = z.infer<typeof StackPropsSchema>;
export type WrapProps = z.infer<typeof WrapPropsSchema>;
export type ExpandedProps = z.infer<typeof ExpandedPropsSchema>;
export type SafeAreaProps = z.infer<typeof SafeAreaPropsSchema>;
export type ScrollViewProps = z.infer<typeof ScrollViewPropsSchema>;
export type AppBarProps = z.infer<typeof AppBarPropsSchema>;
export type HeaderProps = z.infer<typeof HeaderPropsSchema>;
export type TabsProps = z.infer<typeof TabsPropsSchema>;
export type TextBlockProps = z.infer<typeof TextBlockPropsSchema>;
export type IconProps = z.infer<typeof IconPropsSchema>;
export type AvatarProps = z.infer<typeof AvatarPropsSchema>;
export type CardProps = z.infer<typeof CardPropsSchema>;
export type CarouselProps = z.infer<typeof CarouselPropsSchema>;
export type ChipProps = z.infer<typeof ChipPropsSchema>;
export type RichTextProps = z.infer<typeof RichTextPropsSchema>;
export type BannerProps = z.infer<typeof BannerPropsSchema>;
export type BadgeProps = z.infer<typeof BadgePropsSchema>;
export type DynamicTextProps = z.infer<typeof DynamicTextPropsSchema>;
export type ImageProps = z.infer<typeof ImagePropsSchema>;
export type ProductGridProps = z.infer<typeof ProductGridPropsSchema>;
export type ListFeedProps = z.infer<typeof ListFeedPropsSchema>;
export type FormProps = z.infer<typeof FormPropsSchema>;
export type TextInputProps = z.infer<typeof TextInputPropsSchema>;
export type PasswordInputProps = z.infer<typeof PasswordInputPropsSchema>;
export type DropdownProps = z.infer<typeof DropdownPropsSchema>;
export type CheckboxProps = z.infer<typeof CheckboxPropsSchema>;
export type RadioGroupProps = z.infer<typeof RadioGroupPropsSchema>;
export type SwitchProps = z.infer<typeof SwitchPropsSchema>;
export type SliderProps = z.infer<typeof SliderPropsSchema>;
export type DatePickerProps = z.infer<typeof DatePickerPropsSchema>;
export type SearchBarProps = z.infer<typeof SearchBarPropsSchema>;
export type ImageUploadProps = z.infer<typeof ImageUploadPropsSchema>;
export type StripeCardInputProps = z.infer<typeof StripeCardInputPropsSchema>;
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
export type SpacerProps = z.infer<typeof SpacerPropsSchema>;
export type DividerProps = z.infer<typeof DividerPropsSchema>;
export type StepperProps = z.infer<typeof StepperPropsSchema>;
export type ProgressBarProps = z.infer<typeof ProgressBarPropsSchema>;
export type CircularProgressProps = z.infer<typeof CircularProgressPropsSchema>;
export type SkeletonProps = z.infer<typeof SkeletonPropsSchema>;
export type EmptyStateProps = z.infer<typeof EmptyStatePropsSchema>;
export type RatingProps = z.infer<typeof RatingPropsSchema>;

export type ComponentPropsMap = {
  scaffold: ScaffoldProps;
  CONTAINER: ContainerProps;
  COLUMN: ColumnProps;
  ROW: RowProps;
  STACK: StackProps;
  WRAP: WrapProps;
  EXPANDED: ExpandedProps;
  SAFE_AREA: SafeAreaProps;
  SCROLL_VIEW: ScrollViewProps;
  APP_BAR: AppBarProps;
  HEADER: HeaderProps;
  TABS: TabsProps;
  TEXT_BLOCK: TextBlockProps;
  ICON: IconProps;
  AVATAR: AvatarProps;
  CARD: CardProps;
  CAROUSEL: CarouselProps;
  CHIP: ChipProps;
  RICH_TEXT: RichTextProps;
  BANNER: BannerProps;
  BADGE: BadgeProps;
  DYNAMIC_TEXT: DynamicTextProps;
  IMAGE: ImageProps;
  PRODUCT_GRID: ProductGridProps;
  LIST_FEED: ListFeedProps;
  FORM: FormProps;
  TEXT_INPUT: TextInputProps;
  PASSWORD_INPUT: PasswordInputProps;
  DROPDOWN: DropdownProps;
  CHECKBOX: CheckboxProps;
  RADIO_GROUP: RadioGroupProps;
  SWITCH: SwitchProps;
  SLIDER: SliderProps;
  DATE_PICKER: DatePickerProps;
  SEARCH_BAR: SearchBarProps;
  IMAGE_UPLOAD: ImageUploadProps;
  STRIPE_CARD_INPUT: StripeCardInputProps;
  BUTTON: ButtonProps;
  SPACER: SpacerProps;
  DIVIDER: DividerProps;
  STEPPER: StepperProps;
  PROGRESS_BAR: ProgressBarProps;
  CIRCULAR_PROGRESS: CircularProgressProps;
  SKELETON: SkeletonProps;
  EMPTY_STATE: EmptyStateProps;
  RATING: RatingProps;
};
