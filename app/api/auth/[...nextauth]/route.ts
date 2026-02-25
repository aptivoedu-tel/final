import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "@/lib/mongodb/connection";
import { User } from "@/lib/mongodb/models";
import bcrypt from "bcryptjs";

// Ensure NEXTAUTH_SECRET exists. Vercel MUST have this set in Environment Variables.
const secret = process.env.NEXTAUTH_SECRET;

export const authOptions: AuthOptions = {
    // NextAuth secret for cookie encryption
    secret: secret,

    // Use JSON Web Tokens for session management
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60,   // 24 hours
    },

    // Cookie settings for better persistence on Vercel
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },

    // Authentication providers
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log(`[AUTH] Authorize attempt for: ${credentials?.email}`);

                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    await connectToDatabase();

                    // Simple email search (case insensitive)
                    const user = await User.findOne({
                        email: { $regex: new RegExp(`^${credentials.email.trim()}$`, 'i') }
                    }).lean() as any;

                    if (!user) {
                        console.log(`[AUTH] User not found: ${credentials.email}`);
                        return null;
                    }

                    if (!user.password) {
                        console.log(`[AUTH] User has no password (OAuth only): ${credentials.email}`);
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) {
                        console.log(`[AUTH] Invalid password for: ${credentials.email}`);
                        return null;
                    }

                    console.log(`[AUTH] Login success for: ${user.email} (Role: ${user.role})`);

                    return {
                        id: user.id || user._id.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("[AUTH] Authorize FATAL error:", error);
                    // Don't throw, just return null to show error on login page
                    return null;
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "not_set",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not_set",
        })
    ],

    // Custom callbacks to pass user info to the session
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        }
    },

    // Custom pages
    pages: {
        signIn: '/login',
        error: '/login', // Redirect back to login for all auth errors
    },

    // Enable debug logs in development
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
