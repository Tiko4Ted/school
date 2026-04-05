import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (!token) {
        return false;
      }

      if (pathname.startsWith("/admin")) {
        return token.role === "ADMIN";
      }

      if (pathname.startsWith("/teacher")) {
        return token.role === "TEACHER";
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/", "/admin/:path*", "/teacher/:path*"],
};
