// Kova ERP — NavRail component (left navigation rail for desktop)
import { View, Text } from "nsh";
import { Link } from "nsh/base";
import { colorClass, typeClass, radius } from "../design/tokens";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  active?: boolean;
}

interface NavRailProps {
  activeScreen: string;
  onSwitchMicroApp?: (app: "sale" | "inventory") => void;
  cashierName?: string;
  cashierRole?: string;
  shiftOpenSince?: string;
  class?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/register", icon: "shopping_cart", label: "POS", badge: 12 },
  { href: "/orders", icon: "receipt_long", label: "Orders" },
  { href: "/sales", icon: "description", label: "Sale" },
  { href: "/products", icon: "inventory_2", label: "Products" },
  { href: "/customers", icon: "group", label: "Customers" },
  { href: "/reports", icon: "bar_chart", label: "Reports" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export function NavRail({
  activeScreen,
  onSwitchMicroApp,
  cashierName = "Sara Ahmed",
  cashierRole = "Cashier",
  shiftOpenSince = "8:00 AM",
  class: className,
}: NavRailProps) {
  return (
    <View class={[`w-[200px] shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col justify-between p-lg min-h-[1024px]`, className].filter(Boolean).join(" ")}>
      {/* Brand + micro-app switcher */}
      <View class="flex flex-col gap-2xl">
        <View class="flex items-center justify-between gap-sm px-sm">
          <View class="flex items-center gap-xs">
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
          <Link
            href="/inventory"
            onPress={() => onSwitchMicroApp?.("inventory")}
            class="px-xs py-xs rounded-sm bg-surface-container-lowest border border-outline-variant text-outline hover:text-on-surface font-label text-label-sm"
          >
            INV
          </Link>
        </View>

        {/* Menu links */}
        <View aria-label="Main navigation" class="flex flex-col gap-xs">
          <Text class={`${typeClass("label-sm")} font-label text-outline uppercase px-sm pb-xs`}>Menu</Text>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onPress={() => {}}
              class={[
                "flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container transition-colors duration-100 ease-out",
                item.active ? "bg-surface-variant text-primary" : "",
              ].filter(Boolean).join(" ")}
            >
              <View class="text-[20px]">{item.active ? "■" : ""}</View>
              <Text class={typeClass("label-lg")} font-label>{item.label}</Text>
              {item.badge && (
                <View class={`ml-auto px-xs py-xs rounded-full bg-on-surface text-surface-container-lowest tabular-nums ${typeClass("label-sm")}`}>{item.badge}</View>
              )}
            </Link>
          ))}
        </View>
      </View>

      {/* Cashier shift footer */}
      <View class="bg-surface-container-lowest border border-outline-variant rounded-md p-md flex flex-col gap-sm">
        <View class="flex items-center gap-xs">
          <View class="w-2 h-2 rounded-full bg-secondary" />
          <Text class={typeClass("body-sm")} text-secondary>Shift open · since {shiftOpenSince}</Text>
        </View>
        <View class="flex items-center justify-between gap-sm">
          <View class="flex items-center gap-sm">
            <View class="w-8 h-8 rounded-full bg-plum-container text-on-plum-container flex items-center justify-center">
              <Text class={`${typeClass("label-sm")} font-label tabular-nums`}>SA</Text>
            </View>
            <View class="flex flex-col">
              <Text class={typeClass("label-md")}>{cashierName}</Text>
              <Text class={typeClass("body-sm")} text-outline>{cashierRole}</Text>
            </View>
          </View>
          <View aria-label="Switch cashier" class="text-outline hover:text-on-surface">
            <View class="text-[18px]">logout</View>
          </View>
        </View>
      </View>
    </View>
  );
}
