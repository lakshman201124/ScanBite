import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      restaurantId: string;
      role: UserRole;
      name: string;
      email: string;
    };
  }

  interface User {
    restaurantId: string;
    role: UserRole;
  }
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.restaurantId = user.restaurantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub ?? "",
          restaurantId: token.restaurantId as string,
          role: token.role as UserRole,
          name: token.name ?? "",
          email: token.email ?? "",
        },
      };
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};
