"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, Building2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  workspace: { id: string; name: string };
  project?: { id: string; name: string } | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    poste: "",
    fonction: "",
  });

  useEffect(() => {
    api
      .get(`/invitations/${params.token}`)
      .then(({ data }) => setInvitation(data))
      .catch((err) => {
        setError(
          err.response?.data?.message || "Invitation invalide ou expiree",
        );
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/invitations/${params.token}/accept`, {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        poste: form.poste || undefined,
        fonction: form.fonction || undefined,
      });

      // Auto-login
      const loginRes = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      setAuth(loginRes.data.user, loginRes.data.token);

      toast.success("Bienvenue dans l'equipe !");
      const redirectPath = invitation!.project
        ? `/w/${invitation!.workspace.id}/projects/${invitation!.project.id}`
        : `/w/${invitation!.workspace.id}`;
      router.push(redirectPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--destructive)]/10">
            <Users className="h-8 w-8 text-[var(--destructive)]" />
          </div>
          <h1 className="text-2xl font-headline font-bold mb-2">
            Invitation invalide
          </h1>
          <p className="text-[var(--muted-foreground)]">
            {error || "Ce lien d'invitation est invalide ou a expire."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-headline font-bold">
              {invitation.project
                ? `Rejoindre le projet ${invitation.project.name}`
                : `Rejoindre ${invitation.workspace.name}`}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Vous avez ete invite en tant que{" "}
              <span className="font-semibold text-[var(--primary)]">
                {invitation.role === "ADMIN"
                  ? "Administrateur"
                  : invitation.role === "VIEWER"
                    ? "Lecteur"
                    : "Membre"}
              </span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface-lowest)] rounded-xl p-6 shadow-executive space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Email *
            </label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="votre@email.com"
              className="bg-[var(--surface-low)] border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Prenom *
              </label>
              <Input
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="Samy"
                className="bg-[var(--surface-low)] border-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Nom *
              </label>
              <Input
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                placeholder="Mohandi"
                className="bg-[var(--surface-low)] border-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Poste
              </label>
              <Input
                value={form.poste}
                onChange={(e) => setForm({ ...form, poste: e.target.value })}
                placeholder="Ex: Developpeur Full-Stack"
                className="bg-[var(--surface-low)] border-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Fonction
              </label>
              <Input
                value={form.fonction}
                onChange={(e) =>
                  setForm({ ...form, fonction: e.target.value })
                }
                placeholder="Ex: CTO, Chef de projet"
                className="bg-[var(--surface-low)] border-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Mot de passe *
            </label>
            <Input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 caracteres"
              className="bg-[var(--surface-low)] border-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Confirmer le mot de passe *
            </label>
            <Input
              required
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="Retapez votre mot de passe"
              className="bg-[var(--surface-low)] border-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 gradient-primary text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Rejoindre l&apos;equipe
          </button>
        </form>
      </div>
    </div>
  );
}
