export type UUID = string;
export type ProductImage = { id: string; url: string; alt: string };
export type Variant = {
  id: UUID;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  minimumStock: number;
  priceCents?: number;
  image?: string;
  active: boolean;
};
export type SizeRow = {
  size: string;
  chest: string;
  length: string;
  waist?: string;
};
export type Product = {
  id: UUID;
  name: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  collectionIds: string[];
  tags: string[];
  brand: string;
  sku: string;
  description: string;
  material: string;
  details: string;
  priceCents: number;
  compareAtCents?: number;
  costCents?: number;
  pixPercent?: number;
  status: "active" | "draft" | "archived";
  featured: boolean;
  isNew: boolean;
  demo: boolean;
  images: ProductImage[];
  variants: Variant[];
  sizeGuide: SizeRow[];
  weightKg: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
  soldCount?: number;
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  active: boolean;
  parentId?: string;
};
export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
  featured: boolean;
  startsAt: string;
  endsAt: string;
};
export type Look = {
  id: string;
  name: string;
  image: string;
  productIds: string[];
  active: boolean;
};
export type SocialImage = {
  id: string;
  image: string;
  url: string;
  alt: string;
};
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  image: string;
  mobileImage: string;
  cta: string;
  href: string;
  position: "left" | "center" | "right";
  overlay: boolean;
  active: boolean;
  order: number;
  startsAt: string;
  endsAt: string;
};
export type StoreSettings = {
  name: string;
  logo: string;
  favicon: string;
  instagram: string;
  whatsapp: string;
  email: string;
  businessName: string;
  businessDocument: string;
  businessAddress: string;
  serviceHours: string;
  announcement: string;
  originCep: string;
  freeShippingFromCents: number;
  pixPercent: number;
  pickupEnabled: boolean;
  pickupName: string;
  preparationDays: number;
  shippingServices: string;
  seoTitle: string;
  seoDescription: string;
  gaId: string;
  metaPixelId: string;
  policies: Record<string, string>;
  policiesReviewed: boolean;
};
export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minimumCents: number;
  expiresAt: string;
  usageLimit: number;
  perCustomerLimit: number;
  productIds: string[];
  categoryIds: string[];
  active: boolean;
};
export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};
export type OrderLine = CartLine & {
  name: string;
  sku: string;
  size: string;
  color: string;
  image: string;
  unitCents: number;
  pixPercent: number;
  categoryId: string;
};
export type Address = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};
export type Customer = {
  name: string;
  email: string;
  phone: string;
  document?: string;
};
export type ShippingOption = {
  id: string;
  name: string;
  carrier: string;
  priceCents: number;
  days: number;
  demo: boolean;
};
export type ShippingQuote = {
  id: string;
  cartHash: string;
  cep: string;
  options: ShippingOption[];
  expiresAt: string;
};
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type OrderEvent = { at: string; status: OrderStatus; message: string };
export type Order = {
  id: string;
  number: string;
  accessHash: string;
  idempotencyKey: string;
  requestHash: string;
  customer: Customer;
  address: Address;
  items: OrderLine[];
  subtotalCents: number;
  discountCents: number;
  pixDiscountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string;
  shipping: ShippingOption;
  status: OrderStatus;
  inventoryState: "reserved" | "committed" | "released";
  paymentMethod: "pix" | "card";
  paymentId: string;
  paymentStatus: string;
  qrCode?: string;
  qrBase64?: string;
  paymentUrl?: string;
  trackingCode: string;
  history: OrderEvent[];
  demo: boolean;
  createdAt: string;
  updatedAt: string;
};
export type InventoryMovement = {
  id: string;
  variantId: string;
  productId: string;
  delta: number;
  reason: string;
  orderId?: string;
  actor: string;
  createdAt: string;
};
export type NewsletterEntry = {
  id: string;
  email: string;
  consentAt: string;
  source: string;
};
export type State = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  looks: Look[];
  social: SocialImage[];
  banners: Banner[];
  settings: StoreSettings;
  coupons: Coupon[];
  orders: Order[];
  movements: InventoryMovement[];
  quotes: ShippingQuote[];
  newsletter: NewsletterEntry[];
};
export type Catalog = Pick<
  State,
  | "products"
  | "categories"
  | "collections"
  | "looks"
  | "social"
  | "banners"
  | "settings"
> & { demo: boolean };
