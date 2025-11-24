import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_SUILEND_MVR_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_SUILEND_MVR_CLIENT_SECRET as string,
    }),
  ],
};
export default NextAuth(authOptions);
