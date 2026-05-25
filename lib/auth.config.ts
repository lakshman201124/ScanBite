import type { NextAuthConfig } from "next-auth";
import type { UserRole, PlanType } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      restaurantId: string;
      role: UserRole;
      plan: PlanType;
      name: string;
      email: string;
    };
  }

  interface User {
    restaurantId: string;
    role: UserRole;
    plan: PlanType;
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
        token.plan = user.plan;
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
          plan: token.plan as PlanType,
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
