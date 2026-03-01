// // import type { NextAuthOptions } from "next-auth";
// // import GoogleProvider from "next-auth/providers/google";
// // import EmailProvider from "next-auth/providers/email";
// // import { SupabaseAdapter } from "@auth/supabase-adapter";
// // import { Resend } from "resend";

// // const resend = new Resend(process.env.RESEND_API_KEY);

// // export const authOptions: NextAuthOptions = {
// //   adapter: SupabaseAdapter({
// //     url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //     secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
// //   }),

// //   providers: [
// //     GoogleProvider({
// //       clientId: process.env.GOOGLE_CLIENT_ID!,
// //       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
// //     }),

// //     EmailProvider({
// //       from: process.env.EMAIL_FROM,
// //       async sendVerificationRequest({ identifier, url }) {
// //         console.log("🔥 sendVerificationRequest HIT", identifier);
// //         const result = await resend.emails.send({
// //           from: process.env.EMAIL_FROM!,
// //           to: identifier,
// //           subject: "Sign in to LetsLearn",
// //           html: `
// //             <p>Click the link below to sign in:</p>
// //             <p><a href="${url}">${url}</a></p>
// //           `,
// //         });
// //         console.log("✅ Resend result:", result);
// //       },
// //     }),
// //   ],

// //   session: {
// //     strategy: "jwt",
// //   },

// //   pages: {
// //     signIn: "/auth/signin",
// //   },

// //   secret: process.env.NEXTAUTH_SECRET,
// // };

// import type { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import EmailProvider from "next-auth/providers/email";
// import { SupabaseAdapter } from "@auth/supabase-adapter";
// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);

// export const authOptions: NextAuthOptions = {
//   adapter: SupabaseAdapter({
//     url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   }),

//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),

//     EmailProvider({
//       from: process.env.EMAIL_FROM,
//       async sendVerificationRequest({ identifier, url }) {
//         await resend.emails.send({
//           from: process.env.EMAIL_FROM!,
//           to: identifier,
//           subject: "Sign in to LetsLearn",
//           html: `<p><a href="${url}">Sign in</a></p>`,
//         });
//       },
//     }),
//   ],

//   session: {
//     strategy: "jwt",
//   },

//   callbacks: {
//     async jwt({ token, user }) {
//       // 👇 runs on sign-in
//       if (user) {
//         token.id = user.id;
//       }
//       return token;
//     },

//     async session({ session, token }) {
//       // 👇 expose id to client
//       if (session.user && token.id) {
//         session.user.id = token.id as string;
//       }
//       return session;
//     },
//   },

//   pages: {
//     signIn: "/auth/signin",
//     verifyRequest: "/auth/verify",
//   },

//   secret: process.env.NEXTAUTH_SECRET,
// };
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM!,
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url }) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: identifier,
          subject: "Sign in to LetsLearn",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to LetsLearn!</h2>
              <p>Click the button below to sign in:</p>
              <a href="${url}" 
                 style="display: inline-block; background: linear-gradient(to right, #2563eb, #9333ea); 
                        color: white; padding: 12px 24px; text-decoration: none; 
                        border-radius: 6px; margin: 16px 0; font-weight: 500;">
                Sign in to LetsLearn
              </a>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 10 minutes.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
