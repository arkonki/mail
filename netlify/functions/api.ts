import serverless from 'serverless-http';
import app from '../../server';

// This file wraps the existing Express app for use with Netlify Functions.
// The 'handler' export is the entry point for the serverless function.
export const handler = serverless(app);
