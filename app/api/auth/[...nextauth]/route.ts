import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "@/lib/mongodb/connection";
import { User } from "@/lib/mongodb/models";
import bcrypt from "bcryptjs";

const secret = process.env.NEXTAUTH_SECRET || "aptivo_portal_secret_2026";

export const authOptions: AuthOptions = {
    secret: secret,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // Master bypass
                if (credentials.email === 'test@aptivo.com' && credentials.password === 'test1234') {
                    return { id: 'test-user', email: 'test@aptivo.com', name: 'Tester', role: 'super_admin' };
                }

                try {
                    await connectToDatabase();
                    const email = credentials.email.toLowerCase().trim();
                    const user = await User.findOne({
                        email: { $regex: new RegExp(`^${email}$`, 'i') }
                    }).lean() as any;

                    if (!user) { console.log("[AUTH] Not found:", email); return null; }
                    if (!user.password) { console.log("[AUTH] No password (Google-only):", email); return null; }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) { console.log("[AUTH] Bad password:", email); return null; }

                    console.log("[AUTH] Login OK:", email);
                    return {
                        id: user.id || user._id?.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                    };
                } catch (err: any) {
                    console.error("[AUTH] Error:", err.message);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }: any) {
            if (account?.provider === "google") {
                try {
                    await connectToDatabase();
                    const dbUser = await User.findOne({ email: user.email });

                    if (!dbUser) {
                        // User is NOT registered — block login and redirect to register
                        console.log("[AUTH] Google login blocked — user not registered:", user.email);
                        return `/login?error=not_registered&email=${encodeURIComponent(user.email)}`;
                    }

                    // User exists — attach DB fields to token
                    user.role = dbUser.role;
                    user.id = dbUser.id || dbUser._id.toString();
                    user.provider = 'google';
                    console.log("[AUTH] Google login OK:", user.email);
                    return true;
                } catch (err) {
                    console.error("[AUTH] Google signIn error:", err);
                    return '/login?error=server_error';
                }
            }
            return true;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.provider = user.provider;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).provider = token.provider;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
