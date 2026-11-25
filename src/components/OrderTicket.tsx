// Kova ERP — OrderTicket component (right-hand panel on the POS register)
import { View, Text, Image } from "nsh";
import { colorClass, typeClass, radius } from "../design/tokens";

interface OrderLineItem {
  id: string;
  name: string;
  modifiers: string;
  priceCents: number;
  qty: number;
  imageUrl: string;
}

interface OrderTicketProps {
  orderNo: string;
  tableLabel: string;
  guests: number;
  openedAt: string;
  channel: "Dine-in" | "Takeaway" | "Delivery";
  customer?: { name: string; avatar: string; loyaltyPoints: number };
  items: OrderLineItem[];
  discountCents: number;
  promoCode?: string;
  subtotalCents: number;
  taxCents: number;
  grandTotalCents: number;
  onCharge: () => void;
  onHold: () => void;
  onSplit: () => void;
  onClear: () => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  class?: string;
}

export function OrderTicket({
  orderNo,
  tableLabel,
  guests,
  openedAt,
  channel,
  customer,
  items,
  discountCents,
  promoCode,
  subtotalCents,
  taxCents,
  grandTotalCents,
  onCharge,
  onHold,
  onSplit,
  onClear,
  onIncrease,
  onDecrease,
  class: className,
}: OrderTicketProps) {
  const total = (grandTotalCents / 100).toFixed(2);
  const subtotal = (subtotalCents / 100).toFixed(2);
  const discount = (discountCents / 100).toFixed(2);

  return (
    <View class={[`w-[330px] shrink-0 bg-surface-container-lowest border-l border-outline-variant flex flex-col justify-between p-lg`, className].filter(Boolean).join(" ")}>
      {/* Order header */}
      <View class="flex items-start justify-between gap-md">
        <View>
          <Text class={typeClass("headline-md")} tabular-nums>Order #{orderNo}</Text>
          <Text class={typeClass("body-sm")}>{`${tableLabel} · ${guests} guests · Opened ${openedAt}`}</Text>
        </View>
        <View class="flex items-center gap-xs">
          <View class="w-8 h-8 rounded-sm border border-outline-variant text-on-surface-variant flex items-center justify-center hover:bg-surface-container" />
          <View class="w-8 h-8 rounded-sm border border-outline-variant text-error flex items-center justify-center hover:bg-error-container" />
        </View>
      </View>

      {/* Fulfillment tabs */}
      <View class="grid grid-cols-3 gap-xs bg-surface-container-low p-xs rounded-sm">
        <View class="py-sm rounded-sm bg-surface-container-lowest text-on-surface font-label text-label-md border border-outline-variant">{channel}</View>
        <View class="py-sm rounded-sm text-on-surface-variant font-label text-label-md hover:text-on-surface">Takeaway</View>
        <View class="py-sm rounded-sm text-on-surface-variant font-label text-label-md hover:text-on-surface">Delivery</View>
      </View>

      {/* Customer loyalty card */}
      {customer && (
        <View class="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-md p-md my-md">
          <View class="flex items-center gap-md">
            <View class="w-9 h-9 rounded-full bg-amber-container text-on-amber-container flex items-center justify-center">
              <Text class={`${typeClass("label-md")} tabular-nums`}>{customer.name.charAt(0) + customer.name.split(" ")[1]?.charAt(0)}</Text>
            </View>
            <View class="flex flex-col">
              <Text class={typeClass("title-md")}>{customer.name}</Text>
              <Text class={typeClass("body-sm")}>Gold member · {customer.loyaltyPoints} pts</Text>
            </View>
          </View>
          <View class="text-[18px] text-outline">›</View>
        </View>
      )}

      {/* Order line items */}
      <View class="flex-1 flex flex-col gap-md divide-y divide-outline-variant">
        {items.map((item) => (
          <View key={item.id} class="flex items-center justify-between gap-sm pt-xs">
            <View class="flex items-center gap-sm">
              <Image src={item.imageUrl} alt={item.name} class="w-10 h-10 rounded-sm object-cover" />
              <View class="flex flex-col">
                <Text class={typeClass("title-md")}>{item.name}</Text>
                <Text class={typeClass("body-sm")}>{item.modifiers}</Text>
              </View>
            </View>
            <View class="flex flex-col items-end gap-xs">
              <Text class={typeClass("title-md")} tabular-nums>${`$${(item.priceCents / 100).toFixed(2)}`}</Text>
              <View class="flex items-center gap-sm bg-surface-container-low border border-outline-variant rounded-sm px-xs">
                <View onPress={() => onDecrease(item.id)} class="text-on-surface-variant px-xs">−</View>
                <Text class={typeClass("label-md")} tabular-nums>{item.qty}</Text>
                <View onPress={() => onIncrease(item.id)} class="text-on-surface-variant px-xs">+</View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Totals & Charge CTA */}
      <View class="flex flex-col gap-md pt-lg border-t border-outline-variant">
        {promoCode && (
          <View class="flex items-center justify-between bg-secondary-container text-on-secondary-container rounded px-md py-sm">
            <View class="flex items-center gap-xs">
              <View class="text-[16px]">sell</View>
              <Text class={typeClass("label-md")}>{`${promoCode} applied · 10% off`}</Text>
            </View>
            <View class="hover:opacity-75">×</View>
          </View>
        )}
        <View class="flex flex-col gap-xs">
          <View class="flex justify-between text-body-md text-on-surface-variant">
            <Text class={typeClass("body-md")}>Subtotal</Text>
            <Text class={typeClass("body-md")} tabular-nums>${`$${subtotal}`}</Text>
          </View>
          {discountCents > 0 && (
            <View class="flex justify-between text-body-md text-secondary">
              <Text class={typeClass("body-md")}>Discount</Text>
              <Text class={typeClass("body-md")} tabular-nums>−$${discount}</Text>
            </View>
          )}
          <View class="flex justify-between text-body-md text-on-surface-variant">
            <Text class={typeClass("body-md")}>Tax (8%)</Text>
            <Text class={typeClass("body-md")} tabular-nums>${`$${(taxCents / 100).toFixed(2)}`}</Text>
          </View>
          <View class="flex justify-between items-baseline pt-sm border-t border-outline-variant">
            <Text class={typeClass("title-lg")}>Total</Text>
            <Text class={typeClass("headline-md")} tabular-nums>${`$${total}`}</Text>
          </View>
        </View>
        <View class="flex items-center gap-sm">
          <View onPress={onHold} class="w-11 h-11 rounded bg-surface-container-low border border-outline-variant text-on-surface flex items-center justify-center hover:bg-surface-container">
            <View class="text-[20px]">‖</View>
          </View>
          <View onPress={onSplit} class="w-11 h-11 rounded bg-surface-container-low border border-outline-variant text-on-surface flex items-center justify-center hover:bg-surface-container">
            <View class="text-[20px]">↔</View>
          </View>
          <View onPress={onCharge} class="flex-1 h-11 inline-flex items-center justify-center gap-sm px-lg rounded bg-primary-container text-on-primary hover:bg-primary active:bg-primary">
            <Text class={typeClass("label-lg")} tabular-nums>Charge ${total}</Text>
            <View class="text-[18px]">›</View>
          </View>
        </View>
      </View>
    </View>
  );
}

