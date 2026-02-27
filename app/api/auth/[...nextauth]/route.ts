import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb/connection";
import { User } from "@/lib/mongodb/models";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/mail";
import { setPasswordEmailTemplate } from "@/lib/emailTemplates";

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
        async signIn({ user, account, profile }: any) {
            if (account?.provider === "google") {
                try {
                    await connectToDatabase();
                    let dbUser = await User.findOne({ email: user.email });

                    if (!dbUser) {
                        // First-time Google registration — create account
                        console.log("[AUTH] New Google user:", user.email);
                        dbUser = await User.create({
                            id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                            email: user.email,
                            full_name: user.name,
                            role: 'student',
                            status: 'active',
                            email_verified: true,
                            is_solo: true,
                            provider: 'google',
                            avatar_url: profile?.picture || user.image,
                        });

                        // Send "set password" email so they can optionally add email login
                        try {
                            const setPassToken = crypto.randomBytes(32).toString('hex');
                            dbUser.set_password_token = setPassToken;
                            dbUser.set_password_token_expiry = new Date(Date.now() + 30 * 60 * 1000);
                            await dbUser.save();

                            const baseUrl = process.env.NEXTAUTH_URL || 'https://aptivoedu.vercel.app';
                            const setPassLink = `${baseUrl}/set-password?token=${setPassToken}`;
                            await sendEmail({
                                to: user.email,
                                subject: 'Welcome to APTIVO – Set Your Password',
                                html: setPasswordEmailTemplate(user.name, setPassLink),
                            });
                        } catch (emailErr) {
                            console.error("[AUTH] Set-password email failed:", emailErr);
                        }
                    }

                    // Attach DB fields to token
                    user.role = dbUser.role;
                    user.id = dbUser.id || dbUser._id.toString();
                    user.provider = 'google';
                    return true;
                } catch (err) {
                    console.error("[AUTH] Google signIn error:", err);
                    return true; // Still allow sign-in even if DB sync fails
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
