"use server"
import { auth } from "@workspace/auth/server"
export default async function Login(formdata: FormData) {
  const respose = await auth.api.signInEmail({
    body: {
      email: formdata.get("email") as string,
      password: formdata.get("password") as string,
      callbackURL: "/dashboard",
    },
  })
  
  return respose
  
}
