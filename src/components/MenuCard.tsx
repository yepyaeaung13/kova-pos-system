// Kova ERP — MenuCard component (product card for the POS menu grid)
import { View, Text, Image } from "nsh";
import { colorClass, typeClass, radius } from "../design/tokens";

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

interface MenuCardProps {
  item: MenuItem;
  onAdd?: (item: MenuItem) => void;
  onRemove?: (item: MenuItem) => void;
  class?: string;
}

export function MenuCard({ item, onAdd, onRemove, class: className }: MenuCardProps) {
  const selected = (item.selectedQty ?? 0) > 0;
  const price = (item.priceCents / 100).toFixed(2);

  return (
    <View
      class={[
        "menu-card bg-surface-container-lowest rounded-md p-xs flex flex-col justify-between gap-sm",
        selected ? "border-2 border-primary-container relative" : "border border-outline-variant",
        item.soldOut ? "opacity-50 grayscale" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {!item.soldOut && selected && (
        <View class="absolute top-xs left-xs w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
          <Text class={`${typeClass("label-sm")} tabular-nums`}>{item.selectedQty}</Text>
        </View>
      )}
      <Image src={item.imageUrl} alt={item.name} class="w-full h-28 object-cover rounded" />
      {!item.soldOut && (
        <View class="px-xs">
          <Text class={typeClass("title-md")}>{item.name}</Text>
          <Text class={typeClass("body-sm")}>{item.description}</Text>
        </View>
      )}
      <View class="flex items-center justify-between px-xs pt-xs">
        <Text class={typeClass("title-md")} tabular-nums>${`$${price}`}</Text>
        {item.soldOut ? (
          <View class="w-7 h-7 rounded-sm bg-surface-container text-outline flex items-center justify-center cursor-not-allowed">
            <Text class="text-[16px]">−</Text>
          </View>
        ) : (
          <View class="flex items-center gap-sm">
            {onRemove && selected && (
              <View
                onPress={() => onRemove(item)}
                class="w-7 h-7 rounded-sm bg-primary-container text-on-primary flex items-center justify-center active:bg-primary"
              >
                <Text class="text-[16px]">−</Text>
              </View>
            )}
            <View
              onPress={() => onAdd(item)}
              class="w-7 h-7 rounded-sm bg-primary-container text-on-primary flex items-center justify-center active:bg-primary"
            >
              <Text class="text-[16px]">+</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
