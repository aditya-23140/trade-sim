"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormEvent, useState } from "react";
import { OAuthStrategy } from "@clerk/types";
import { useSignUp, useClerk } from "@clerk/nextjs";

export function SignUp({ className, ...props }: React.ComponentProps<"div">) {
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk();
  const [error, setError] = useState<string | null>(null);

  // Email/password signup handler
  async function handleEmailSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log("Signup successful!");
      } else {
        console.log("Additional steps required:", result);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Signup failed");
    }
  }

  // OAuth signup
  const signUpWith = (strategy: OAuthStrategy) => {
    if (!isLoaded) return;
    signUp
      .authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      })
      .catch((err) => {
        console.error(err, null, 2);
        if (err.errors) console.log(err.errors);
      });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div id="clerk-captcha" />
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>
            Sign up with your Google account or email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignup}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                {/* <Button variant="outline" className="w-full" disabled>
                  Sign up with Apple (Disabled)
                </Button> */}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signUpWith("oauth_google")}
                >
                  {/* Google button */}
                  Sign up with Google
                </Button>
              </div>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Sign Up
                </Button>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/sign-in" className="underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
