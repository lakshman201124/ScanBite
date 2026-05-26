import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderCategoriesSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0) })),
});

export const createItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  price: z.number().positive().refine(v => Number.isFinite(v), { message: "Invalid price" }),
  mrp: z.number().positive().optional().nullable(),
  image_url: z.string().url().optional().or(z.literal("")),
  food_type: z.enum(["veg", "non_veg", "egg", "vegan"]).default("veg"),
  is_available: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  prep_time_minutes: z.number().int().min(1).max(180).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const reorderItemsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0) })),
});

export const createCustomizationSchema = z.object({
  name: z.string().min(1).max(100),
  group_type: z.enum(["single", "multi", "required"]).default("single"),
  is_required: z.boolean().optional().default(false),
  options: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1).max(100),
      price_delta: z.number().min(0),
    })
  ).min(1).max(20),
});

export const createTableSchema = z.object({
  table_number: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(50).default(4),
});

export const updateTableSchema = z.object({
  table_number: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  status: z.enum(["available", "occupied", "reserved"]).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateCustomizationInput = z.infer<typeof createCustomizationSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
