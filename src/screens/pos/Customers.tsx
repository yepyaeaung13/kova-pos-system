import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Badge";
import { Avatar } from "../../ui/Avatar";
import { StatTile } from "../../ui/Card";
import { ProgressBar } from "../../ui/Charts";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
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
    <View class="flex-1 flex-col gap-4 p-6 min-h-0">
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
          <Button label="Add member" icon="person_add" variant="primary" />
        </View>
      </View>

      <View class="flex-row gap-3">
        <StatTile label="Members" value={count(customers.length)} delta="+6 this week" positive hint="signups" icon="group" />
        <StatTile label="Gold members" value={count(customers.filter((c) => c.tier === "Gold").length)} hint="top 20% of spend" icon="workspace_premium" tone="warn" />
        <StatTile label="Member spend" value={money(totalSpend())} delta="+22.8%" positive hint="all time" icon="savings" tone="success" />
        <StatTile label="Points issued" value={count(6420)} hint="this month" icon="stars" tone="plum" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={tiers}>
          {(name) => (
            <Chip
              label={name()}
              selected={tier() === name()}
              count={name() === "All" ? customers.length : customers.filter((c) => c.tier === name()).length}
              onPress={() => tier.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <View class="flex-row items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5">
          <Icon name="card_giftcard" size={16} color="#6B5752" />
          <Text class="font-label text-label-sm text-on-surface-variant">
            Stamp card · 10 stamps = free drink
          </Text>
        </View>
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
              <Row>
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
    </View>
  );
}
