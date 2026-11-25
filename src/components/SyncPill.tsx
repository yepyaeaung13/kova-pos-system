// Kova ERP — SyncPill component (offline-first sync status)
import { View, Text, signal } from "nsh";
import { radius, colorClass, typeClass } from "../design/tokens";

interface SyncPillProps {
  online?: boolean;
  pendingCount?: number;
  lastSyncedAt?: string | null;
  onPress?: () => void;
  class?: string;
}

export function SyncPill({
  online = true,
  pendingCount = 0,
  lastSyncedAt = null,
  onPress,
  class: className,
}: SyncPillProps) {
  const warn = !online || pendingCount > 0;
  const label = offlineLabel(online, pendingCount);

  return (
    <View
      onPress={onPress}
      class={[
        "inline-flex items-center gap-xs px-sm py-xs rounded-full border border-outline-variant",
        warn ? "bg-amber-container text-on-amber-container" : "bg-secondary-container text-on-secondary-container",
        className,
      ].filter(Boolean).join(" ")}
    >
      <View class={`w-2 h-2 rounded-full ${warn ? "bg-amber" : "bg-secondary"}`} />
      <Text class={typeClass("label-md")}>{label}</Text>
    </View>
  );
}

function offlineLabel(online: boolean, pending: number): string {
  if (!online) return `Offline · ${pending} pending`;
  if (pending > 0) return `Syncing · ${pending} pending`;
  return "SQLite · Synced";
}
