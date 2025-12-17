import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            status: string
            themePreference?: string
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        id: string
        status: string
        themePreference?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string
        id: string
        status: string
        themePreference?: string
    }
}
