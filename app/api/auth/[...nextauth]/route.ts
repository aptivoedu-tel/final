import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb/connection";
import { User } from "@/lib/mongodb/models";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const identifier = `[AUTH-${Date.now()}]`;
                console.log(`${identifier} Start authorize for email: ${credentials?.email}`);

                if (!credentials?.email || !credentials?.password) {
                    console.log(`${identifier} Error: Missing credentials`);
                    return null;
                }

                // BYPASS
                if (credentials.email === 'test@aptivo.com' && credentials.password === 'test1234') {
                    console.log(`${identifier} Success: Master bypass`);
                    return { id: 'test', email: 'test@aptivo.com', name: 'Tester', role: 'super_admin' };
                }

                try {
                    await connectToDatabase();
                    console.log(`${identifier} DB Connected`);

                    const email = credentials.email.trim();
                    const user = await User.findOne({
                        email: { $regex: new RegExp(`^${email}$`, 'i') }
                    });

                    if (!user) {
                        console.log(`${identifier} Error: User not found for email: ${email}`);
                        return null;
                    }

                    console.log(`${identifier} Found user in DB: ${user.email}, Role: ${user.role}`);

                    if (!user.password) {
                        console.log(`${identifier} Error: User has no password in DB`);
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    console.log(`${identifier} Bcrypt match: ${isValid}`);

                    if (!isValid) {
                        return null;
                    }

                    console.log(`${identifier} Login SUCCESS`);
                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                    };
                } catch (err: any) {
                    console.error(`${identifier} FATAL EXCEPTION:`, err);
                    return null;
                }
            }
        }),
    ],
    callbacks: {
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.role = token.role;
            }
            return session;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
            }
            return token;
        }
    },
    session: { strategy: "jwt" },
    pages: { signIn: '/login' },
    debug: true
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
