import { z } from "zod";
const id = z.uuid();
const cents = z.number().int().min(0).max(100000000);
const text = z.string().trim();
export const imageUrl = text
  .max(1000)
  .refine(
    (v) =>
      v === "" ||
      /^\/images\/[a-zA-Z0-9_./-]+$/.test(v) ||
      /^\/api\/media\/[a-f0-9-]+\.webp$/.test(v) ||
      /^https:\/\/[a-zA-Z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/product-images\//.test(
        v,
      ),
    "Use uma imagem enviada pelo painel.",
  );
export const cartSchema = z
  .array(
    z
      .object({
        productId: id,
        variantId: id,
        quantity: z.number().int().min(1).max(20),
      })
      .strict(),
  )
  .min(1)
  .max(50);
export const addressSchema = z
  .object({
    cep: text.regex(/^\d{8}$/, "Informe um CEP com 8 números."),
    street: text.min(2).max(150),
    number: text.min(1).max(20),
    complement: text.max(100),
    district: text.min(2).max(100),
    city: text.min(2).max(100),
    state: text.regex(
      /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,
    ),
  })
  .strict();
export const customerSchema = z
  .object({
    name: text.min(3).max(120),
    email: z
      .email()
      .max(160)
      .transform((v) => v.toLowerCase()),
    phone: text.regex(/^\d{10,13}$/, "Informe um telefone válido."),
    document: text.regex(/^\d{11}$/).optional(),
  })
  .strict();
