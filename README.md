# Axonlink Admin Frontend

## Connect to the API locally

1. Copy `.env.example` to `.env`.
2. Start the backend on port `5040`.
3. Run `npm install`, then `npm run dev`.
4. Open the Vite URL, normally `http://localhost:5173`.

## Railway environment variable

Set this on the frontend service and redeploy the frontend:

```env
VITE_ADMIN_API_URL=https://your-admin-backend.up.railway.app
```

The browser communicates only with the backend API. PostgreSQL credentials and
JWT secrets belong exclusively on the backend service.
