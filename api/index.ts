import { app } from '../src/server/app.ts';

// Vercel Serverless Function entry point
// In Vercel, exporting the Express app as default automatically handles all incoming requests routed to /api/*
export default app;
