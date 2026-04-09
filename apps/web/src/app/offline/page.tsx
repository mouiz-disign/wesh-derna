"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Vous etes hors ligne</h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Reconnectez-vous a Internet pour acceder a Wesh Derna.
        Vos donnees seront synchronisees automatiquement.
      </p>
      <Button variant="outline" onClick={() => typeof window !== "undefined" && window.location.reload()}>
        Reessayer
      </Button>
    </div>
  );
}
