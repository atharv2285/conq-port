import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// ✅ Read credentials from .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

// ✅ Configure Passport to use Google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        picture: profile.photos?.[0]?.value,
      };
      return done(null, user);
    }
  )
);

// 🔐 Save user to session
passport.serializeUser((user, done) => {
  done(null, user);
});

// 🔓 Load user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});
