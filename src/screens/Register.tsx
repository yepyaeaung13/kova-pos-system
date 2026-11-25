// Kova ERP — Desktop Register (POS) screen
// Layout: 200px left nav rail + main menu workspace + 330px right order ticket
import { View, Text, Scroll, signal } from "nsh";
import { Input } from "nsh/base";
import { NavRail } from "../components/NavRail";
import { MenuCard } from "../components/MenuCard";
import { OrderTicket } from "../components/OrderTicket";
import { SyncPill } from "../components/SyncPill";
import { Chip } from "../components/Chip";
import { StitchButton } from "../components/Button";
import { typeClass, colorClass, radius } from "../design/tokens";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  imageUrl: string;
  selectedQty?: number;
  modifiers?: string;
  soldOut?: boolean;
}

interface OrderLineItem {
  id: string;
  name: string;
  modifiers: string;
  priceCents: number;
  qty: number;
  imageUrl: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "latte", name: "Café Latte", description: "12 oz · Hot", priceCents: 450, category: "Coffee", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrCxzueDyEP69y0Zdlll-jdfTcncIGqjbqzVluqpo6oSnpom1pdaPLMHsBF0WDJgsq_qLqZO4XyHb33hm6Z-agranoDxf0c9w6iqVlvIsiY72ptuJ6SddhUsFfcLQnWWGhoRgj57q_H7Cj3Bif_b0AIa6fE4fb8-zuMfcTPHuxAItPkcI738dDulBg3wvSOL2CzMpumcHc02-r2xgy-rKVHG0C0uSZeirEMzGq82s9vZ7kIOPw", selectedQty: 2 },
  { id: "cappuccino", name: "Cappuccino", description: "8 oz · Hot", priceCents: 420, category: "Coffee", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrAkqJNd8ecA-m_BHMKFJBZRgwh7FfOdwmaT31jGSjk1RjraIJ4bVr3xtXcVUJhvydgAKHINpktLWIo-ud9foFwQgPrqzjsN7r0W5WrIE6z_unr1U1tEKwXhbpSRoAGK8WUxyEGvIctKH_NU4LvHGGVf3QQb50q678MXpZfxQRK2HvxYUm0nPTvIO19wlPJMbSX1ulOXE12gL8G5ysDuCn0BN3cgf6G-tx4jMqDxrpEC44rWzA" },
  { id: "flat-white", name: "Flat White", description: "6 oz · Hot", priceCents: 480, category: "Coffee", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrBhC9nnX9W-QJnrGch_J4pqiux1XozfvObWnYmcHChN7F3xWKGGbDfGTyz9qEVxx5SaTy3040KiMlRAQUGg-PumoHcETkG89OCd8zMX7OONiu_rHnMex-6N91Ll6tDHQc7reP1NW59cwT8FSZvJ4z1zpQZHe9zqtKC8ve7CUzXVkOA8L-DwVj3bkwKHcl9JZayUTxeKqG545FXatPJ_STZ5S6SDG0a-hTGwWE-EwrFmaLOPTQ" },
  { id: "americano", name: "Americano", description: "12 oz · Hot", priceCents: 360, category: "Coffee", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrBXJh3Fcu3gsK0VgpSmLP5iI9DT-DZ4GTkX3vUdavSKHHWVhJhG9rTh4FEdNSQxT5k83YKqcpX7DangKiYgI1no5-Ux_K4Q92XMIPTzkY8mQT6p_FgkHGXuM6ScxW6wdTHKfEDkVRsyPiN-hAwrLtPhC9xqn0wAvTynLPqi1AG8NhevOLTM-1EONYwbosEX89yuGwhn4di5YbpGMcodwIMZZ_Vp5i5vAVJPX5pSdDCvLgSQ" },
  { id: "iced-mocha", name: "Iced Mocha", description: "16 oz · Iced", priceCents: 540, category: "Cold drinks", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrAYcIL0dyHUE34B_FUD8cDIGdaretz5wDs1c-Tf4NwohRRdEaV7KZ3oTx4qllxBRV1pbUqGW752jWTGX_Z2jpTsE7lQvRrbm7n07mg5PpFzrF5J2UW0ctJ31eoUaqSU1QvyslDDBeO6imRfcKMxgyzu2C1T46ipOsSHrGROXSo6qFfBVzfmpx_64WgB6-y8z_BPMu5HZwfgdnO5HgEtHwj-GTT1LWkFwU6eek5u2gcEMoe4", selectedQty: 1 },
  { id: "cold-brew", name: "Cold Brew", description: "16 oz · Iced", priceCents: 460, category: "Cold drinks", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrAUrkY0S4ZxFvoxPHY0oAxgZYDVHKIOgbgcNzPLVy-hiVxMiVNESg9JbJ73XHmCXeD87I7tTZzDlW7X3Ywt06t_qqxEhDf3pfWkUp2yl37OY-sNno39rL-HeThLcX3HLEr09-encG709ptgaa9ZKgJIskRiO4WVM_MHfQh-JJJ7ZTEhb8tmb0zzjSTDAC97Z-h4L4ii6epmyWDHSovj2roGIou7mRpXWVxMwaPcRWLbscoW" },
  { id: "butter-croissant", name: "Butter Croissant", description: "Bakery", priceCents: 320, category: "Bakery", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrA_Vrtm-305SR7HCTDSWCZQPnOU6JaFXOGM1u0T1g-NMlEXOsw2DBwVhDJ2jWCSSrodXjkRV7arfldZZeLimGJxGNiAyKx1SaT3ht9aA0DenCZx3d5itibI1q5BGvMIvBu_YL_lyqPD9iRhTiW4j30Q2uQf1w8cqw3epR2ynTKAj136hcb0YmK6ygy6lWdsE1VlfWZp_2lWtMwizRiiaU733HgaP8ZCaeQt5UDU0mMrBlgX5ikCZFqGwMA", selectedQty: 2 },
  { id: "almond-croissant", name: "Almond Croissant", description: "Bakery", priceCents: 380, category: "Bakery", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrCQ5sKYXkLR352NHkqf6Zz6l5kvWPNU5LZAGKpNHZPCc3RggjXzKfQpYa5kKrwl48f3TGJSEVwlDN8cLBK91VjajVxVugybIlvQz2f3rgYsEDC27i74BB7T1gI4s2wSL8tkFD6AOow_sZJM7ju8OdN0GkgWXyHFjAW_U4POWsE5LscKJoOs8kF7ybVWT7pViteeyfmbXrpLLEax0r22wcTFs6pxsqvtCpwecVahdfupAW1e2nA8goSgfhw", soldOut: true },
  { id: "ny-cheesecake", name: "NY Cheesecake", description: "Slice", priceCents: 590, category: "Desserts", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrBBSu2YZL2rG_49aaXQZauDykb6M0mK1fvUkXyJbgemfFWWXcriDX_dfTf96ensGtuI6wuFpbaqWYg4b4RdztNlEDguMUulVI_n5Th9gLPHq3YHrTDn9ddlnV0l8eJxbK9FXoKwyU630tBsInmPEunhtpllsmdf4jFceSXwsHuTr6yfAAlvgBYGW-FiUxgwPd4ODIP0h8Nx5uRvRZ1GmzBYZWCxVMxT0Z7FX2Yq8jeBaoEBWac1", selectedQty: 1 },
  { id: "blueberry-muffin", name: "Blueberry Muffin", description: "Bakery", priceCents: 350, category: "Bakery", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrAxrQPwJdsWRGrHzhucQCgi6nDMebD3UjYafT1Oa3lGYnqnhr2Ztfi7dtGu-6urpyv7l0uxfhfJMXW8uD56sf1Ij7XNdsPFu8sifBNoBZTVPPBzOTJOTcO9Y_2eMGJldhcvleVkGoheUMD82wHQS7CZMREH-H4eFzxMflfy3tzOHopxfON-ntUlclBtTvFVtSc1xAiTR7a3VZMVZDoNX6HCyMMtHg6O8VZniIBs2WpQgGmmI6PfKzkirw" },
  { id: "chicken-panini", name: "Chicken Panini", description: "Sandwich", priceCents: 890, category: "Sandwiches", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrAyJgVhw-bh0TquRvT5Iiwc2V3Os869Tf0pDNWz5Z6GHW1L1uiv6xZeJaBSTkMGxWNfK44oR2w-gfvTFimhb7cUrXN36zgfH3lzTmqmyuNzWt1b2eJJou-Tc7MhXepw78A5y7ZwS-MkhJqpG9KjPNSIFZcO3Ruanyr6kcXxY6OUpgLxQZAGWbEsmU10bI5QWWMezo-7alXwIvxdGc5xwRHNNG1046AOxL3KwzyMi407JA6UdnYNptUl" },
  { id: "avocado-toast", name: "Avocado Toast", description: "Brunch", priceCents: 950, category: "Sandwiches", imageUrl: "https://lh3.googleusercontent.com/aida/ALJJyrBl0OR82lrbLnYuK06R1Qpl9N-LXSlFk4zY7PrVHO0ZpjVd1oijrxh7k8wQN4YaIHDVN-s_BVdOY4qn-Tk9ajU-y3p4hw8aRblqwzHyb_Y4CdYf32g0OIRdC-GqI1eciNhhWvx40NboEfJmy1He9iTis9FRVDbptdZHUr4Asx4-OhXdototu0mfIUHjeArRBHh6X4kLtPyxRfPchFMvjK0JTvG4CL6sHdEVDwCo_8BXypgOsj81MA" },
];

const CATEGORIES = ["All", "Coffee", "Cold drinks", "Bakery", "Sandwiches", "Desserts"];

interface DesktopRegisterProps {
  onGotoCheckout: () => void;
  onGotoDashboard: () => void;
}

export function DesktopRegister({ onGotoCheckout, onGotoDashboard }: DesktopRegisterProps) {
  const activeCategory = signal("All");
  const searchQuery = signal("");
  const orderItems = signal<OrderLineItem[]>([]);
  const customer = signal({ name: "Ayesha Khan", loyaltyPoints: 320 } | null);

  // Derived totals
  const subtotalCents = orderItems.value.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const discountCents = Math.round(subtotalCents * 0.10); // MORNING10
  const taxCents = Math.round((subtotalCents - discountCents) * 0.08);
  const grandTotalCents = subtotalCents - discountCents + taxCents;

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchCat = activeCategory.value === "All" || item.category === activeCategory.value;
    const matchQuery = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchQuery;
  });

  const addItem = (item: MenuItem) => {
    const existing = orderItems.value.find((o) => o.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      orderItems.value = [
        ...orderItems.value,
        { id: item.id, name: item.name, modifiers: item.modifiers ?? "No modifiers", priceCents: item.priceCents, qty: 1, imageUrl: item.imageUrl },
      ];
    }
    // Update selected qty on menu item
    const menuItem = MENU_ITEMS.find((m) => m.id === item.id);
    if (menuItem) menuItem.selectedQty = (menuItem.selectedQty ?? 0) + 1;
  };

  const removeItem = (item: MenuItem) => {
    const existing = orderItems.value.find((o) => o.id === item.id);
    if (existing) {
      existing.qty -= 1;
      if (existing.qty <= 0) {
        orderItems.value = orderItems.value.filter((o) => o.id !== item.id);
      }
    }
    const menuItem = MENU_ITEMS.find((m) => m.id === item.id);
    if (menuItem && (menuItem.selectedQty ?? 0) > 0) {
      menuItem.selectedQty = (menuItem.selectedQty ?? 0) - 1;
    }
  };

  const increaseQty = (itemId: string) => {
    const item = MENU_ITEMS.find((m) => m.id === itemId);
    if (item) addItem(item);
  };

  const decreaseQty = (itemId: string) => {
    const item = MENU_ITEMS.find((m) => m.id === itemId);
    if (item) removeItem(item);
  };

  const handleCharge = () => {
    // TODO: POST to kova-sale /internal/sync/apply, then enqueue to sync_outbox
    console.log("Charge:", { subtotalCents, discountCents, taxCents, grandTotalCents, items: orderItems.value });
    orderItems.value = [];
    customer.value = null;
    onGotoCheckout();
  };

  const handleHold = () => {
    console.log("Hold order:", orderNo);
  };

  const handleSplit = () => {
    console.log("Split bill");
  };

  const handleClear = () => {
    orderItems.value = [];
  };

  const orderNo = "1049";
  const tableLabel = "Table 4";
  const guests = 2;
  const openedAt = "9:12 AM";
  const channel = "Dine-in";

  return (
    <View class="flex min-h-[1024px] bg-surface">
      {/* Left nav rail */}
      <NavRail activeScreen="register" cashierName="Sara Ahmed" cashierRole="Cashier" shiftOpenSince="8:00 AM" />

      {/* Main workspace */}
      <View class="flex-1 flex flex-col gap-lg p-lg min-w-0">
        {/* Search + sync header */}
        <View class="flex items-center justify-between gap-md">
          <View class="flex-1 flex items-center gap-sm bg-surface-container-lowest border border-outline-variant rounded-md px-md py-sm">
            <View class="text-[20px] text-outline">🔍</View>
            <Input
              placeholder="Search menu or scan a barcode…"
              value={searchQuery.value}
              onChange={(v: string) => searchQuery.value = v}
              class="w-full bg-transparent border-0 p-0 text-body-md text-on-surface outline-none"
            />
            <View class="text-outline hover:text-on-surface">📷</View>
          </View>
          <SyncPill online={true} pendingCount={0} onPress={() => {}} />
          <View class="inline-flex items-center justify-center w-10 h-10 rounded bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container">
            <View class="text-[20px]">🔔</View>
          </View>
        </View>

        {/* Category filter chips */}
        <View class="flex flex-wrap items-center gap-sm" role="group" aria-label="Menu categories">
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              variant="filter"
              pressed={activeCategory.value === cat}
              onPress={() => activeCategory.value = cat}
            >
              <Text class={typeClass("label-md")}>{cat}</Text>
              {cat === "All" && (
                <View class="px-xs py-xs rounded-full bg-inverse-surface text-inverse-on-surface tabular-nums">
                  <Text class={typeClass("label-sm")} font-label>{MENU_ITEMS.length}</Text>
                </View>
              )}
            </Chip>
          ))}
        </View>

        {/* Section title */}
        <View class="flex items-baseline justify-between">
          <Text class={typeClass("title-lg")} font-title>Popular right now</Text>
          <Text class={typeClass("body-sm")} text-outline tabular-nums>{`${filteredItems.length} of ${MENU_ITEMS.length} items`}</Text>
        </View>

        {/* Menu grid */}
        <Scroll>
          <View class="grid grid-cols-4 gap-md items-stretch">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onAdd={addItem}
                onRemove={removeItem}
              />
            ))}
          </View>
        </Scroll>
      </View>

      {/* Right order ticket panel */}
      <OrderTicket
        orderNo={orderNo}
        tableLabel={tableLabel}
        guests={guests}
        openedAt={openedAt}
        channel={channel}
        customer={customer.value}
        items={orderItems.value}
        discountCents={discountCents}
        promoCode="MORNING10"
        subtotalCents={subtotalCents}
        taxCents={taxCents}
        grandTotalCents={grandTotalCents}
        onCharge={handleCharge}
        onHold={handleHold}
        onSplit={handleSplit}
        onClear={handleClear}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
      />
    </View>
  );
}
