import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[auth] authorize called", { email: credentials?.email, hasPassword: !!credentials?.password });
          if (!credentials?.email || !credentials?.password) {
            console.log("[auth] missing credentials");
            return null;
          }

          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });
          console.log("[auth] user lookup", { found: !!user, isActive: user?.isActive });

          if (!user || !user.isActive) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          console.log("[auth] bcrypt compare result:", isValid);

          if (!isValid) return null;

          const result = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.avatar,
          };
          console.log("[auth] authorize returning user:", { id: result.id, role: result.role });
          return result;
        } catch (error) {
          console.error("[auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("[auth] jwt callback with user:", { id: user.id, role: (user as { role?: Role }).role });
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
        token.roleRefreshedAt = Date.now();
      }
      // Refresh role from DB at most every 5 minutes so admin changes take effect
      // without hitting the database on every single request
      const ROLE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastRefresh = (token.roleRefreshedAt as number) || 0;
      if (token.id && Date.now() - lastRefresh > ROLE_REFRESH_INTERVAL) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
          token.roleRefreshedAt = Date.now();
        } catch (error) {
          console.error("[auth] JWT role refresh error:", error);
          // Keep existing role in token, retry next time
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
});
