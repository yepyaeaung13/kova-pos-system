import { View } from "nsh";
import { route } from "../store";
import { RegisterScreen } from "./pos/Register";
import { CheckoutScreen } from "./pos/Checkout";
import { InvoiceScreen } from "./pos/Invoice";
import { NewSaleScreen } from "./pos/NewSale";
import { DashboardScreen } from "./pos/Dashboard";
import { OrdersScreen } from "./pos/Orders";
import { TablesScreen } from "./pos/Tables";
import { SalesScreen } from "./pos/Sales";
import { ProductsScreen } from "./pos/Products";
import { CustomersScreen } from "./pos/Customers";
import { ReportsScreen } from "./pos/Reports";
import { SettingsScreen } from "./pos/Settings";
import { SyncScreen } from "./pos/Sync";
import { StockOverviewScreen } from "./inventory/StockOverview";
import { StockItemsScreen } from "./inventory/StockItems";
import { AddStockItemScreen } from "./inventory/AddStockItem";
import { RecipesScreen } from "./inventory/Recipes";
import { GrnHistoryScreen } from "./inventory/GrnHistory";
import { GoodsReceivedScreen } from "./inventory/GoodsReceived";
import { PurchaseOrdersScreen } from "./inventory/PurchaseOrders";
import { AdjustmentsScreen } from "./inventory/Adjustments";
import { NewAdjustmentScreen } from "./inventory/NewAdjustment";
import { TransfersScreen } from "./inventory/Transfers";
import { SuppliersScreen } from "./inventory/Suppliers";
import { AccountingOverviewScreen } from "./accounting/Overview";
import { ChartOfAccountsScreen } from "./accounting/ChartOfAccounts";
import { JournalScreen } from "./accounting/Journal";
import { ExpensesScreen } from "./accounting/Expenses";
import { PayablesScreen } from "./accounting/Payables";
import { ReconciliationScreen } from "./accounting/Reconciliation";
import { TaxScreen } from "./accounting/Tax";
import { Placeholder } from "./Placeholder";

const known = new Set([
  "pos/register",
  "pos/checkout",
  "pos/invoice",
  "pos/new-sale",
  "pos/dashboard",
  "pos/orders",
  "pos/tables",
  "pos/sales",
  "pos/products",
  "pos/customers",
  "pos/reports",
  "pos/settings",
  "pos/sync",
  "inventory/overview",
  "inventory/stock-items",
  "inventory/add-stock-item",
  "inventory/recipes",
  "inventory/grn-history",
  "inventory/purchases",
  "inventory/purchase-orders",
  "inventory/adjustments",
  "inventory/new-adjustment",
  "inventory/transfers",
  "inventory/suppliers",
  "accounting/overview",
  "accounting/accounts",
  "accounting/journal",
  "accounting/expenses",
  "accounting/payables",
  "accounting/reconciliation",
  "accounting/tax",
]);

function Unknown() {
  return (
    <Placeholder
      title={route().screen}
      subtitle="This screen is being translated from the design export."
      icon="widgets"
    />
  );
}

/**
 * The screen switch. Every screen is mounted only while its route is active,
 * so each one owns its signals and drops them on the way out.
 */
export function ScreenHost() {
  const key = () => route().app + "/" + route().screen;

  return (
    <View class="flex-1 flex-col min-h-0">
      <If when={key() === "pos/register"}>
        <RegisterScreen />
      </If>
      <If when={key() === "pos/checkout"}>
        <CheckoutScreen />
      </If>
      <If when={key() === "pos/invoice"}>
        <InvoiceScreen />
      </If>
      <If when={key() === "pos/new-sale"}>
        <NewSaleScreen />
      </If>
      <If when={key() === "pos/dashboard"}>
        <DashboardScreen />
      </If>
      <If when={key() === "pos/orders"}>
        <OrdersScreen />
      </If>
      <If when={key() === "pos/tables"}>
        <TablesScreen />
      </If>
      <If when={key() === "pos/sales"}>
        <SalesScreen />
      </If>
      <If when={key() === "pos/products"}>
        <ProductsScreen />
      </If>
      <If when={key() === "pos/customers"}>
        <CustomersScreen />
      </If>
      <If when={key() === "pos/reports"}>
        <ReportsScreen />
      </If>
      <If when={key() === "pos/settings"}>
        <SettingsScreen />
      </If>
      <If when={key() === "pos/sync"}>
        <SyncScreen />
      </If>

      <If when={key() === "inventory/overview"}>
        <StockOverviewScreen />
      </If>
      <If when={key() === "inventory/stock-items"}>
        <StockItemsScreen />
      </If>
      <If when={key() === "inventory/add-stock-item"}>
        <AddStockItemScreen />
      </If>
      <If when={key() === "inventory/recipes"}>
        <RecipesScreen />
      </If>
      <If when={key() === "inventory/grn-history"}>
        <GrnHistoryScreen />
      </If>
      <If when={key() === "inventory/purchases"}>
        <GoodsReceivedScreen />
      </If>
      <If when={key() === "inventory/purchase-orders"}>
        <PurchaseOrdersScreen />
      </If>
      <If when={key() === "inventory/adjustments"}>
        <AdjustmentsScreen />
      </If>
      <If when={key() === "inventory/new-adjustment"}>
        <NewAdjustmentScreen />
      </If>
      <If when={key() === "inventory/transfers"}>
        <TransfersScreen />
      </If>
      <If when={key() === "inventory/suppliers"}>
        <SuppliersScreen />
      </If>

      <If when={key() === "accounting/overview"}>
        <AccountingOverviewScreen />
      </If>
      <If when={key() === "accounting/accounts"}>
        <ChartOfAccountsScreen />
      </If>
      <If when={key() === "accounting/journal"}>
        <JournalScreen />
      </If>
      <If when={key() === "accounting/expenses"}>
        <ExpensesScreen />
      </If>
      <If when={key() === "accounting/payables"}>
        <PayablesScreen />
      </If>
      <If when={key() === "accounting/reconciliation"}>
        <ReconciliationScreen />
      </If>
      <If when={key() === "accounting/tax"}>
        <TaxScreen />
      </If>

      <If when={!known.has(key())}>
        <Unknown />
      </If>
    </View>
  );
}
