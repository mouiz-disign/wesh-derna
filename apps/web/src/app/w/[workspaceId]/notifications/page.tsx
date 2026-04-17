"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCheck,
  Check,
  Loader2,
  MessageSquare,
  UserPlus,
  Clock,
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  Mic,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Notification } from "@repo/types";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "task.assigned": UserPlus,
  "task.created": Plus,
  "task.commented": MessageSquare,
  "task.deadline": Clock,
  "task.overdue": AlertTriangle,
  "task.moved": ArrowRightLeft,
  "voice.note": Mic,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = connectSocket();
    socket.on("notification:new", (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
    });
    return () => {
      socket.off("notification:new");
    };
  }, []);

  const markAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
    );
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aucune notification pour le moment
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            return (
              <button
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  notif.read
                    ? "opacity-60 hover:bg-muted/30"
                    : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    notif.read
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(notif.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                    {/* Read receipt indicator */}
                    {notif.read && notif.readAt && (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-500" title={`Lu le ${format(new Date(notif.readAt), "dd MMM HH:mm", { locale: fr })}`}>
                        <CheckCheck className="h-3 w-3" />
                        Lu
                      </span>
                    )}
                  </div>
                </div>
                {!notif.read ? (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  </div>
                ) : (
                  <span className="mt-2 shrink-0">
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
