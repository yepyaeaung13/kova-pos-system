import { Text, View } from "nsh";
import { Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { cashier, route, switchApp, navigate, type AppId } from "../store";
import { syncState } from "../sync/state";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

const navItems: Record<AppId, NavItem[]> = {
  pos: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "register", label: "POS", icon: "shopping_cart" },
    { id: "tables", label: "Tables", icon: "table_restaurant" },
    { id: "orders", label: "Orders", icon: "receipt_long", count: 12 },
    { id: "sales", label: "Sale", icon: "description" },
    { id: "products", label: "Products", icon: "inventory_2" },
    { id: "customers", label: "Customers", icon: "group" },
    { id: "reports", label: "Reports", icon: "bar_chart" },
    { id: "settings", label: "Settings", icon: "settings" },
  ],
  inventory: [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "stock-items", label: "Stock items", icon: "inventory_2" },
    { id: "recipes", label: "Recipes & BOM", icon: "menu_book" },
    { id: "grn-history", label: "Goods received", icon: "local_shipping", count: 1 },
    { id: "purchase-orders", label: "Purchase orders", icon: "request_quote" },
    { id: "adjustments", label: "Adjustments", icon: "tune" },
    { id: "transfers", label: "Transfers", icon: "swap_horiz" },
    { id: "suppliers", label: "Suppliers & audits", icon: "verified_user" },
  ],
  accounting: [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "accounts", label: "Chart of accounts", icon: "account_tree" },
    { id: "journal", label: "General journal", icon: "menu_book" },
    { id: "expenses", label: "Expenses", icon: "receipt" },
    { id: "payables", label: "Vendor payables", icon: "request_quote" },
    { id: "reconciliation", label: "Bank reconciliation", icon: "account_balance" },
    { id: "tax", label: "P&L & tax", icon: "calculate" },
  ],
};

/** Screens that belong to a nav entry without being it. */
const parents: Record<string, string> = {
  checkout: "register",
  "new-sale": "sales",
  invoice: "sales",
  "add-stock-item": "stock-items",
  "new-adjustment": "adjustments",
  purchases: "grn-history",
};

const appMeta: Record<AppId, string> = {
  pos: "POS",
  inventory: "INV",
  accounting: "ACC",
};

const appIds: AppId[] = ["pos", "inventory", "accounting"];

/** The nav entry a screen shows as current. */
function activeScreen(): string {
  const current = route().screen;
  return parents[current] ?? current;
}

export function NavRail() {
  return (
    <View
      class="shrink-0 flex-col justify-between border-r border-outline-variant bg-surface-container-low p-3"
      style={{ width: 212 }}
    >
      <View class="gap-4">
        <View class="flex-row items-center gap-2 px-2">
          <View class="h-8 w-8 items-center justify-center rounded-sm bg-primary-container">
            <Text class="font-headline text-title-lg text-on-primary">K</Text>
          </View>
          <View class="flex-row items-center gap-1.5">
            <Text class="font-headline text-title-lg text-on-surface">Kova</Text>
            <View class="rounded-sm bg-surface-variant px-1.5 py-0.5">
              <Text class="font-label text-label-sm text-primary">
                {appMeta[route().app]}
              </Text>
            </View>
          </View>
        </View>

        <View class="flex-row gap-1 rounded-sm bg-surface-container p-1">
          <Each of={appIds}>
            {(app) => (
              <View
                role="button"
                onPress={() => switchApp(app())}
                class={
                  "flex-1 items-center justify-center rounded-sm py-1.5 " +
                  (route().app === app()
                    ? "bg-surface-container-lowest"
                    : "hover:bg-surface-container-high")
                }
              >
                <Text
                  class={
                    "font-label text-label-sm " +
                    (route().app === app() ? "text-primary" : "text-on-surface-variant")
                  }
                >
                  {appMeta[app()]}
                </Text>
              </View>
            )}
          </Each>
        </View>

        <View class="gap-1">
          <Text class="px-2 pb-1 font-label text-label-sm uppercase tracking-label text-outline">
            Menu
          </Text>
          <Each of={navItems[route().app]}>
            {(item) => (
              <View
                role="button"
                onPress={() => navigate(item().id)}
                accessibilityState={{ selected: activeScreen() === item().id }}
                class={
                  "flex-row items-center justify-between rounded px-2.5 py-1.5 " +
                  (activeScreen() === item().id
                    ? "bg-surface-variant text-primary"
                    : "text-on-surface-variant hover:bg-surface-container")
                }
              >
                <View class="flex-row items-center gap-3">
                  <Icon name={item().icon} size={20} />
                  <Text class="font-label text-label-lg">{item().label}</Text>
                </View>
                <If when={item().count !== undefined}>
                  <View class="rounded-full bg-on-surface px-2 py-0.5">
                    <Text class="font-label text-label-sm tabular-nums text-surface-container-lowest">
                      {item().count ?? 0}
                    </Text>
                  </View>
                </If>
              </View>
            )}
          </Each>
        </View>
      </View>

      <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-2">
        <View class="flex-row items-center gap-1.5">
          <View
            class={
              "h-2 w-2 rounded-full " + (syncState().online ? "bg-secondary" : "bg-amber")
            }
          />
          <Text class="flex-1 font-body text-body-sm text-on-surface-variant">
            {syncState().online ? "Shift open · " + cashier.shiftStarted : "Offline · " + syncState().pending + " queued"}
          </Text>
        </View>

        <View class="h-px bg-outline-variant" />

        <View class="flex-row items-center justify-between gap-2">
          <View class="flex-1 flex-row items-center gap-2 min-w-0">
            <Avatar initials={cashier.initials} tone="plum" />
            <View class="flex-1 gap-0 min-w-0">
              <Text class="font-label text-label-md text-on-surface truncate">
                {cashier.name}
              </Text>
              <Text class="font-body text-body-sm text-outline truncate">
                {cashier.role}
              </Text>
            </View>
          </View>
          <View
            role="button"
            accessibilityLabel="Switch cashier"
            onPress={() => navigate("login")}
            class="rounded-sm p-1 hover:bg-surface-container"
          >
            <Icon name="logout" size={18} color="#6B5752" />
          </View>
        </View>
      </View>
    </View>
  );
}
