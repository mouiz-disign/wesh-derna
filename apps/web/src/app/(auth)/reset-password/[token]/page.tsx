"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = params.token as string;
  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/auth/reset-password/${token}`)
      .then(({ data }) => {
        setEmail(data.email);
        setName(data.name);
        setValid(true);
      })
      .catch(() => setValid(false))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      toast.error("Mot de passe trop court (6 min)");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setAuth(data.user, data.token);
      toast.success("Mot de passe reinitialise !");
      router.push("/onboarding");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verification du lien...</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien est invalide ou a expire (validite : 1 heure).
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">Generer un nouveau lien</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground text-center">
          Salut <span className="font-semibold">{name}</span>, choisis un nouveau mot de passe pour <span className="font-mono text-xs">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Nouveau mot de passe</label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="Minimum 6 caracteres"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Confirmer</label>
          <Input
            type={show ? "text" : "password"}
            placeholder="Retapez le mot de passe"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Reinitialiser
        </Button>
      </form>
    </div>
  );
}
