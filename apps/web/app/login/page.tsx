import Image from "next/image"
import Link from "next/link"
import Memoralogo from "@/app/icon.svg"
import { LoginForm } from "@/app/login/_ui/login-form"

export default function LoginPage() {
  
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex items-center justify-center rounded-md">
              <span className="size-6">
                <Image
                  loading="eager"
                  src={Memoralogo}
                  alt="Image"
                  draggable={false}
                />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold">Memora</span>
            </div>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          loading="eager"
          src={Memoralogo}
          alt="Image"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover "
        />
      </div>
    </div>
  )
}
