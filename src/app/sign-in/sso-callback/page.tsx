// app/sso-callback/[[...route]]/page.tsx
"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
