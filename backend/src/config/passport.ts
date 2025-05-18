import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { logger } from './logger';

export const configurePassport = (app: Express): void => {
  // Configure Passport authenticated session persistence
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Local Strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await User.findOne({ where: { email } });
          
          // If user doesn't exist
          if (!user) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          
          // If user doesn't have a password (Google sign-in only)
          if (!user.passwordHash) {
            return done(null, false, { message: 'No password set for this account. Use Google sign-in.' });
          }

          // Check password
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }

          // Success
          return done(null, user);
        } catch (err) {
          logger.error('Error during login:', err);
          return done(err);
        }
      }
    )
  );

  // JWT Strategy for token authentication
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
  };

  passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        // Find the user by id from JWT payload
        const user = await User.findByPk(payload.id);

        // If user doesn't exist
        if (!user) {
          return done(null, false);
        }

        // Success
        return done(null, user);
      } catch (err) {
        logger.error('Error during JWT authentication:', err);
        return done(err, false);
      }
    })
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Find or create user with Google ID
            let user = await User.findOne({ where: { googleId: profile.id } });

            // If user doesn't exist, try to find by email or create new
            if (!user && profile.emails && profile.emails.length > 0) {
              const email = profile.emails[0].value;
              
              // Check if user exists with this email
              user = await User.findOne({ where: { email } });
              
              if (!user) {
                // Create new user
                user = await User.create({
                  firstName: profile.name?.givenName || 'User',
                  lastName: profile.name?.familyName || '',
                  email,
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                });
              } else {
                // Update existing user with Google info
                user.googleId = profile.id;
                if (profile.photos?.[0]?.value) {
                  user.avatarUrl = profile.photos[0].value;
                }
                await user.save();
              }
            }

            return done(null, user);
          } catch (err) {
            logger.error('Error during Google authentication:', err);
            return done(err, false);
          }
        }
      )
    );
  } else {
    logger.warn('Google OAuth credentials not set. Google authentication is disabled.');
  }

  // Initialize Passport
  app.use(passport.initialize());
};

export const authMiddleware = {
  // JWT authentication middleware
  jwt: passport.authenticate('jwt', { session: false }),
  
  // Google authentication middleware
  google: passport.authenticate('google', { scope: ['profile', 'email'] }),
  
  // Google authentication callback middleware
  googleCallback: passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false
  }),
};
