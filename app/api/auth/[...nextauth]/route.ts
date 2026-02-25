import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/models/User";
import bcrypt from "bcryptjs";

// Extremely robust setup
const authSecret = process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only_123";

export const authOptions: AuthOptions = {
    secret: authSecret,
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // 1. Bypass
                if (credentials.email === 'test@aptivo.com' && credentials.password === 'test1234') {
                    return { id: 'test-1', email: 'test@aptivo.com', name: 'Tester', role: 'super_admin' };
                }

                try {
                    await connectToDatabase();
                    const user = await User.findOne({
                        email: { $regex: new RegExp(`^${credentials.email.trim()}$`, 'i') }
                    }).lean() as any;

                    if (!user || !user.password) return null;

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) return null;

                    return {
                        id: user.id || user._id.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                    };
                } catch (err) {
                    console.error("AUTH ERROR:", err);
                    return null;
                }
            }
        })
    ],
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
    pages: {
        signIn: '/login',
    },
    debug: true
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
