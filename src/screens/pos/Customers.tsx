import { Overlay, Scroll, signal, Text, View, type ViewRef } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Avatar } from "../../ui/Avatar";
import { ProgressBar } from "../../ui/Charts";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { Modal } from "../../ui/Modal";
import { Drawer } from "../../ui/Drawer";
import { TextBox } from "../../ui/Field";
import { searchQuery } from "../../store";
import { customers, type Customer } from "../../data/mock";
import { money, count } from "../../format";

const tiers = ["All", "Gold", "Silver", "Bronze"] as const;

const tierTone: Record<Customer["tier"], "amber" | "neutral" | "plum"> = {
  Gold: "amber",
  Silver: "neutral",
  Bronze: "plum",
};

export function CustomersScreen() {
  const tier = signal<(typeof tiers)[number]>("All");
  const tierOpen = signal(false);
  const tierAnchor = signal<ViewRef | null>(null);
  const addOpen = signal(false);
  const addName = signal("");
  const addPhone = signal("");
  const addAddress = signal("");
  const selected = signal<Customer | null>(null);

  const visible = () =>
    customers.filter((customer) => {
      const inTier = tier() === "All" || customer.tier === tier();
      const query = searchQuery().trim().toLowerCase();
      const inQuery =
        query === "" ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query);
      return inTier && inQuery;
    });

  const totalSpend = () => customers.reduce((sum, customer) => sum + customer.spend, 0);

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">
            Customers & loyalty
          </Text>
          <Text class="font-body text-body-sm text-outline">
            {customers.length} members · 1 in 3 orders is linked to a member
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Loyalty settings" icon="tune" />
          <Button label="Add member" icon="person_add" variant="primary" onPress={() => addOpen.set(true)} />
        </View>
      </View>

      <View class="flex-row flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
        <Text class="font-body text-body-sm text-on-surface-variant">
          Members {count(customers.length)}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Gold {count(customers.filter((c) => c.tier === "Gold").length)}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Spend {money(totalSpend())}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Stamp card · 10 stamps = free drink
        </Text>
      </View>

      <View class="flex-row items-center gap-3">
        <Text class="font-label text-label-sm uppercase tracking-label text-outline">Tier</Text>
        <View class="w-36">
          <View
            ref={(node) => tierAnchor.set(node)}
            role="button"
            accessibilityLabel="Filter tier"
            onPress={() => tierOpen.set(!tierOpen())}
            class="h-8 flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-lowest px-3"
          >
            <Text class="font-body text-body-sm text-on-surface">{tier()}</Text>
            <Icon name="expand_more" size={16} color="#6B5752" />
          </View>
          <If when={tierOpen()}>
            <Overlay
              anchor={tierAnchor()}
              placement="bottom"
              align="start"
              offset={4}
              onPressOutside={() => tierOpen.set(false)}
            >
              <View class="w-36 rounded-md border border-outline-variant bg-surface-container-lowest p-1">
                <Each of={tiers}>
                  {(name) => (
                    <View
                      role="button"
                      accessibilityLabel={"Filter by " + name()}
                      onPress={() => {
                        tier.set(name());
                        tierOpen.set(false);
                      }}
                      class={
                        "flex-row items-center justify-between gap-2 rounded-sm px-2 py-1.5 " +
                        (tier() === name()
                          ? "bg-surface-variant"
                          : "hover:bg-surface-container-low")
                      }
                    >
                      <Text class="font-body text-body-sm text-on-surface">{name()}</Text>
                      <Text class="font-label text-label-sm tabular-nums text-outline">
                        {name() === "All"
                          ? customers.length
                          : customers.filter((c) => c.tier === name()).length}
                      </Text>
                    </View>
                  )}
                </Each>
              </View>
            </Overlay>
          </If>
        </View>
        <Text class="font-body text-body-sm text-outline">
          Showing {visible().length} of {customers.length} members
        </Text>
        <View class="flex-1" />
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="Member" flex={2.4} />
            <HeadCell label="Phone" flex={1.5} />
            <HeadCell label="Tier" flex={1} />
            <HeadCell label="Stamp card" flex={1.8} />
            <HeadCell label="Visits" w={64} align="right" />
            <HeadCell label="Spend" flex={1.1} align="right" />
            <HeadCell label="Last visit" flex={1.1} />
          </Head>
          <Each of={visible()}>
            {(customer) => (
              <Row onPress={() => selected.set(customer())}>
                <Cell flex={2.4}>
                  <View class="flex-row items-center gap-2.5">
                    <Avatar initials={customer().initials} tone={tierTone[customer().tier]} />
                    <View class="gap-0 min-w-0">
                      <Text class="font-label text-label-lg text-on-surface truncate">{customer().name}</Text>
                      <Text class="font-body text-body-sm text-outline truncate">
                        Loves {customer().favorite}
                      </Text>
                    </View>
                  </View>
                </Cell>
                <Cell flex={1.5}>
                  <Text class="font-body text-body-md tabular-nums text-on-surface-variant">{customer().phone}</Text>
                </Cell>
                <Cell flex={1}>
                  <View
                    class={
                      "self-start rounded-full px-2 py-0.5 " +
                      (customer().tier === "Gold"
                        ? "bg-amber-container"
                        : customer().tier === "Silver"
                          ? "bg-surface-container"
                          : "bg-plum-container")
                    }
                  >
                    <Text class="font-label text-label-sm text-on-surface">{customer().tier}</Text>
                  </View>
                </Cell>
                <Cell flex={1.8}>
                  <View class="w-full gap-1">
                    <View class="flex-row items-center justify-between">
                      <Text class="font-label text-label-sm tabular-nums text-on-surface">
                        {customer().stamps} / 10
                      </Text>
                      <Text class="font-body text-body-sm text-outline">
                        {customer().stamps >= 8 ? "Free drink soon" : "Keep going"}
                      </Text>
                    </View>
                    <ProgressBar
                      value={customer().stamps / 10}
                      height={5}
                      color={customer().stamps >= 8 ? "#3F5E27" : "#B44326"}
                    />
                  </View>
                </Cell>
                <TextCell text={count(customer().visits)} w={64} align="right" muted />
                <TextCell text={money(customer().spend)} flex={1.1} align="right" strong />
                <Cell flex={1.1}>
                  <Text class="font-body text-body-md text-outline">{customer().lastVisit}</Text>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <If when={addOpen()}>
        <Modal onClose={() => addOpen.set(false)} width={420}>
          <View class="gap-3 p-4">
            <Text class="font-title text-title-lg text-on-surface">New member</Text>
            <TextBox
              value={addName()}
              onChange={(value) => addName.set(value)}
              placeholder="Full name"
              icon="person"
            />
            <TextBox
              value={addPhone()}
              onChange={(value) => addPhone.set(value)}
              placeholder="Phone number"
              icon="call"
            />
            <TextBox
              value={addAddress()}
              onChange={(value) => addAddress.set(value)}
              placeholder="Address"
              icon="location_on"
            />
            <View class="flex-row justify-end gap-2">
              <Button label="Cancel" onPress={() => addOpen.set(false)} />
              <Button
                label="Add member"
                variant="primary"
                icon="person_add"
                onPress={() => {
                  const name = addName().trim();
                  if (!name) return;
                  const initials = name
                    .split(/\s+/)
                    .map((part) => part[0] ?? "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const customer: Customer = {
                    id: "c-" + Date.now(),
                    name,
                    initials: initials || "?",
                    phone: addPhone().trim() || "-",
                    address: addAddress().trim() || "-",
                    tier: "Bronze",
                    stamps: 0,
                    visits: 0,
                    spend: 0,
                    lastVisit: "Today",
                    favorite: "-",
                  };
                  customers.push(customer);
                  addName.set("");
                  addPhone.set("");
                  addAddress.set("");
                  addOpen.set(false);
                }}
              />
            </View>
          </View>
        </Modal>
      </If>

      <If when={selected() !== null}>
        {() => {
          const c = selected();
          if (!c) return null;
          return (
            <Drawer onClose={() => selected.set(null)} title={c.name} subtitle={c.tier + " member"}>
              <Scroll class="flex-1" contentClass="p-4 gap-3">
                <View class="flex-row items-center gap-3">
                  <Avatar initials={c.initials} tone={tierTone[c.tier]} />
                  <View class="gap-0">
                    <Text class="font-title text-title-md text-on-surface">{c.name}</Text>
                    <Text class="font-body text-body-sm text-outline">{c.phone}</Text>
                  </View>
                </View>
                <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
                  <Text class="font-label text-label-sm uppercase text-outline">Details</Text>
                  <Text class="font-body text-body-md text-on-surface">Address: {c.address}</Text>
                  <Text class="font-body text-body-md text-on-surface">Tier: {c.tier}</Text>
                  <Text class="font-body text-body-md text-on-surface">Stamps: {c.stamps}/10</Text>
                  <Text class="font-body text-body-md text-on-surface">Visits: {c.visits}</Text>
                  <Text class="font-body text-body-md text-on-surface">Spend: {money(c.spend)}</Text>
                  <Text class="font-body text-body-md text-on-surface">Last visit: {c.lastVisit}</Text>
                  <Text class="font-body text-body-md text-on-surface">Favorite: {c.favorite}</Text>
                </View>
              </Scroll>
            </Drawer>
          );
        }}
      </If>
    </View>
  );
}