export const checkoutSchema = z
  .object({
    items: cartSchema,
    customer: customerSchema,
    address: addressSchema,
    quoteId: id,
    shippingId: text.min(1).max(50),
    coupon: text.max(40).default(""),
    method: z.enum(["pix", "card"]),
    idempotencyKey: id,
    accessToken: text.regex(/^[a-f0-9]{64}$/),
    card: z
      .object({
        token: text.min(10).max(200),
        paymentMethodId: text.min(1).max(30),
        installments: z.number().int().min(1).max(12),
        issuerId: text.max(30).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const quoteSchema = z
  .object({
    items: cartSchema,
    cep: text.regex(/^\d{8}$/, "CEP inválido. Informe 8 números."),
  })
  .strict();
export const variantSchema = z
  .object({
    id,
    sku: text.min(1).max(80),
    size: text.min(1).max(20),
    color: text.min(1).max(40),
    colorHex: text.regex(/^#[0-9a-fA-F]{6}$/),
    stock: z.number().int().min(0).max(100000),
    minimumStock: z.number().int().min(0).max(10000),
    priceCents: cents.optional(),
    image: imageUrl.optional(),
    active: z.boolean(),
  })
  .strict();
export const productSchema = z
  .object({
    id,
    name: text.min(2).max(150),
    slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
    categoryId: text.min(1).max(60),
    subcategory: text.max(60),
    collectionIds: z.array(text.max(60)).max(20),
    tags: z.array(text.max(30)).max(20),
    brand: text.max(60),
    sku: text.min(1).max(80),
    description: text.max(6000),
    material: text.max(500),
    details: text.max(2000),
    priceCents: cents.min(1),
    compareAtCents: cents.optional(),
    costCents: cents.optional(),
    pixPercent: z.number().min(0).max(30).optional(),
    status: z.enum(["active", "draft", "archived"]),
    featured: z.boolean(),
    isNew: z.boolean(),
    demo: z.boolean(),
    images: z
      .array(
        z
          .object({
            id: text.max(80),
            url: imageUrl,
            alt: text.min(2).max(200),
          })
          .strict(),
      )
      .max(12),
    variants: z.array(variantSchema).min(1).max(150),
    sizeGuide: z
      .array(
        z
          .object({
            size: text.max(20),
            chest: text.max(30),
            length: text.max(30),
            waist: text.max(30).optional(),
          })
          .strict(),
      )
      .max(30),
    weightKg: z.number().min(0).max(1000),
    widthCm: z.number().min(0).max(300),
    heightCm: z.number().min(0).max(300),
    lengthCm: z.number().min(0).max(300),
    seoTitle: text.max(80),
    seoDescription: text.max(180),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length,
    "SKUs de variação devem ser únicos.",
  )
  .refine(
    (p) =>
      new Set(p.variants.map((v) => `${v.size}|${v.color}`)).size ===
      p.variants.length,
    "Combinações de tamanho/cor devem ser únicas.",
  );
export const settingsSchema = z
  .object({
    name: text.min(2).max(80),
    logo: imageUrl,
    favicon: imageUrl,
    instagram: z
      .url()
      .refine(
        (v) =>
          new URL(v).hostname === "www.instagram.com" ||
          new URL(v).hostname === "instagram.com",
      ),
    whatsapp: text.max(20),
    email: z.union([z.email(), z.literal("")]),
    businessName: text.max(150),
    businessDocument: text.max(30),
    businessAddress: text.max(250),
    serviceHours: text.max(100),
    announcement: text.max(160),
    originCep: text.regex(/^\d{8}$|^$/),
    freeShippingFromCents: cents,
    pixPercent: z.number().min(0).max(30),
    pickupEnabled: z.boolean(),
    pickupName: text.max(150),
    preparationDays: z.number().int().min(0).max(30),
    shippingServices: text.regex(/^[0-9,]*$/),
    seoTitle: text.max(80),
    seoDescription: text.max(180),
    gaId: text.regex(/^G-[A-Z0-9]+$|^$/),
    metaPixelId: text.regex(/^\d+$|^$/),
    policies: z.record(text.max(40), text.max(20000)),
    policiesReviewed: z.boolean(),
  })
  .strict();
export const couponSchema = z
  .object({
    id,
    code: text
      .min(2)
      .max(40)
      .transform((v) => v.toUpperCase()),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1).max(10000000),
    minimumCents: cents,
    expiresAt: z.union([z.iso.datetime(), z.literal("")]),
    usageLimit: z.number().int().min(0),
    perCustomerLimit: z.number().int().min(0),
    productIds: z.array(id),
    categoryIds: z.array(text.max(60)),
    active: z.boolean(),
  })
  .strict()
  .refine(
    (c) => c.type !== "percent" || c.value <= 100,
    "Desconto percentual deve ser até 100%.",
  );
export const categorySchema = z
  .object({
    id: text.min(1).max(60),
    name: text.min(2).max(80),
    slug: text.regex(/^[a-z0-9-]+$/),
    image: imageUrl,
    description: text.max(1000),
    active: z.boolean(),
    parentId: text.max(60).optional(),
  })
  .strict();
export const collectionSchema = z
  .object({
    id: text.min(1).max(60),
    name: text.min(2).max(80),
    slug: text.regex(/^[a-z0-9-]+$/),
    description: text.max(2000),
    image: imageUrl,
    active: z.boolean(),
    featured: z.boolean(),
    startsAt: z.union([z.iso.datetime(), z.literal("")]),
    endsAt: z.union([z.iso.datetime(), z.literal("")]),
  })
  .strict();
export const bannerSchema = z
  .object({
    id: text.min(1).max(60),
    title: text.max(100),
    subtitle: text.max(200),
    eyebrow: text.max(50),
    image: imageUrl,
    mobileImage: imageUrl,
    cta: text.max(50),
    href: text.regex(/^\/(?!\/)[a-zA-Z0-9_/?=&%-]*$/),
    position: z.enum(["left", "center", "right"]),
    overlay: z.boolean(),
    active: z.boolean(),
    order: z.number().int().min(0),
    startsAt: z.union([z.iso.datetime(), z.literal("")]),
    endsAt: z.union([z.iso.datetime(), z.literal("")]),
  })
  .strict();
export const lookSchema = z
  .object({
    id: text.min(1).max(60),
    name: text.min(2).max(100),
    image: imageUrl,
    productIds: z.array(id).max(12),
    active: z.boolean(),
  })
  .strict();
export const socialSchema = z
  .object({
    id: text.min(1).max(60),
    image: imageUrl,
    url: z
      .url()
      .refine((v) =>
        ["instagram.com", "www.instagram.com"].includes(new URL(v).hostname),
      ),
    alt: text.min(2).max(200),
  })
  .strict();
