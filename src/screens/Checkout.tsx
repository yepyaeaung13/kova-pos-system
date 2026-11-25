// Kova ERP — Desktop Checkout screen
import { View, Text, signal } from "nsh";
import { Input, Link } from "nsh/base";
import { StitchButton, StitchCard } from "../components";
import { typeClass, colorClass } from "../design/tokens";

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}

interface DesktopCheckoutProps {
  onGotoRegister: () => void;
}

export function DesktopCheckout({ onGotoRegister }: DesktopCheckoutProps) {
  const orderNo = signal("INV-2026-1049");
  const grandTotalCents = signal(2595);
  const paymentMethod = signal<"Cash" | "Card" | "Split" | "Credit">("Card");
  const tenderedCents = signal(0);
  const changeCents = signal(0);

  const paymentMethods: PaymentMethod[] = [
    { id: "cash", name: "Cash", icon: "payments" },
    { id: "card", name: "Card", icon: "credit_card" },
    { id: "split", name: "Split", icon: "call_split" },
    { id: "credit", name: "Credit", icon: "person" },
  ];

  const handlePay = () => {
    // TODO: POST to kova-sale, emit kova.sale.completed event
    console.log("Payment:", paymentMethod.value, grandTotalCents.value);
  };

  const handleBack = () => {
    onGotoRegister();
  };

  const total = (grandTotalCents.value / 100).toFixed(2);

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
          <Link href="/register" onPress={handleBack} class="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container">
            <View class="text-[20px]">←</View>
            <Text class={typeClass("label-lg")} font-label>Back to POS</Text>
          </Link>
        </View>
      </View>

      {/* Main checkout workspace */}
      <View class="flex-1 flex flex-col p-lg min-w-0">
        <View class="flex items-center justify-between">
          <Text class={typeClass("headline-lg")} font-headline>Checkout</Text>
          <Text class={typeClass("body-sm")} text-outline>Order #{orderNo.value}</Text>
        </View>

        <View class="flex flex-col gap-lg my-lg">
          {/* Order summary */}
          <StitchCard variant="elevated" padding="md" class="w-full max-w-[600px]">
            <View class="flex flex-col gap-md">
              <View class="flex justify-between items-baseline">
                <Text class={typeClass("title-lg")} font-title>Order total</Text>
                <Text class={typeClass("headline-lg")} font-headline tabular-nums>${total}</Text>
              </View>
              <View class="flex justify-between text-body-md text-on-surface-variant">
                <Text class={typeClass("body-md")}>Subtotal</Text>
                <Text class={typeClass("body-md")} tabular-nums>$26.70</Text>
              </View>
              <View class="flex justify-between text-body-md text-secondary">
                <Text class={typeClass("body-md")}>Discount (MORNING10)</Text>
                <Text class={typeClass("body-md")} tabular-nums>−$2.67</Text>
              </View>
              <View class="flex justify-between text-body-md text-on-surface-variant">
                <Text class={typeClass("body-md")}>Tax (8%)</Text>
                <Text class={typeClass("body-md")} tabular-nums>$1.92</Text>
              </View>
              <View class="flex justify-between items-baseline pt-sm border-t border-outline-variant">
                <Text class={typeClass("title-lg")} font-title>Total</Text>
                <Text class={typeClass("headline-lg")} font-headline tabular-nums>$25.95</Text>
              </View>
            </View>
          </StitchCard>

          {/* Payment method selection */}
          <View class="w-full max-w-[600px]">
            <Text class={typeClass("title-lg")} font-title mb-md>Payment method</Text>
            <View class="grid grid-cols-4 gap-sm">
              {paymentMethods.map((pm) => (
                <View
                  key={pm.id}
                  onPress={() => paymentMethod.value = pm.id as any}
                  class={[
                    "flex flex-col items-center gap-xs p-md rounded-md border transition-colors duration-100 ease-out",
                    paymentMethod.value === pm.id
                      ? "border-2 border-primary-container bg-primary-container/10"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container",
                  ].filter(Boolean).join(" ")}
                >
                  <View class="text-[24px]">{pm.icon}</View>
                  <Text class={typeClass("body-md")}>{pm.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cash tendered (only for Cash) */}
          {paymentMethod.value === "Cash" && (
            <View class="w-full max-w-[600px] flex flex-col gap-sm">
              <Text class={typeClass("label-md")} font-label>Amount tendered</Text>
              <View class="flex items-center gap-sm bg-surface-container-lowest border border-outline-variant rounded-md px-md py-sm">
                <Text class={typeClass("label-md")} font-label>$</Text>
                <View class="flex-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    class="w-full bg-transparent border-0 p-0 text-body-md text-on-surface outline-none tabular-nums"
                    value={tenderedCents.value}
                    onChange={(e) => {
                      const v = parseInt((e.target as HTMLInputElement).value) || 0;
                      tenderedCents.value = v;
                      changeCents.value = Math.max(0, v - grandTotalCents.value);
                    }}
                  />
                </View>
              </View>
              <View class="flex justify-between text-body-md">
                <Text class={typeClass("body-md")}>Change</Text>
                <Text class={typeClass("body-md")} tabular-nums>$${(changeCents.value / 100).toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Pay button */}
          <StitchButton
            variant="primary"
            size="lg"
            fullWidth
            onPress={handlePay}
            class="w-full max-w-[600px] my-lg"
          >
            <View class="flex items-center justify-center gap-xs">
              <Text class={typeClass("label-lg")} font-label tabular-nums>Charge ${total}</Text>
              <View class="text-[18px]">›</View>
            </View>
          </StitchButton>
        </View>
      </View>
    </View>
  );
}


