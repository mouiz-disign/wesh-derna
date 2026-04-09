import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Kanban,
  MessageSquare,
  Bell,
  Zap,
  Shield,
  Users,
  CheckCircle2,
  Hash,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  GanttChart,
  BarChart3,
  Folder,
  FileText,
  Circle,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Kanban className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Wesh Derna
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Commencer gratuitement
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute left-1/4 top-32 h-[300px] w-[400px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute right-1/4 top-48 h-[250px] w-[350px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-24 text-center sm:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">
              Plateforme de gestion interne
            </span>
          </div>

          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Organisez.{" "}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
              Collaborez.
            </span>
            <br />
            Livrez.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Wesh Derna centralise vos projets, vos taches et votre communication
            d&apos;equipe dans une seule plateforme rapide et intuitive.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                J&apos;ai deja un compte
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Gratuit pour commencer
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Temps reel
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              PWA installable
            </div>
          </div>
        </div>

        {/* App Preview — Full App Mock */}
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/10">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex h-6 w-72 items-center justify-center rounded-md bg-background text-xs text-muted-foreground">
                app.weshderna.com
              </div>
            </div>

            <div className="flex h-[520px]">
              {/* Sidebar */}
              <div className="w-56 shrink-0 border-r bg-[hsl(240,5%,97%)] flex flex-col text-sm">
                {/* Workspace */}
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-white">W</div>
                  <div>
                    <p className="text-xs font-semibold">Wesh Corp</p>
                    <p className="text-[10px] text-muted-foreground">5 membres</p>
                  </div>
                </div>
                {/* Search */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center gap-2 rounded-md bg-background border px-2.5 py-1.5 text-xs text-muted-foreground">
                    <Search className="h-3 w-3" />
                    Rechercher...
                    <span className="ml-auto rounded bg-muted px-1 text-[10px]">&#x2318;K</span>
                  </div>
                </div>
                {/* Nav */}
                <div className="px-2 py-1 flex flex-col gap-0.5">
                  <SidebarItem icon={LayoutGrid} label="Dashboard" />
                  <SidebarItem icon={MessageSquare} label="Messages" badge={3} />
                  <SidebarItem icon={Bell} label="Notifications" badge={7} />
                  <SidebarItem icon={Users} label="Membres" />
                </div>
                <div className="mt-3 px-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Projets
                    <Plus className="h-3 w-3 cursor-pointer" />
                  </div>
                </div>
                <div className="px-2 py-1 flex flex-col gap-0.5">
                  <SidebarItem icon={Folder} label="ERP Textile" active dot="#6366f1" />
                  <SidebarItem icon={Folder} label="Site Web v2" dot="#3b82f6" />
                  <SidebarItem icon={Folder} label="App Mobile" dot="#f59e0b" />
                </div>
                <div className="mt-3 px-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Channels
                    <Plus className="h-3 w-3 cursor-pointer" />
                  </div>
                </div>
                <div className="px-2 py-1 flex flex-col gap-0.5">
                  <SidebarItem icon={Hash} label="general" />
                  <SidebarItem icon={Hash} label="dev-team" />
                  <SidebarItem icon={Hash} label="design" />
                </div>
                {/* User */}
                <div className="mt-auto border-t px-3 py-2.5 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">MB</div>
                  <span className="text-xs font-medium">Mouiz Ben</span>
                  <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Project header */}
                <div className="border-b px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold">ERP Textile</h2>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {/* Tabs */}
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <ViewTab icon={List} label="Tableau" active />
                    <ViewTab icon={LayoutGrid} label="Kanban" />
                    <ViewTab icon={GanttChart} label="Gantt" />
                    <ViewTab icon={BarChart3} label="Stats" />
                    <div className="ml-auto flex items-center gap-2">
                      <button className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">
                        <Filter className="h-3 w-3" /> Filtre
                      </button>
                      <button className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-white text-[11px]">
                        <Plus className="h-3 w-3" /> Tache
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_140px_120px_110px_110px] gap-0 border-b bg-muted/30 px-6 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>Nom</span>
                    <span>Charge de mission</span>
                    <span>Statut</span>
                    <span>Date debut</span>
                    <span>Echeance</span>
                  </div>

                  {/* Group: ERP MP TEXTILE */}
                  <div className="border-b bg-muted/10 px-6 py-1.5 flex items-center gap-2 text-xs font-semibold">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <Folder className="h-3.5 w-3.5 text-primary" />
                    ERP MP TEXTILE
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal">6</span>
                  </div>

                  <TaskRow name="Deploiement terrain" assignee="Mouiz Ben" color="#22c55e" status="Termine" statusColor="bg-emerald-100 text-emerald-700" start="13/04" end="30/04" />
                  <TaskRow name="Formation responsable client" assignee="Mouiz Ben" color="#22c55e" status="Programme" statusColor="bg-blue-100 text-blue-700" start="13/04" end="13/04" />
                  <TaskRow name="Hebergement & securite" assignee="Mouiz B." color="#22c55e" status="En cours" statusColor="bg-amber-100 text-amber-700" start="09/04" end="13/04" extra="MS" />
                  <TaskRow name="Suivi du deploiement ERP" assignee="Mouiz Ben" color="#22c55e" status="Programme" statusColor="bg-blue-100 text-blue-700" start="14/04" end="30/04" />
                  <TaskRow name="Gestion de tresorerie boutique" assignee="Mouiz Ben" color="#22c55e" status="Programme" statusColor="bg-blue-100 text-blue-700" start="" end="" />
                  <TaskRow name="Automatiser la messagerie" assignee="Mouiz B." color="#f59e0b" status="En cours" statusColor="bg-amber-100 text-amber-700" start="10/04" end="15/04" extra="MS" />

                  {/* Group: ERP RH */}
                  <div className="border-b bg-muted/10 px-6 py-1.5 flex items-center gap-2 text-xs font-semibold">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <Folder className="h-3.5 w-3.5 text-orange-500" />
                    ERP RH
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal">3</span>
                  </div>

                  <TaskRow name="Pointage" assignee="" color="" status="Nouveau" statusColor="bg-slate-100 text-slate-600" start="" end="" />
                  <TaskRow name="Solution RH" assignee="" color="" status="Nouveau" statusColor="bg-slate-100 text-slate-600" start="" end="" />
                  <TaskRow name="Reste a faire ERP MP" assignee="Mouiz Ben" color="#22c55e" status="Programme" statusColor="bg-blue-100 text-blue-700" start="" end="" />

                  {/* Add row */}
                  <div className="px-6 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b cursor-pointer hover:bg-muted/30">
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une tache...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tout ce dont votre equipe a besoin
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Une plateforme complete pour remplacer vos 5 outils actuels.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Kanban}
              title="Kanban & Listes"
              description="Visualisez vos projets en tableaux Kanban avec drag & drop intuitif. Passez en vue liste en un clic."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Messagerie temps reel"
              description="Channels publics, messages directs, reactions emoji et indicateurs de presence. Comme Slack, en mieux."
            />
            <FeatureCard
              icon={Bell}
              title="Notifications intelligentes"
              description="Soyez notifie en temps reel des assignations, commentaires et deadlines. Jamais de surprise."
            />
            <FeatureCard
              icon={Users}
              title="Equipes & Workspaces"
              description="Creez des workspaces par equipe, gerez les roles (Admin, Membre, Viewer) et invitez par email."
            />
            <FeatureCard
              icon={Zap}
              title="Rapide comme l'eclair"
              description="UI optimiste, cache intelligent et WebSocket. Chaque action est instantanee."
            />
            <FeatureCard
              icon={Shield}
              title="Securise par defaut"
              description="Authentification JWT, validation stricte, CORS configure. Vos donnees sont protegees."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pret a transformer votre workflow ?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Rejoignez Wesh Derna et commencez a collaborer efficacement des
            aujourd&apos;hui.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                Creer mon compte
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Kanban className="h-3 w-3" />
            </div>
            Wesh Derna
          </div>
          <span>Construit avec Next.js, NestJS & Prisma</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function SidebarItem({
  icon: Icon,
  label,
  active,
  badge,
  dot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
  dot?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs cursor-default ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {dot ? (
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

function ViewTab({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
        active
          ? "bg-background border shadow-sm font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function TaskRow({
  name,
  assignee,
  color,
  status,
  statusColor,
  start,
  end,
  extra,
}: {
  name: string;
  assignee: string;
  color: string;
  status: string;
  statusColor: string;
  start: string;
  end: string;
  extra?: string;
}) {
  const initials = assignee
    ? assignee
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="grid grid-cols-[1fr_140px_120px_110px_110px] gap-0 border-b px-6 py-2 text-xs hover:bg-muted/20 transition-colors group items-center">
      {/* Name */}
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{name}</span>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-1.5">
        {assignee ? (
          <>
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: color || "#94a3b8" }}
            >
              {initials}
            </div>
            <span className="text-muted-foreground truncate">{assignee}</span>
            {extra && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white shrink-0">
                {extra}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>

      {/* Status */}
      <div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
          <Circle className="h-1.5 w-1.5 fill-current" />
          {status}
        </span>
      </div>

      {/* Start */}
      <span className="text-muted-foreground">{start || "—"}</span>

      {/* End */}
      <span className="text-muted-foreground">{end || "—"}</span>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
