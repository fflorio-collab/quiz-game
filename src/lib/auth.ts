import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Twitch from "next-auth/providers/twitch";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Provider OAuth abilitati solo se le relative env var sono presenti.
// In questo modo il build non fallisce quando un provider non è ancora configurato.
const oauthProviders: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  oauthProviders.push(
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  oauthProviders.push(
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
  oauthProviders.push(
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  );
}

// Provider che ha sempre senso: email + password (autogestita)
const credentialsProvider = Credentials({
  name: "Email + password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = typeof credentials?.email === "string" ? credentials.email : "";
    const password = typeof credentials?.password === "string" ? credentials.password : "";
    if (!email || !password) return null;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email ?? undefined,
      name: user.displayName ?? user.username ?? undefined,
      image: user.image ?? undefined,
    };
  },
});

// Lista provider attivi per UI (per mostrare solo i bottoni disponibili)
export const availableOAuthProviders: Array<"google" | "twitch" | "facebook" | "apple"> = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) availableOAuthProviders.push("google");
if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) availableOAuthProviders.push("twitch");
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) availableOAuthProviders.push("facebook");
if (process.env.APPLE_ID && process.env.APPLE_SECRET) availableOAuthProviders.push("apple");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [credentialsProvider, ...oauthProviders],
  // Credentials richiede strategy JWT. PrismaAdapter continua a creare User e Account per OAuth.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
});
