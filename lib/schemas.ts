import { z } from "zod";

export const ApiBrandSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  brandImage: z.string().nullable(),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const ApiCategorySchema = z.object({
  id: z.string(),
  categoryName: z.string(),
  parentCategoryId: z.string().nullable(),
  subcategories: z.array(z.object({ id: z.string(), categoryName: z.string() })).optional(),
});

export const ApiProductSchema = z.object({
  id: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  brandId: z.string(),
  categoryId: z.string(),
  price: z.coerce.number(),
  contentValue: z.coerce.number(),
  contentUnit: z.enum(["gr", "kg", "ml", "lts", "un"]),
  packQuantity: z.coerce.number(),
  stock: z.coerce.number().optional(),
  available: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  brand: ApiBrandSchema.optional().nullable(),
  category: ApiCategorySchema.optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PaginatedProductsSchema = z.object({
  items: z.array(ApiProductSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const PaginatedBrandsSchema = z.object({
  items: z.array(ApiBrandSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const BrandsApiResponseSchema = z.object({
  status: z.string(),
  data: z.array(ApiBrandSchema),
});

export const BrandsPaginatedApiResponseSchema = z.object({
  status: z.string(),
  data: PaginatedBrandsSchema,
});

export const ProductsApiResponseSchema = z.object({
  status: z.string(),
  data: PaginatedProductsSchema,
});

export const CategoriesApiResponseSchema = z.object({
  status: z.string(),
  data: z.array(ApiCategorySchema),
});

export type ApiBrand = z.infer<typeof ApiBrandSchema>;
export type ApiCategory = z.infer<typeof ApiCategorySchema>;
export type ApiProduct = z.infer<typeof ApiProductSchema>;
export type PaginatedBrands = z.infer<typeof PaginatedBrandsSchema>;
export type PaginatedProducts = z.infer<typeof PaginatedProductsSchema>;

// Users
export const ApiUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastname: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  documentType: z.string().nullable(),
  documentNumber: z.string().nullable(),
  role: z.enum(["ADMIN", "EMPLOYEE", "CLIENT"]),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ApiUser = z.infer<typeof ApiUserSchema>;

// Zones
export const ApiZoneSchema = z.object({
  id: z.string(),
  zoneName: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ApiZone = z.infer<typeof ApiZoneSchema>;

// User schedules
export const ApiScheduleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  zoneId: z.string(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  zone: z.object({ id: z.string(), zoneName: z.string() }).optional(),
});
export type ApiSchedule = z.infer<typeof ApiScheduleSchema>;

// Banners
export const ApiBannerSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  mediaUrl: z.string(),
  mediaType: z.enum(["image", "video"]),
  displayOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ApiBanner = z.infer<typeof ApiBannerSchema>;

// Announcements
export const ApiAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ApiAnnouncement = z.infer<typeof ApiAnnouncementSchema>;

// Punto Fiesta — Announcements
export const PFAnnouncementSchema = z.object({
  id: z.string(),
  type: z.enum(['POPUP', 'CAROUSEL']),
  imageUrl: z.string(),
  title: z.string().nullable(),
  isActive: z.boolean(),
  displayOrder: z.number(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type PFAnnouncement = z.infer<typeof PFAnnouncementSchema>;

// Punto Fiesta — Settings (datos de pago)
export const PFSettingsSchema = z.object({
  id: z.string(),
  accountHolderName: z.string(),
  cuil: z.string(),
  alias: z.string(),
  cbu: z.string(),
  phone: z.string(),
  address: z.string(),
  instagramUrl: z.string(),
  facebookUrl: z.string(),
  whatsappUrl: z.string(),
});
export type PFSettings = z.infer<typeof PFSettingsSchema>;

// Punto Fiesta — Mensajes de WhatsApp (plantillas)
export const PFMessageTemplateSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  body: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type PFMessageTemplate = z.infer<typeof PFMessageTemplateSchema>;

// Punto Fiesta — WhatsApp connection status
export const PFWhatsappStatusSchema = z.object({
  ready: z.boolean(),
  lastReadyAt: z.string().nullable(),
  lastDisconnectedAt: z.string().nullable(),
  lastDisconnectReason: z.string().nullable(),
});
export type PFWhatsappStatus = z.infer<typeof PFWhatsappStatusSchema>;

// Punto Fiesta — Categories
export const PFCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  active: z.boolean(),
  imageUrl: z.string().nullable(),
  featuredOnHome: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PFCategoriesApiResponseSchema = z.object({
  status: z.string(),
  data: z.array(PFCategorySchema),
});

export type PFCategory = z.infer<typeof PFCategorySchema>;

// Punto Fiesta — Products
export const PFProductSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.coerce.number(),
  imageUrl: z.string().nullable(),
  categoryId: z.string(),
  stock: z.coerce.number(),
  active: z.boolean(),
  featured: z.boolean(),
  category: PFCategorySchema.optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PFProductsApiResponseSchema = z.object({
  status: z.string(),
  data: z.array(PFProductSchema),
});

export type PFProduct = z.infer<typeof PFProductSchema>;

// Punto Fiesta — Orders
export const PFOrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.coerce.number(),
  product: z
    .object({ id: z.string(), name: z.string(), imageUrl: z.string().nullable() })
    .optional()
    .nullable(),
});

export const PFOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  clientName: z.string(),
  clientSurname: z.string(),
  clientEmail: z.string(),
  clientPhone: z.string(),
  clientDni: z.string(),
  clientCuil: z.string(),
  clientAddress: z.string(),
  deliveryMethod: z.enum(["PICKUP", "DELIVERY"]),
  total: z.coerce.number(),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "PAID"]),
  note: z.string().nullable(),
  items: z.array(PFOrderItemSchema).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PaginatedPFOrdersSchema = z.object({
  items: z.array(PFOrderSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const PFOrdersApiResponseSchema = z.object({
  status: z.string(),
  data: PaginatedPFOrdersSchema,
});

export type PFOrderItem = z.infer<typeof PFOrderItemSchema>;
export type PFOrder = z.infer<typeof PFOrderSchema>;
export type PaginatedPFOrders = z.infer<typeof PaginatedPFOrdersSchema>;

// Punto Fiesta — Customers
export const PFCustomerSchema = z.object({
  id: z.string(),
  dni: z.string(),
  name: z.string(),
  surname: z.string(),
  email: z.string(),
  phone: z.string(),
  cuil: z.string(),
  address: z.string(),
  firstOrderAt: z.string(),
  lastOrderAt: z.string(),
  ordersCount: z.number().optional(),
  totalSpent: z.coerce.number().optional(),
  orders: z.array(PFOrderSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PaginatedPFCustomersSchema = z.object({
  items: z.array(PFCustomerSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const PFCustomersApiResponseSchema = z.object({
  status: z.string(),
  data: PaginatedPFCustomersSchema,
});

export type PFCustomer = z.infer<typeof PFCustomerSchema>;
export type PaginatedPFCustomers = z.infer<typeof PaginatedPFCustomersSchema>;
