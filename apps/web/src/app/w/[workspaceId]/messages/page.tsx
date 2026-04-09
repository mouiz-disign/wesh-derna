"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MessageSquare, Loader2 } from "lucide-react";
import type { Channel } from "@repo/types";

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/workspaces/${params.workspaceId}/channels`);
        setChannels(data);
        if (data.length > 0) {
          router.replace(`/w/${params.workspaceId}/messages/${data[0].id}`);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [params.workspaceId, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="text-sm text-muted-foreground">
          Selectionnez un channel pour commencer
        </p>
      </div>
    </div>
  );
}
