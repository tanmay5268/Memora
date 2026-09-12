"use client"
import { cn } from "cn"
import { createAuthClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/toast"
import { useRouter } from "next/navigation"
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const authClient = createAuthClient()
  const router = useRouter()
  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const formData = new FormData(event.currentTarget)
      const { data, error } = await authClient.signUp.email({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        callbackURL: "/dashboard",
      })
      if (error) {
        console.log(error)
        toast.add({
          type: "error",
          title: "Failed to sign up",
          description: error.message,
        })
        return
      }
      toast.add({
        transitionStatus: "ending",
        type: "success",
        title: "Signed up successfully",
        description: "You have been signed up successfully",
      })
      router.push("/dashboard")
    } catch {
      toast.add({
        type: "error",
        title: "Failed to sign up",
        description: "An error occurred during sign up",
      })
    }
  }
  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create New Account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to create a new account
          </p>
        </div>
        {/*-----------------*/}

        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            name="name"
            id="name"
            type="text"
            placeholder="Binod"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            name="email"
            id="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input name="password" id="password" type="password" required />
        </Field>
        <Field>
          <Button name="action" value="credentials" type="submit">Continue</Button>
        </Field>
        {/*-----------------*/}
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            onClick={() => {
              authClient.signIn.social({
                provider: "github",
                callbackURL: "/dashboard",
              })
            }}
            variant="outline"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="currentColor"
              />
            </svg>
            GitHub
          </Button>

          <Button
            onClick={() => {
              authClient.signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
              })
            }}
            variant="outline"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              className="h-18 w-18"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42z"
              />
              <path
                fill="#34A853"
                d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.99z"
              />
              <path
                fill="#FBBC05"
                d="M6.54 14.09A5.86 5.86 0 0 1 6.23 12c0-.73.13-1.43.31-2.09V7.38H3.3A9.99 9.99 0 0 0 2.25 12c0 1.67.4 3.25 1.05 4.62l3.24-2.53z"
              />
              <path
                fill="#EA4335"
                d="M12 5.88c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 2.98 14.63 2 12 2a9.75 9.75 0 0 0-8.7 5.38l3.24 2.53C7.31 7.6 9.46 5.88 12 5.88z"
              />
            </svg>
            Google
          </Button>
          {/*<FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>*/}
        </Field>
      </FieldGroup>
    </form>
  )
}
