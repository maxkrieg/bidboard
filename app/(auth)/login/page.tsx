import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-2/5 bg-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white text-sm font-bold tracking-tight">
                BB
              </span>
            </div>
            <span className="text-white text-xl font-bold">BidBoard</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white text-2xl font-semibold leading-snug mb-3">
            Collect, compare, and analyze contractor bids — all in one place.
          </p>
          <p className="text-indigo-200 text-sm">
            Make confident decisions on your home projects.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-indigo-300 text-xs">© 2026 BidBoard</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">BB</span>
            </div>
            <span className="font-bold text-zinc-900 text-lg">BidBoard</span>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
