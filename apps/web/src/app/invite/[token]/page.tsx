"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, Building2, CheckCircle2, Eye, EyeOff, ChevronDown } from "lucide-react";
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

const POSTES = [
  "Directeur General",
  "Directeur des Operations",
  "Directeur Technique",
  "Directeur Commercial",
  "Directeur RH",
  "Directeur Financier",
  "Chef de Projet",
  "Responsable d'equipe",
  "Developpeur Full-Stack",
  "Developpeur Frontend",
  "Developpeur Backend",
  "Designer UI/UX",
  "Data Analyst",
  "Comptable",
  "Assistant(e) de direction",
  "Charge(e) de communication",
  "Commercial(e)",
  "Consultant(e)",
  "Stagiaire",
  "Autre",
];

const FONCTIONS = [
  "CEO / PDG",
  "COO",
  "CTO",
  "CFO",
  "CMO",
  "DRH",
  "Chef de projet",
  "Scrum Master",
  "Product Owner",
  "Lead Developer",
  "Manager",
  "Coordinateur",
  "Analyste",
  "Superviseur",
  "Collaborateur",
  "Freelance",
  "Autre",
];

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 pr-8 rounded-lg bg-[var(--surface-low)] text-sm text-[var(--on-surface)] border-none outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </label>
      <div className="relative">
        <Input
          required={required}
          type={show ? "text" : "password"}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-[var(--surface-low)] border-none pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--on-surface)] transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
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
            <SelectField
              label="Poste"
              value={form.poste}
              onChange={(val) => setForm({ ...form, poste: val })}
              options={POSTES}
              placeholder="Selectionnez..."
            />
            <SelectField
              label="Fonction"
              value={form.fonction}
              onChange={(val) => setForm({ ...form, fonction: val })}
              options={FONCTIONS}
              placeholder="Selectionnez..."
            />
          </div>

          <PasswordField
            label="Mot de passe *"
            value={form.password}
            onChange={(val) => setForm({ ...form, password: val })}
            placeholder="Minimum 6 caracteres"
            required
            minLength={6}
          />

          <PasswordField
            label="Confirmer le mot de passe *"
            value={form.confirmPassword}
            onChange={(val) => setForm({ ...form, confirmPassword: val })}
            placeholder="Retapez votre mot de passe"
            required
          />

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
