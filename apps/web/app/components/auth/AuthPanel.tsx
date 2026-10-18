import { AuthForm, type AuthMode } from "./AuthForm"

export function AuthPanel({ initialMode }: { initialMode: AuthMode }) {
  return (
    <main className="w-full flex items-center justify-center bg-surface-container-lowest p-space-md min-h-svh">
      <div className="flex flex-col w-full items-center justify-center py-space-xl px-space-md">
        <AuthForm initialMode={initialMode} />
      </div>
    </main>
  )
}