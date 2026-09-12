"use server"
import { auth } from "@workspace/auth/server"
export async function signup(formdata: FormData) {
  const respose=await auth.api.signUpEmail({
    body: {
      name: formdata.get("name") as string,
      email: formdata.get("email") as string,
      password: formdata.get("password") as string,
      callbackURL: "https://localhost:3000/dashboard",
    },
  })
  console.log("RESPONSE FROM SIGNUP:", respose)
  
}
