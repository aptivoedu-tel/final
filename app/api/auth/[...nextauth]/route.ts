import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/models/User";
import bcrypt from "bcryptjs";

// Extremely robust setup for Vercel
// NextAuth REQUIRED a secret in production. We use a fallback if the env var is missing.
const secret = process.env.NEXTAUTH_SECRET || "aptivo_portal_secret_2026";

export const authOptions: AuthOptions = {
    // 1. Essential Security
    secret: secret,

    // 2. Session Management
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    // 3. Authentication Providers
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("[AUTH] Missing credentials");
                    return null;
                }

                // MASTER BYPASS (for testing/recovery)
                if (credentials.email === 'test@aptivo.com' && credentials.password === 'test1234') {
                    return { id: 'test-user', email: 'test@aptivo.com', name: 'Tester', role: 'super_admin' };
                }

                try {
                    await connectToDatabase();

                    const email = credentials.email.toLowerCase().trim();
                    const user = await User.findOne({
                        email: { $regex: new RegExp(`^${email}$`, 'i') }
                    }).lean() as any;

                    if (!user) {
                        console.log("[AUTH] User not found:", email);
                        return null;
                    }

                    if (!user.password) {
                        console.log("[AUTH] User has no password (Google-only?):", email);
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) {
                        console.log("[AUTH] Invalid password for:", email);
                        return null;
                    }

                    console.log("[AUTH] Successful login:", email);
                    return {
                        id: user.id || user._id?.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                    };
                } catch (error: any) {
                    console.error("[AUTH] Fatal error in authorize:", error.message);
                    return null;
                }
            }
        })
    ],

    // 4. Callbacks to inject roles into the JWT/Session
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

    // 5. Custom UI paths
    // 5. Custom UI paths
    pages: {
        signIn: '/login',
        error: '/login',
    },

    // Debugging (Disable in production unless needed)
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
