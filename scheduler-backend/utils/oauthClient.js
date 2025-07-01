import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

// Dynamically select the correct redirect URI based on environment
const redirectUri = process.env.NODE_ENV === 'production'
  ? process.env.GOOGLE_REDIRECT_URI
  : process.env.LOCAL_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

export default oauth2Client;
