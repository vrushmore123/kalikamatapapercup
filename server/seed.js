import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from './models.js';

const products = [
  { name: '55 ml Paper Cup', slug: '55ml-paper-cup', capacityMl: 55, description: 'A compact paper cup for everyday serving requirements.', active: true },
  { name: '65 ml Paper Cup', slug: '65ml-paper-cup', capacityMl: 65, description: 'A versatile paper cup for everyday serving requirements.', active: true },
  { name: '85 ml Paper Cup', slug: '85ml-paper-cup', capacityMl: 85, description: 'A larger paper cup for beverage serving requirements.', active: true },
];

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in .env');
await mongoose.connect(process.env.MONGODB_URI);
for (const product of products) await Product.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true, setDefaultsOnInsert: true });
console.log(`Seeded ${products.length} products`);
await mongoose.disconnect();
