// Kova ERP — Desktop Orders screen
import { View, Text, signal } from "nsh";
import { StitchCard } from "../components";
import { typeClass, colorClass } from "../design/tokens";

interface Order {
  id: string;
  no: string;
  customer: string;
  channel: string;
  items: number;
  amount: string;
  status: "New" | "Preparing" | "Ready" | "Completed" | "Voided";
  time: string;
}

const STATUS_COLORS: Record<string, string> = {
  New: "bg-tertiary-container text-on-tertiary-container",
  Preparing: "bg-amber-container text-on-amber-container",
  Ready: "bg-plum-container text-on-plum-container",
  Completed: "bg-secondary-container text-on-secondary-container",
  Voided: "bg-error-container text-on-error-container",
} as const;

const ORDERS: Order[] = [
  { id: "1", no: "#1052", customer: "Nadia Tariq", channel: "Dine-in · Table 2", items: 3, amount: "$34.50", status: "New", time: "9:15 AM" },
  { id: "2", no: "#1051", customer: "Walk-in", channel: "Takeaway · 2 items", items: 2, amount: "$8.70", status: "Preparing", time: "9:12 AM" },
  { id: "3", no: "#1050", customer: "Usman Tariq", channel: "Dine-in · Table 6 · 4 items", items: 4, amount: "$30.24", status: "Ready", time: "9:08 AM" },
  { id: "4", no: "#1049", customer: "Ayesha Khan", channel: "Dine-in · Table 4 · 2 guests", items: 4, amount: "$25.95", status: "Completed", time: "9:05 AM" },
  { id: "5", no: "#1048", customer: "Omar Farooq", channel: "Delivery · 5 items", items: 5, amount: "$58.20", status: "Completed", time: "8:52 AM" },
];

interface DesktopOrdersProps {
  onGotoDashboard: () => void;
  onGotoRegister: () => void;
  onLogout: () => void;
}

export function DesktopOrders({ onGotoDashboard, onGotoRegister, onLogout }: DesktopOrdersProps) {
  const activeFilter = signal<"All" | "New" | "Preparing" | "Ready" | "Completed">("All");

  const filtered = activeFilter.value === "All"
    ? ORDERS
    : ORDERS.filter((o) => o.status === activeFilter.value);

  return (
    <View class="flex min-h-[1024px] bg-surface">
      {/* Left nav rail */}
      <View class="w-[200px] shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col p-lg min-h-[1024px]">
        <View class="flex items-center gap-xs px-sm">
          <View class="w-8 h-8 rounded-sm bg-primary-container text-on-primary flex items-center justify-center">
            <Text class={`${typeClass("title-lg")} font-headline tabular-nums`}>K</Text>
          </View>
          <View class="flex items-center gap-xs">
            <Text class={`${typeClass("title-lg")} font-headline`}>Kova</Text>
            <View class="px-xs py-xs rounded-sm bg-surface-variant text-primary">
              <Text class={`${typeClass("label-sm")} font-label`}>POS</Text>
            </View>
          </View>
        </View>
        <View class="flex flex-col gap-xs my-lg px-sm">
          <Text class={`${typeClass("label-sm")} font-label text-outline uppercase px-sm pb-xs`}>Menu</Text>
          <View class="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container">
            <View class="text-[20px]">receipt_long</View>
            <Text class={typeClass("label-lg")} font-label>Orders</Text>
          </View>
        </View>
      </View>

      {/* Main orders workspace */}
      <View class="flex-1 flex flex-col p-lg min-w-0">
        <View class="flex items-center justify-between">
          <View class="flex items-center gap-sm">
            <Text class={typeClass("headline-lg")} font-headline>Orders</Text>
            <View class="text-primary hover:underline" onPress={onGotoDashboard}>
              Dashboard
            </View>
          </View>
          <View class="text-primary hover:underline" onPress={onGotoRegister}>
            New order
          </View>
        </View>

        {/* Status filter chips */}
        <View class="flex flex-wrap items-center gap-sm my-lg">
          {["All", "New", "Preparing", "Ready", "Completed"].map((status) => (
            <View
              key={status}
              onPress={() => activeFilter.value = status as any}
              class={[
                "inline-flex items-center gap-xs px-sm py-xs rounded-full border transition-colors duration-100 ease-out",
                activeFilter.value === status
                  ? `border-on-surface bg-on-surface text-surface-container-lowest`
                  : "border-outline-variant text-on-surface hover:bg-surface-container",
              ].filter(Boolean).join(" ")}
            >
              <Text class={typeClass("label-sm")} font-label>{status}</Text>
              {status !== "All" && (
                <View class={`px-xs py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                  <Text class={typeClass("label-sm")} font-label tabular-nums>
                    {ORDERS.filter((o) => o.status === status).length}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Orders table */}
        <StitchCard variant="elevated" padding="md" class="w-full">
          <View class="flex flex-col">
            <View class="grid grid-cols-7 gap-md mb-lg text-label-sm font-label text-on-surface-variant uppercase">
              <View>Order</View>
              <View>Customer</View>
              <View class="text-right">Channel</View>
              <View class="text-right">Items</View>
              <View class="text-right">Amount</View>
              <View class="text-right">Status</View>
              <View class="text-right">Time</View>
            </View>
            <View class="flex flex-col divide-y divide-outline-variant">
              {filtered.map((order) => (
                <View
                  key={order.id}
                  onPress={() => {}}
                  class="grid grid-cols-7 gap-md py-sm text-body-md text-on-surface hover:bg-surface-container transition-colors duration-100 ease-out"
                >
                  <View tabular-nums>{order.no}</View>
                  <View>{order.customer}</View>
                  <View class="text-right">{order.channel}</View>
                  <View class="text-right tabular-nums">{order.items}</View>
                  <View class="text-right tabular-nums">{order.amount}</View>
                  <View class="text-right">
                    <View class={`inline-flex items-center gap-xs px-sm py-xs rounded-full ${STATUS_COLORS[order.status]}`}>
                      <View class="w-1.5 h-1.5 rounded-full bg-current" />
                      <Text class={typeClass("label-sm")} font-label>{order.status}</Text>
                    </View>
                  </View>
                  <View class="text-right text-outline tabular-nums">{order.time}</View>
                </View>
              ))}
            </View>
          </View>
        </StitchCard>
      </View>
    </View>
  );
}
