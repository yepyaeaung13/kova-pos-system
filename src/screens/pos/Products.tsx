import { computed, Overlay, Scroll, signal, Text, View, type ViewRef } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { StatusPill } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { ProductArt } from "../../ui/ProductArt";
import { Drawer } from "../../ui/Drawer";
import { Field, TextBox } from "../../ui/Field";
import { Toggle } from "../../ui/Avatar";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { addProduct, addToCart, catalog, navigate, searchQuery } from "../../store";
import { upsertProductRow } from "../../db/repo";
import type { Category, Product } from "../../data/mock";
import { money, count } from "../../format";

const filters = ["All", "Coffee", "Cold drinks", "Bakery", "Sandwiches"] as const;
const emojis = ["☕", "🥤", "🧊", "🥐", "🧁", "🍰", "🥪", "🥑", "🍵", "🧋"];
const tints = ["#F7EDE9", "#F5F3EE", "#EAF1F7", "#FBF3E0", "#F5ECF3", "#EAF3E4"];

export function ProductsScreen() {
  const filter = signal<(typeof filters)[number]>("All");
  const filterOpen = signal(false);
  const filterAnchor = signal<ViewRef | null>(null);
  const selected = signal<Product | null>(null);
  const creating = signal(false);
  const saving = signal(false);
  const categoryOpen = signal(false);

  const name = signal("");
  const note = signal("");
  const category = signal<Category>("Coffee");
  const priceText = signal("0");
  const available = signal(true);
  const emoji = signal("☕");
  const tint = signal("#F7EDE9");

  const visible = computed(() =>
    catalog().filter((product) => {
      const inCategory = filter() === "All" || product.category === filter();
      const query = searchQuery().trim().toLowerCase();
      const inQuery = query === "" || product.name.toLowerCase().includes(query);
      return inCategory && inQuery;
    }),
  );

  const soldToday = () => catalog().reduce((sum, product) => sum + product.soldToday, 0);

  const openEditor = (product: Product | null) => {
    selected.set(product);
    creating.set(product === null);
    name.set(product?.name ?? "");
    note.set(product?.note ?? "");
    category.set(product?.category ?? "Coffee");
    priceText.set((product?.price ?? 0).toFixed(2));
    available.set((product?.badge ?? "") !== "Sold out");
    emoji.set(product?.emoji ?? "☕");
    tint.set(product?.tint ?? "#F7EDE9");
  };

  const close = () => {
    selected.set(null);
    creating.set(false);
  };

  const save = () => {
    if (saving()) return;
    const price = Math.max(0, Number(priceText()) || 0);
    const product: Product = {
      id: selected()?.id ?? "p-" + Date.now(),
      name: name().trim() || "New item",
      category: category(),
      price: Math.round(price * 100) / 100,
      note: note().trim() || category(),
      emoji: emoji(),
      tint: tint(),
      badge: available() ? undefined : "Sold out",
      soldToday: selected()?.soldToday ?? 0,
    };
    saving.set(true);
    addProduct(product);
    void upsertProductRow({
      id: product.id,
      name: product.name,
      category: product.category,
      note: product.note,
      priceCents: Math.round(product.price * 100),
      emoji: product.emoji,
      tint: product.tint,
      badge: product.badge ?? null,
      soldToday: product.soldToday,
    })
      .catch((error) => {
        console.log("product not written to sqlite: " + (error?.message ?? error));
      })
      .then(() => {
        saving.set(false);
        close();
      });
  };

  return (
    <View class="flex-1 flex-col gap-3 p-4 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Products</Text>
          <Text class="font-body text-body-sm text-outline">
            Menu, prices and availability for Gulberg Café
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Import menu" icon="upload_file" />
          <Button label="New item" icon="add" variant="primary" onPress={() => openEditor(null)} />
        </View>
      </View>

      <View class="flex-row flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
        <Text class="font-body text-body-sm text-on-surface-variant">
          Menu items {count(catalog().length)}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Avg {money(catalog().reduce((sum, p) => sum + p.price, 0) / Math.max(1, catalog().length))}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Sold today {count(soldToday())}
        </Text>
        <Text class="font-body text-body-sm text-on-surface-variant">
          Sold out {count(catalog().filter((p) => p.badge === "Sold out").length)}
        </Text>
      </View>

      <View class="flex-row items-center gap-3">
        <Text class="font-label text-label-sm uppercase tracking-label text-outline">Category</Text>
        <View class="w-48">
          <View
            ref={(node) => filterAnchor.set(node)}
            role="button"
            accessibilityLabel="Filter category"
            onPress={() => filterOpen.set(!filterOpen())}
            class="h-8 flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-lowest px-3"
          >
            <Text class="font-body text-body-sm text-on-surface">{filter()}</Text>
            <Icon name="expand_more" size={16} color="#6B5752" />
          </View>
          <If when={filterOpen()}>
            <Overlay
              anchor={filterAnchor()}
              placement="bottom"
              align="start"
              offset={4}
              onPressOutside={() => filterOpen.set(false)}
            >
            <View class="w-48 rounded-md border border-outline-variant bg-surface-container-lowest p-1">
              <Each of={filters}>
                {(item) => (
                  <View
                    role="button"
                    accessibilityLabel={"Filter by " + item()}
                    onPress={() => {
                      filter.set(item());
                      filterOpen.set(false);
                    }}
                    class={
                      "flex-row items-center justify-between gap-2 rounded-sm px-2 py-1.5 " +
                      (filter() === item()
                        ? "bg-surface-variant"
                        : "hover:bg-surface-container-low")
                    }
                  >
                    <Text class="font-body text-body-sm text-on-surface">{item()}</Text>
                    <Text class="font-label text-label-sm tabular-nums text-outline">
                      {item() === "All"
                        ? catalog().length
                        : catalog().filter((product) => product.category === item()).length}
                    </Text>
                  </View>
                )}
              </Each>
            </View>
            </Overlay>
          </If>
        </View>
        <Text class="font-body text-body-sm text-outline">
          Showing {visible().length} of {catalog().length} items
        </Text>
        <View class="flex-1" />
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="Item" flex={3} />
            <HeadCell label="Category" flex={1.4} />
            <HeadCell label="Price" flex={1} align="right" />
            <HeadCell label="Sold today" flex={1.1} align="right" />
            <HeadCell label="Status" flex={1.2} />
            <HeadCell label="" w={76} />
          </Head>
          <Each of={visible()}>
            {(product) => (
              <Row>
                <Cell flex={3}>
                  <View class="flex-row items-center gap-2.5">
                    <ProductArt emoji={product().emoji} tint={product().tint} height={34} size={18} class="w-9 shrink-0" />
                    <View class="flex-1 gap-0 min-w-0">
                      <Text class="font-label text-label-lg text-on-surface truncate">{product().name}</Text>
                      <Text class="font-body text-body-sm text-outline truncate">{product().note}</Text>
                    </View>
                  </View>
                </Cell>
                <Cell flex={1.4}>
                  <Text class="font-body text-body-md text-on-surface-variant">{product().category}</Text>
                </Cell>
                <TextCell text={money(product().price)} flex={1} align="right" strong />
                <TextCell text={count(product().soldToday)} flex={1.1} align="right" muted />
                <Cell flex={1.2}>
                  <StatusPill
                    label={product().badge === "Sold out" ? "Sold out" : product().badge ?? "Available"}
                    tone={product().badge === "Sold out" ? "error" : product().badge ? "warn" : "success"}
                  />
                </Cell>
                <Cell w={76} align="right">
                  <View class="flex-row items-center gap-1">
                    <View
                      role="button"
                      accessibilityLabel={"Edit " + product().name}
                      onPress={() => openEditor(product())}
                      class="h-7 w-7 items-center justify-center rounded-sm border border-outline-variant hover:bg-surface-container"
                    >
                      <Icon name="edit" size={13} />
                    </View>
                    <View
                      role="button"
                      accessibilityLabel={"Add " + product().name}
                      onPress={() => {
                        addToCart(product().id);
                        navigate("register");
                      }}
                      class="h-7 w-7 items-center justify-center rounded-sm bg-surface-container hover:bg-surface-container-high"
                    >
                      <Icon name="add" size={14} />
                    </View>
                  </View>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <Text class="font-body text-body-sm text-outline">
          {visible().length} of {catalog().length} items · edits reach the register and the local database
        </Text>
      </View>

      <If when={selected() !== null || creating()}>
        <Drawer
          onClose={close}
          title={creating() ? "New menu item" : "Edit item"}
          subtitle={creating() ? "Adds it to the register and SQLite" : "Prices and availability update live"}
        >
          <Scroll class="flex-1" contentClass="p-4 gap-4">
            <View class="flex-row items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <ProductArt emoji={emoji()} tint={tint()} height={64} size={28} class="w-16" />
              <View class="flex-1 gap-0 min-w-0">
                <Text class="font-title text-title-md text-on-surface truncate">
                  {name() || "New item"}
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  {category()} · {money(Number(priceText()) || 0)}
                </Text>
              </View>
              <StatusPill label={available() ? "Available" : "Sold out"} tone={available() ? "success" : "error"} />
            </View>

            <Field label="Item name">
              <TextBox value={name()} onChange={(value) => name.set(value)} placeholder="e.g. Cortado" />
            </Field>
            <Field label="Menu note" hint="Shown under the name on the tile">
              <TextBox value={note()} onChange={(value) => note.set(value)} placeholder="8 oz · Hot" />
            </Field>

            <Field label="Category">
              <View class="rounded-md border border-outline-variant bg-surface-container-lowest">
                <View
                  role="button"
                  accessibilityLabel="Select category"
                  onPress={() => categoryOpen.set(!categoryOpen())}
                  class="flex-row items-center justify-between px-3 py-2.5"
                >
                  <Text class="font-body text-body-md text-on-surface">{category()}</Text>
                  <Icon name="expand_more" size={18} color="#6B5752" />
                </View>
                <If when={categoryOpen()}>
                  <View class="border-t border-outline-variant">
                    <Each of={filters.slice(1)}>
                      {(item) => (
                        <View
                          role="button"
                          onPress={() => {
                            category.set(item() as Category);
                            categoryOpen.set(false);
                          }}
                          class={
                            "px-3 py-2 " +
                            (category() === item()
                              ? "bg-surface-variant"
                              : "hover:bg-surface-container-low")
                          }
                        >
                          <Text class="font-body text-body-md text-on-surface">{item()}</Text>
                        </View>
                      )}
                    </Each>
                  </View>
                </If>
              </View>
            </Field>

            <View class="gap-1.5">
              <Text class="font-label text-label-md text-on-surface-variant">Price</Text>
              <View class="flex-row items-center gap-2">
                <View class="flex-1">
                  <TextBox value={priceText()} onChange={(value) => priceText.set(value)} />
                </View>
                <View
                  role="button"
                  accessibilityLabel="Decrease price"
                  onPress={() =>
                    priceText.set(Math.max(0, (Number(priceText()) || 0) - 0.25).toFixed(2))
                  }
                  class="h-9 w-9 items-center justify-center rounded-sm border border-outline-variant"
                >
                  <Icon name="remove" size={14} />
                </View>
                <View
                  role="button"
                  accessibilityLabel="Increase price"
                  onPress={() =>
                    priceText.set(((Number(priceText()) || 0) + 0.25).toFixed(2))
                  }
                  class="h-9 w-9 items-center justify-center rounded-sm border border-outline-variant"
                >
                  <Icon name="add" size={14} />
                </View>
              </View>
            </View>

            <View class="flex-row items-center justify-between gap-3 border-t border-outline-variant pt-3">
              <View class="flex-1 gap-0">
                <Text class="font-body text-body-md text-on-surface">Available on the menu</Text>
                <Text class="font-body text-body-sm text-outline">
                  Sold-out items stay countable but cannot be ordered
                </Text>
              </View>
              <Toggle checked={available()} onChange={(value) => available.set(value)} label="Available" />
            </View>

            <View class="gap-1.5">
              <Text class="font-label text-label-md text-on-surface-variant">Tile artwork</Text>
              <View class="flex-row gap-1.5 flex-wrap">
                <Each of={emojis}>
                  {(glyph) => (
                    <View
                      role="button"
                      onPress={() => emoji.set(glyph())}
                      class={
                        "h-9 w-9 items-center justify-center rounded-sm border " +
                        (emoji() === glyph()
                          ? "border-primary-container bg-surface-variant"
                          : "border-outline-variant bg-surface-container-lowest")
                      }
                    >
                      <Text style={{ fontSize: 18 }}>{glyph()}</Text>
                    </View>
                  )}
                </Each>
              </View>
              <View class="flex-row gap-1.5 pt-1">
                <Each of={tints}>
                  {(color) => (
                    <View
                      role="button"
                      onPress={() => tint.set(color())}
                      class={
                        "h-7 w-7 rounded-full border-2 " +
                        (tint() === color() ? "border-on-surface" : "border-outline-variant")
                      }
                      style={{ backgroundColor: color() }}
                    />
                  )}
                </Each>
              </View>
            </View>

            <If when={selected() !== null}>
              <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                <View class="flex-row items-center justify-between">
                  <Text class="font-body text-body-sm text-on-surface-variant">Sold today</Text>
                  <Text class="font-label text-label-md tabular-nums text-on-surface">
                    {count(selected()?.soldToday ?? 0)}
                  </Text>
                </View>
                <View class="flex-row items-center justify-between">
                  <Text class="font-body text-body-sm text-on-surface-variant">Item id</Text>
                  <Text class="font-label text-label-md tabular-nums text-outline">
                    {selected()?.id}
                  </Text>
                </View>
              </View>
            </If>
          </Scroll>

          <View class="flex-row items-center gap-2 border-t border-outline-variant p-4">
            <Button label="Cancel" onPress={close} />
            <View class="flex-1" />
            <Button
              label={saving() ? "Saving…" : creating() ? "Create item" : "Save changes"}
              icon="save"
              variant="primary"
              disabled={saving()}
              onPress={save}
            />
          </View>
        </Drawer>
      </If>
    </View>
  );
}
