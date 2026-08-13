import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;

                // Check if user already exists
                const result = await pool.query(
                    "SELECT * FROM users WHERE email = $1",
                    [email]
                );

                let user;

                if (result.rows.length === 0) {
                    // Register new Google user
                    const newUser = await pool.query(
                        `INSERT INTO users
                        (name, email, password, role, provider)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *`,
                        [
                            name,
                            email,
                            "",
                            "USER",
                            "GOOGLE"
                        ]
                    );

                    user = newUser.rows[0];
                } else {
                    user = result.rows[0];
                }

                done(null, user);

            } catch (err) {
                done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [id]
        );

        done(null, result.rows[0]);

    } catch (err) {
        done(err, null);
    }
});

export default passport;