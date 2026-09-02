import { z } from 'zod';

const optionalEmail = z.string().trim().email().optional().or(z.literal(''));
const indianPhone = z.string().trim().regex(/^(?:\+91[ -]?)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number');

export const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    mobile: indianPhone,
    email: optionalEmail,
    company: z.string().trim().max(150).optional().or(z.literal('')),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6 digit pincode'),
  }),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    packs: z.number().int().positive(),
    packingRequirement: z.string().trim().min(2).max(100),
  })).min(1),
  preferredDeliveryDate: z.string().optional().or(z.literal('')),
  paymentPreference: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  termsAccepted: z.literal(true),
});

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: indianPhone,
  email: optionalEmail,
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(5).max(2000),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  capacityMl: z.number().int().positive(),
  description: z.string().trim().min(5).max(1000),
  imageUrl: z.string().url().optional().or(z.literal('')),
  packingInfo: z.string().trim().max(500).optional().or(z.literal('')),
  packingOptions: z.array(z.number().int().positive()).default([]),
  price: z.number().nonnegative().nullable().optional(),
  priceType: z.enum(['quote', 'per_pack']).default('quote'),
  availability: z.enum(['available', 'unavailable']).default('available'),
  minimumOrderQuantity: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
});

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
}
