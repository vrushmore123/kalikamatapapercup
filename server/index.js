import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { loginAdmin, requireAdmin } from './auth.js';
import { Customer, Enquiry, Order, Product, SiteSettings } from './models.js';
import { enquirySchema, orderSchema, parseBody, productSchema } from './validation.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const publicProduct = product => ({ ...product.toObject(), id: product._id.toString() });

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));

app.get('/api/products', asyncRoute(async (_req, res) => {
  const products = await Product.find({ active: true }).sort({ capacityMl: 1 }).lean();
  res.json(products.map(product => ({ ...product, id: product._id.toString() })));
}));

app.get('/api/products/:slug', asyncRoute(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ ...product, id: product._id.toString() });
}));

app.get('/api/settings', asyncRoute(async (_req, res) => {
  const settings = await SiteSettings.findOne({ key: 'main' }).lean();
  res.json(settings || { businessName: 'Kalikamata Paper Products', ownerName: 'Savita More' });
}));

app.post('/api/orders', asyncRoute(async (req, res) => {
  const data = parseBody(orderSchema, req.body);
  const productIds = data.items.map(item => item.productId);
  const products = (await Product.find({ active: true })).filter(product => productIds.includes(product._id.toString()) || productIds.includes(String(product.capacityMl)));
  if (products.length !== new Set(productIds).size) return res.status(400).json({ message: 'One or more products are unavailable' });
  const customer = await Customer.findOneAndUpdate({ phone: data.customer.mobile }, {
    name: data.customer.name, phone: data.customer.mobile, email: data.customer.email, companyName: data.customer.company,
    address: data.customer.address, city: data.customer.city,
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const productMap = new Map(products.flatMap(product => [[product._id.toString(), product], [String(product.capacityMl), product]]));
  const items = data.items.map(item => {
    const product = productMap.get(item.productId);
    const unitPrice = product.priceType === 'per_pack' ? product.price : null;
    return { ...item, productId: product._id, unitPrice, subtotal: unitPrice === null ? null : unitPrice * item.packs };
  });
  const orderCount = await Order.countDocuments();
  const order = await Order.create({ orderNumber: `KPP-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`, customerId: customer._id, items, totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), totalPacks: items.reduce((sum, item) => sum + item.packs, 0), packingRequirement: items.map(item => item.packingRequirement).join(', '), deliveryAddress: data.customer.address, city: data.customer.city, preferredDeliveryDate: data.preferredDeliveryDate || undefined, paymentPreference: data.paymentPreference, notes: data.notes });
  res.status(201).json({ id: order._id, orderNumber: order.orderNumber, status: order.status });
}));

app.post('/api/enquiries', asyncRoute(async (req, res) => {
  const data = parseBody(enquirySchema, req.body);
  const enquiry = await Enquiry.create(data);
  res.status(201).json({ id: enquiry._id, status: enquiry.status });
}));

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  res.json({ token: await loginAdmin(email, password) });
}));

app.use('/api/admin', requireAdmin);
app.get('/api/admin/orders', asyncRoute(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const orders = await Order.find(filter).populate('customerId').populate('items.productId').sort({ createdAt: -1 }).lean();
  res.json(orders);
}));
app.patch('/api/admin/orders/:id', asyncRoute(async (req, res) => {
  const allowed = ['New', 'Contacted', 'Quote Sent', 'Confirmed', 'Processing', 'Ready', 'Dispatched', 'Delivered', 'Cancelled', 'On Hold'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status' });
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status, internalNotes: String(req.body.internalNotes || '').slice(0, 2000) }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}));
app.get('/api/admin/enquiries', asyncRoute(async (_req, res) => res.json(await Enquiry.find().sort({ createdAt: -1 }).lean())));
app.patch('/api/admin/enquiries/:id', asyncRoute(async (req, res) => {
  if (!['New', 'Contacted', 'Resolved', 'Closed'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid enquiry status' });
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status: req.body.status, internalNotes: String(req.body.internalNotes || '').slice(0, 2000) }, { new: true });
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
  res.json(enquiry);
}));
app.post('/api/admin/products', asyncRoute(async (req, res) => res.status(201).json(await Product.create(parseBody(productSchema, req.body)))));
app.patch('/api/admin/products/:id', asyncRoute(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, parseBody(productSchema.partial(), req.body), { new: true, runValidators: true }))));
app.delete('/api/admin/products/:id', asyncRoute(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true }))));
app.put('/api/admin/settings', asyncRoute(async (req, res) => res.json(await SiteSettings.findOneAndUpdate({ key: 'main' }, { ...req.body, key: 'main' }, { upsert: true, new: true, runValidators: true }))));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error', ...(err.details ? { details: err.details } : {}) });
});

if (!process.env.MONGODB_URI) console.warn('MONGODB_URI is empty. Add your MongoDB credentials to .env before starting the API.');
else mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(error => { console.error('MongoDB connection failed:', error.message); process.exitCode = 1; });

app.listen(port, () => console.log(`Kalikamata API listening on http://localhost:${port}`));
