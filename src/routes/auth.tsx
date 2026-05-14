import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Cuenta · Primera Heads" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { user, username: currentUser, isAdmin, signOut } = useAuth();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "signup") {
        if (!username.match(/^[a-zA-Z0-9_]{3,24}$/)) throw new Error("Usuario: 3-24 letras/números/_");
        if (password.length < 6) throw new Error("Contraseña mínima 6 caracteres");
        const fakeEmail = email.trim() || `${username.toLowerCase()}@primeranacional.app`;
        const { error } = await supabase.auth.signUp({
          email: fakeEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username },
          },
        });
        if (error) throw error;
        nav({ to: "/" });
      } else {
        // Login por usuario: resolvemos el email vía RPC.
        const { data: emailRes, error: rpcErr } = await supabase
          .rpc("email_for_username", { _username: username });
        if (rpcErr) throw rpcErr;
        if (!emailRes) throw new Error("Usuario no encontrado");
        const { error } = await supabase.auth.signInWithPassword({
          email: emailRes as string, password,
        });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-md mx-auto w-full px-4 py-10">
          <h1 className="font-display text-4xl">Tu cuenta</h1>
          <div className="mt-6 rounded-xl bg-card border border-border p-5 space-y-2">
            <div><span className="text-muted-foreground">Usuario:</span> <b>{currentUser}</b></div>
            {isAdmin && <div className="text-celeste font-display">⭐ ADMIN</div>}
            {isAdmin && <Link to="/admin" className="block mt-2 text-celeste underline">Panel admin →</Link>}
            <Button variant="outline" className="mt-4 w-full" onClick={() => signOut().then(() => nav({ to: "/" }))}>
              Cerrar sesión
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-10">
        <h1 className="font-display text-4xl">{mode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Tu progreso del torneo se guarda en tu cuenta.</p>

        <form onSubmit={handle} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Usuario</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-xs text-muted-foreground">Email (opcional)</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="se genera uno si lo dejás vacío" />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Contraseña</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          {err && <div className="text-sm text-destructive">{err}</div>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "..." : mode === "login" ? "ENTRAR" : "REGISTRARME"}
          </Button>
        </form>

        <button
          className="mt-4 text-sm text-celeste underline"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); }}
        >
          {mode === "login" ? "¿No tenés cuenta? Crear una" : "¿Ya tenés cuenta? Iniciar sesión"}
        </button>
      </main>
    </div>
  );
}
