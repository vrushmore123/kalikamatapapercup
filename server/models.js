import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  capacityMl: { type: Number, required: true, min: 1 },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },
  packingInfo: { type: String, default: '' },
  packingOptions: [{ type: Number, min: 1 }],
  price: { type: Number, default: null, min: 0 },
  priceType: { type: String, enum: ['quote', 'per_pack'], default: 'quote' },
  availability: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  minimumOrderQuantity: { type: Number, default: null, min: 1 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const customerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  companyName: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
}, { timestamps: true });

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  packs: { type: Number, required: true, min: 1 },
  packingRequirement: { type: String, required: true, trim: true },
  unitPrice: { type: Number, default: null, min: 0 },
  subtotal: { type: Number, default: null, min: 0 },
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: { type: [orderItemSchema], required: true, validate: v => v.length > 0 },
  status: { type: String, enum: ['New', 'Contacted', 'Quote Sent', 'Confirmed', 'Processing', 'Ready', 'Dispatched', 'Delivered', 'Cancelled', 'On Hold'], default: 'New' },
  totalQuantity: { type: Number, required: true, min: 1 },
  totalPacks: { type: Number, required: true, min: 1 },
  packingRequirement: { type: String, required: true, trim: true },
  deliveryAddress: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  preferredDeliveryDate: { type: Date },
  paymentPreference: { type: String, trim: true },
  notes: { type: String, trim: true },
  internalNotes: { type: String, trim: true },
}, { timestamps: true });

const enquirySchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['New', 'Contacted', 'Resolved', 'Closed'], default: 'New' },
  internalNotes: { type: String, trim: true },
}, { timestamps: true });

const siteSettingsSchema = new Schema({
  key: { type: String, unique: true, default: 'main' },
  businessName: String,
  ownerName: String,
  phone: String,
  whatsapp: String,
  email: String,
  address: String,
  city: String,
  mapUrl: String,
  logoUrl: String,
  businessHours: String,
}, { timestamps: true });

export const Product = model('Product', productSchema);
export const Customer = model('Customer', customerSchema);
export const Order = model('Order', orderSchema);
export const Enquiry = model('Enquiry', enquirySchema);
export const SiteSettings = model('SiteSettings', siteSettingsSchema);
