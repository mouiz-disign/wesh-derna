"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Copy, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setResetLink(`${origin}/reset-password/${data.token}`);
      setUserName(data.name);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    toast.success("Lien copie !");
  };

  if (resetLink) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Lien genere</h1>
          <p className="text-sm text-muted-foreground text-center">
            Bonjour {userName}, voici ton lien de reinitialisation (valide 1 heure)
          </p>
        </div>

        <div className="rounded-xl bg-[var(--surface-low)] p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Lien de reinitialisation
          </div>
          <div className="text-xs break-all font-mono bg-[var(--background)] rounded-lg p-3 border border-[var(--border)]">
            {resetLink}
          </div>
          <Button onClick={copyLink} className="w-full" variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Copier le lien
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Link href={resetLink.replace(typeof window !== "undefined" ? window.location.origin : "", "")}>
            <Button className="w-full">Reinitialiser maintenant</Button>
          </Link>
          <Link href="/login" className="text-center text-xs text-muted-foreground hover:text-primary">
            Retour a la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Mot de passe oublie</h1>
        <p className="text-sm text-muted-foreground text-center">
          Entre ton email pour generer un lien de reinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generer le lien
        </Button>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour a la connexion
        </Link>
      </form>
    </div>
  );
}
