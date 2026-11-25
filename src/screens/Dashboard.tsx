// Kova ERP — Desktop Dashboard screen
import { View, Text, signal } from "nsh";
import { typeClass, colorClass } from "../design/tokens";
import { StitchCard } from "../components/Card";
import { StitchButton } from "../components/Button";

interface KPICard {
  label: string;
  value: string;
  change: string;
  icon: string;
  iconColor: string;
  trend: "up" | "down";
}

const KPI_CARDS: KPICard[] = [
  { label: "Gross sales", value: "$4,820.50", change: "+18.2%", icon: "payments", iconColor: "text-primary", trend: "up" },
  { label: "Orders", value: "186", change: "+12.4%", icon: "receipt_long", iconColor: "text-tertiary", trend: "up" },
  { label: "Avg ticket", value: "$25.92", change: "+4.1%", icon: "sell", iconColor: "text-plum", trend: "up" },
  { label: "Refunds", value: "$42.00", change: "−2.3%", icon: "undo", iconColor: "text-error", trend: "down" },
];

interface DesktopDashboardProps {
  onGotoRegister: () => void;
  onGotoOrders: () => void;
  onLogout: () => void;
}

export function DesktopDashboard({ onGotoRegister, onGotoOrders, onLogout }: DesktopDashboardProps) {
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
          <View class="flex items-center gap-md px-md py-sm rounded bg-surface-variant text-primary">
            <View class="text-[20px]">dashboard</View>
            <Text class={typeClass("label-lg")} font-label>Dashboard</Text>
          </View>
        </View>
      </View>

      {/* Main dashboard workspace */}
      <View class="flex-1 flex flex-col p-lg min-w-0">
        <View class="flex items-center justify-between">
          <View class="flex items-center gap-sm">
            <Text class={typeClass("headline-lg")} font-headline>Dashboard</Text>
            <Text class={typeClass("body-sm")} text-outline>Gulberg Café · Today</Text>
          </View>
          <View class="flex items-center gap-sm">
            <StitchButton variant="ghost" size="sm" onPress={onGotoRegister}>
              <Text class={typeClass("label-md")} font-label>New POS Order</Text>
            </StitchButton>
            <StitchButton variant="outline" size="sm" onPress={onLogout}>
              <Text class={typeClass("label-md")} font-label>Sign out</Text>
            </StitchButton>
          </View>
        </View>

        {/* KPI grid */}
        <View class="grid grid-cols-2 md:grid-cols-4 gap-lg my-lg">
          {KPI_CARDS.map((kpi) => (
            <StitchCard
              key={kpi.label}
              variant="elevated"
              padding="md"
              class="flex flex-col justify-between gap-xs"
            >
              <View class="flex items-center justify-between">
                <Text class={typeClass("body-sm")} text-on-surface-variant>{kpi.label}</Text>
                <View class="w-6 h-6 rounded-sm bg-surface-variant flex items-center justify-center">
                  <View class={`text-[14px] ${kpi.iconColor}`}>{kpi.icon}</View>
                </View>
              </View>
              <View class="flex flex-col">
                <Text class={typeClass("headline-lg")} font-headline tabular-nums>{kpi.value}</Text>
                <View class={`flex items-center gap-xs px-xs py-0.5 rounded-sm bg-secondary-container text-on-secondary-container ${kpi.trend === "up" ? "text-secondary" : "text-error"}`}>
                  <View class="w-1.5 h-1.5 rounded-full bg-current" />
                  <Text class={typeClass("label-sm")} font-label>{kpi.change}</Text>
                </View>
              </View>
            </StitchCard>
          ))}
        </View>

        {/* Recent orders */}
        <StitchCard variant="elevated" padding="md" class="w-full max-w-[800px] my-lg">
          <View class="flex items-center justify-between mb-md">
            <Text class={typeClass("title-md")} font-title>Recent orders</Text>
            <View class="text-primary hover:underline" onPress={onGotoOrders}>
              See all
            </View>
          </View>
          <View class="flex flex-col divide-y divide-outline-variant">
            {[
              { no: "#1048", customer: "Usman Tariq", channel: "Dine-in · Table 6 · 4 items", amount: "$30.24", status: "Ready", statusColor: "text-plum" },
              { no: "#1047", customer: "Walk-in", channel: "Takeaway · 1 item", amount: "$4.50", status: "Completed", statusColor: "text-secondary" },
              { no: "#1046", customer: "Omar Farooq", channel: "Delivery · 5 items", amount: "$58.20", status: "Completed", statusColor: "text-secondary" },
            ].map((order) => (
              <View key={order.no} class="flex items-center justify-between py-sm gap-sm">
                <View class="flex flex-col">
                  <Text class={typeClass("title-md")} tabular-nums>{order.no} · {order.customer}</Text>
                  <Text class={typeClass("body-sm")} text-outline>{order.channel}</Text>
                </View>
                <View class="flex flex-col items-end gap-xs">
                  <Text class={typeClass("title-md")} tabular-nums>{order.amount}</Text>
                  <View class={`inline-flex items-center gap-xs px-sm py-xs rounded-sm bg-plum-container text-on-plum-container ${order.statusColor}`}>
                    <View class="w-1.5 h-1.5 rounded-full bg-current" />
                    <Text class={typeClass("label-sm")} font-label>{order.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </StitchCard>

        {/* Top sellers */}
        <StitchCard variant="elevated" padding="md" class="w-full max-w-[800px] my-lg">
          <View class="flex items-center justify-between mb-md">
            <Text class={typeClass("title-md")} font-title>Top sellers today</Text>
          </View>
          <View class="flex flex-col gap-md">
            {[
              { name: "Café Latte", revenue: "$639.00", sold: "142 sold", progress: 92, imageUrl: "" },
              { name: "Butter Croissant", revenue: "$307.20", sold: "96 sold", progress: 64, imageUrl: "" },
            ].map((seller) => (
              <View key={seller.name} class="flex items-center gap-md">
                <View class="w-10 h-10 rounded-sm bg-surface-container object-cover" />
                <View class="flex-1 flex flex-col gap-xs">
                  <View class="flex justify-between">
                    <Text class={typeClass("title-md")}>{seller.name}</Text>
                    <Text class={typeClass("title-md")} tabular-nums>{seller.revenue}</Text>
                  </View>
                  <View class="w-full h-1.5 rounded-full bg-surface-container">
                    <View class={`h-1.5 rounded-full bg-primary-container w-[${seller.progress}%]`} />
                  </View>
                  <Text class={typeClass("body-sm")} text-outline tabular-nums>{seller.sold}</Text>
                </View>
              </View>
            ))}
          </View>
        </StitchCard>
      </View>
    </View>
  );
}
