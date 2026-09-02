# Kalikamata Paper Products

Vite React frontend with a Node.js / Express / MongoDB API.

## Configure MongoDB

1. Open `.env` and set `MONGODB_URI` to your MongoDB connection string.
2. Set `CLIENT_ORIGIN` to the frontend URL.
3. Set a long random `JWT_SECRET`.
4. Set `ADMIN_EMAIL`.
5. Create a bcrypt password hash and set `ADMIN_PASSWORD_HASH`:

```powershell
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1],12).then(console.log)" "replace-with-your-password"
```

Do not commit `.env`.

## Run

Install dependencies:

```powershell
npm install
```

Start the API:

```powershell
npm run server:dev
```

Seed the initial 55 ml, 65 ml and 85 ml products after MongoDB is configured:

```powershell
npm run seed
```

Start the frontend in another terminal:

```powershell
npm run dev
```

API base URL defaults to `http://localhost:4000/api`. To change it, create a frontend `.env.local` with:

```text
VITE_API_URL=http://localhost:4000/api
```

## API overview

Public:

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/settings`
- `POST /api/orders`
- `POST /api/enquiries`

Admin:

- `POST /api/admin/login`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id`
- `GET /api/admin/enquiries`
- `PATCH /api/admin/enquiries/:id`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id` (soft deactivation)
- `PUT /api/admin/settings`

Admin endpoints require `Authorization: Bearer <token>`.

## Current integration note

The frontend calls the API for products and order submission. When the API or MongoDB is unavailable, it keeps the catalogue and submitted request in LocalStorage so the UI remains usable during setup. Replace that fallback with server-only behavior before production deployment if strict persistence is required.
