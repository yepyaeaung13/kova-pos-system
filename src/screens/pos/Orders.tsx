import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Drawer } from "../../ui/Drawer";
import { ApprovalModal } from "../../ui/ApprovalModal";
import { Button } from "../../ui/Button";
import { Chip, StatusPill } from "../../ui/Badge";
import { advanceOrder, kitchen, navigate, voidKitchenOrder } from "../../store";
import { money } from "../../format";
import type { OrderStatus } from "../../data/mock";

const columns: { status: OrderStatus; label: string; hint: string; tone: "info" | "warn" | "success" | "neutral" }[] = [
  { status: "New", label: "New", hint: "Sent to the kitchen", tone: "info" },
  { status: "Preparing", label: "Preparing", hint: "On the line", tone: "warn" },
  { status: "Ready", label: "Ready", hint: "Waiting to be served", tone: "success" },
  { status: "Completed", label: "Completed", hint: "Paid and served", tone: "neutral" },
];

const nextLabel: Record<OrderStatus, string> = {
  New: "Start preparing",
  Preparing: "Mark ready",
  Ready: "Serve & close",
  Completed: "Reopen",
};

export function OrdersScreen() {
  const filter = signal("All");
  const selected = signal<string | null>(null);
  const done = signal("");
  const voiding = signal(false);
  const current = () => kitchen().find((order) => order.id === selected()) ?? null;
  const channels = ["All", "Dine-in", "Takeaway", "Delivery"];

  const rows = () =>
    kitchen().filter((order) => filter() === "All" || order.channel === filter());

  return (
    <View class="flex-1 flex-col gap-4 p-6 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Orders</Text>
          <Text class="font-body text-body-sm text-outline">
            Kitchen queue · {kitchen().length} tickets across four stations
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="New order" icon="add" variant="primary" onPress={() => navigate("register")} />
        </View>
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={channels}>
          {(name) => (
            <Chip
              label={name()}
              selected={filter() === name()}
              count={name() === "All" ? kitchen().length : kitchen().filter((row) => row.channel === name()).length}
              onPress={() => filter.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <View class="flex-row items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5">
          <Icon name="schedule" size={16} color="#6B5752" />
          <Text class="font-label text-label-sm tabular-nums text-on-surface-variant">
            Avg ticket 4m 20s
          </Text>
        </View>
      </View>

      <View class="flex-1 flex-row gap-3 min-h-0">
        <Each of={columns}>
          {(column) => {
            const tickets = () => rows().filter((order) => order.status === column().status);
            return (
              <View class="flex-1 flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-2.5 min-h-0">
                <View class="flex-row items-center justify-between px-1 pb-1">
                  <View class="flex-row items-center gap-2">
                    <StatusPill label={column().label} tone={column().tone} />
                    <Text class="font-label text-label-sm tabular-nums text-outline">
                      {tickets().length}
                    </Text>
                  </View>
                  <Icon name="more_horiz" size={16} color="#6B5752" />
                </View>
                <Text class="px-1 pb-1 font-body text-body-sm text-outline">{column().hint}</Text>

                <View class="flex-1 gap-2 min-h-0">
                  <Each of={tickets()}>
                    {(order) => (
                      <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
                        <View
                          role="button"
                          accessibilityLabel={"Open ticket " + order().id}
                          onPress={() => {
                            selected.set(order().id);
                            done.set("");
                          }}
                          class="flex-row items-start justify-between gap-2 min-w-0"
                        >
                          <View class="gap-0 min-w-0 flex-1">
                            <Text class="font-title text-title-md tabular-nums text-on-surface truncate">
                              #{order().id}
                            </Text>
                            <Text class="font-body text-body-sm text-outline truncate">
                              {order().table} · {order().channel} · {order().placed}
                            </Text>
                          </View>
                          <View class="flex-row items-center gap-1.5 shrink-0">
                            <Text class="font-label text-label-md tabular-nums text-on-surface">
                              {money(order().total)}
                            </Text>
                            <Icon name="chevron_right" size={16} color="#6B5752" />
                          </View>
                        </View>

                        <View class="gap-1 border-t border-outline-variant/60 pt-2">
                          <Each of={order().items}>
                            {(item) => (
                              <View class="flex-row items-start gap-1.5">
                                <View class="mt-1.5 h-1 w-1 rounded-full bg-outline" />
                                <Text class="flex-1 font-body text-body-sm text-on-surface-variant break-words min-w-0">
                                  {item()}
                                </Text>
                              </View>
                            )}
                          </Each>
                        </View>

                        <If when={order().status !== "Completed"}>
                          <Button
                            label={nextLabel[order().status]}
                            size="sm"
                            variant={order().status === "Ready" ? "primary" : "secondary"}
                            class="whitespace-normal text-center"
                            onPress={() => advanceOrder(order().id)}
                          />
                        </If>
                        <If when={order().status === "Completed"}>
                          <Button
                            label="View invoice"
                            size="sm"
                            variant="ghost"
                            iconRight="arrow_forward"
                            class="whitespace-normal text-center"
                            onPress={() => navigate("invoice")}
                          />
                        </If>
                      </View>
                    )}
                  </Each>
                  <If when={tickets().length === 0}>
                    <View class="items-center justify-center gap-1.5 rounded-md border border-dashed border-outline-variant py-8">
                      <Icon name="inbox" size={22} color="#6B5752" />
                      <Text class="font-body text-body-sm text-outline">Nothing here</Text>
                    </View>
                  </If>
                </View>
              </View>
            );
          }}
        </Each>
      </View>

      <If when={current()}>
        {() => {
          const order = current();
          if (!order) return null;
          const timeline = ["New", "Preparing", "Ready", "Completed"];
          const at = timeline.indexOf(order.status);
          return (
            <Drawer
              onClose={() => selected.set(null)}
              title={"Ticket #" + order.id}
              subtitle={order.table + " · " + order.channel + " · " + order.placed}
            >
              <Scroll class="flex-1" contentClass="p-4 gap-4">
                <View class="flex-row items-center justify-between gap-2">
                  <StatusPill
                    label={order.status}
                    tone={
                      order.status === "New"
                        ? "info"
                        : order.status === "Preparing"
                          ? "warn"
                          : order.status === "Ready"
                            ? "success"
                            : "neutral"
                    }
                  />
                  <Text class="font-title text-title-lg tabular-nums text-on-surface">
                    {money(order.total)}
                  </Text>
                </View>

                <If when={done() !== ""}>
                  <View class="flex-row items-center gap-2 rounded border border-secondary/20 bg-secondary-container px-3 py-2">
                    <Icon name="check_circle" size={16} color="#3F5E27" />
                    <Text class="font-body text-body-sm text-on-secondary-container">{done()}</Text>
                  </View>
                </If>

                <View class="gap-2">
                  <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                    Items
                  </Text>
                  <Each of={order.items}>
                    {(item) => (
                      <View class="flex-row items-start gap-2 border-t border-outline-variant/60 pt-2">
                        <View class="mt-1.5 h-1 w-1 rounded-full bg-outline" />
                        <Text class="flex-1 font-body text-body-md text-on-surface">{item()}</Text>
                      </View>
                    )}
                  </Each>
                </View>

                <View class="gap-2">
                  <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                    Ticket timeline
                  </Text>
                  <Each of={timeline}>
                    {(step, index) => (
                      <View class="flex-row items-center gap-2">
                        <View
                          class={
                            "h-5 w-5 items-center justify-center rounded-full " +
                            (index() <= at ? "bg-primary-container" : "bg-surface-container")
                          }
                        >
                          <If when={index() < at}>
                            <Icon name="check" size={11} color="#FFFFFF" />
                          </If>
                          <If when={index() === at}>
                            <View class="h-1.5 w-1.5 rounded-full bg-on-primary" />
                          </If>
                        </View>
                        <Text
                          class={
                            "font-body text-body-md " +
                            (index() <= at ? "text-on-surface" : "text-outline")
                          }
                        >
                          {step()}
                        </Text>
                      </View>
                    )}
                  </Each>
                </View>

                <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Channel</Text>
                    <Text class="font-label text-label-md text-on-surface">{order.channel}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Placed</Text>
                    <Text class="font-label text-label-md text-on-surface">{order.placed}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Total</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(order.total)}
                    </Text>
                  </View>
                </View>
              </Scroll>

              <View class="gap-2 border-t border-outline-variant p-4">
                <If when={order.status !== "Completed"}>
                  <Button
                    label={"Advance · " + nextLabel[order.status]}
                    variant={order.status === "Ready" ? "primary" : "secondary"}
                    class="whitespace-normal"
                    onPress={() => {
                      advanceOrder(order.id);
                      done.set("Moved to " + nextLabel[order.status].toLowerCase() + ".");
                    }}
                  />
                </If>
                <View class="flex-row gap-2">
                  <Button
                    label="Reprint ticket"
                    icon="print"
                    grow
                    onPress={() => done.set("Ticket sent to the kitchen printer.")}
                  />
                  <Button
                    label="Void ticket"
                    icon="block"
                    variant="danger"
                    grow
                    onPress={() => voiding.set(true)}
                  />
                </View>
              </View>
            </Drawer>
          );
        }}
      </If>

      <If when={voiding()}>
        {() => {
          const order = current();
          if (!order) return null;
          return (
            <ApprovalModal
              title="Approve void"
              detail={"Void ticket #" + order.id + " · " + money(order.total)}
              onClose={() => voiding.set(false)}
              onApprove={() => {
                voidKitchenOrder(order.id);
                voiding.set(false);
                selected.set(null);
              }}
            />
          );
        }}
      </If>
    </View>
  );
}
