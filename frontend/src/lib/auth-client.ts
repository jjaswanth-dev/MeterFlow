import { createAuthClient } from "better-auth/react"

// Create the auth client to connect with our Express backend
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
})

export const { signIn, signUp, useSession } = authClient;
