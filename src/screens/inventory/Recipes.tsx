import { signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { recipes } from "../../data/ops";
import { money } from "../../format";

export function RecipesScreen() {
  const selected = signal(0);
  const recipe = () => recipes[selected()];

  return (
    <Screen
      scroll={false}
      title="Recipes & BOM"
      subtitle="What each menu item consumes, and what it earns"
      actions={
        <>
          <Button label="Export costing" icon="download" />
          <Button label="New recipe" icon="add" variant="primary" />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Recipes costed" value={String(recipes.length)} hint="of 12 menu items" icon="menu_book" />
        <StatTile
          label="Average margin"
          value={(recipes.reduce((sum, row) => sum + row.margin, 0) / recipes.length).toFixed(1) + "%"}
          delta="+1.8 pts"
          positive
          hint="vs last month"
          icon="trending_up"
          tone="success"
        />
        <StatTile label="Best margin" value="74.3%" hint="Cappuccino" icon="workspace_premium" tone="warn" />
        <StatTile label="Ingredients used" value="17" hint="across 5 suppliers" icon="grain" tone="info" />
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        <View class="flex-col gap-1 rounded-md border border-outline-variant bg-surface-container-lowest p-2" style={{ width: 300 }}>
          <Text class="px-2 py-1.5 font-label text-label-sm uppercase tracking-label text-outline">
            Menu items
          </Text>
          <Each of={recipes}>
            {(row, index) => (
              <View
                role="button"
                onPress={() => selected.set(index())}
                class={
                  "flex-row items-center justify-between gap-2 rounded px-2.5 py-2 " +
                  (selected() === index()
                    ? "bg-surface-variant"
                    : "hover:bg-surface-container-low")
                }
              >
                <View class="flex-1 gap-0 min-w-0">
                  <Text class="font-label text-label-md text-on-surface truncate">{row().product}</Text>
                  <Text class="font-body text-body-sm text-outline">
                    {row().category} · cost {money(row().cost)}
                  </Text>
                </View>
                <Text
                  class={
                    "font-label text-label-sm tabular-nums " +
                    (row().margin >= 65 ? "text-secondary" : "text-on-surface-variant")
                  }
                >
                  {row().margin.toFixed(1)}%
                </Text>
              </View>
            )}
          </Each>
          <View class="flex-1" />
          <Text class="px-2 py-2 font-body text-body-sm text-outline">
            Costs use the moving average price of each ingredient.
          </Text>
        </View>

        <View class="flex-1 gap-4">
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <View class="flex-row items-start justify-between gap-3">
              <View class="gap-0.5">
                <Text class="font-headline text-headline-md text-on-surface">{recipe().product}</Text>
                <Text class="font-body text-body-sm text-outline">
                  {recipe().category} · yields 1 serving · sold at {money(recipe().price)}
                </Text>
              </View>
              <View class="flex-row gap-2">
                <View class="items-end rounded border border-outline-variant bg-surface-container-low px-3 py-1.5">
                  <Text class="font-body text-body-sm text-outline">Food cost</Text>
                  <Text class="font-title text-title-md tabular-nums text-on-surface">{money(recipe().cost)}</Text>
                </View>
                <View class="items-end rounded border border-secondary/20 bg-secondary-container px-3 py-1.5">
                  <Text class="font-body text-body-sm text-on-secondary-container">Margin</Text>
                  <Text class="font-title text-title-md tabular-nums text-on-secondary-container">
                    {recipe().margin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            <TableWrap>
              <Head>
                <HeadCell label="Component" flex={2.4} />
                <HeadCell label="Quantity" flex={1.2} />
                <HeadCell label="Cost" flex={1} align="right" />
                <HeadCell label="Share" flex={1} align="right" />
              </Head>
              <Each of={recipe().components}>
                {(component) => (
                  <Row>
                    <Cell flex={2.4}>
                      <Text class="font-body text-body-md text-on-surface">{component().name}</Text>
                    </Cell>
                    <TextCell text={component().qty} flex={1.2} muted />
                    <TextCell text={money(component().cost)} flex={1} align="right" />
                    <TextCell
                      text={(component().cost / recipe().cost * 100).toFixed(0) + "%"}
                      flex={1}
                      align="right"
                      muted
                    />
                  </Row>
                )}
              </Each>
            </TableWrap>
          </View>

          <View class="flex-row gap-4">
            <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <CardHeader title="Availability" hint="Per branch today" />
              <InfoRow label="Gulberg Café" value="Available" />
              <InfoRow label="DHA Phase 5" value="Available" />
              <InfoRow label="Johar Town" value="Limited · 6 left" />
            </View>
            <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <CardHeader title="If one ingredient moves" hint="Sensitivity at current cost" />
              <InfoRow label="Milk +10%" value={"margin " + (recipe().margin - 1.2).toFixed(1) + "%"} />
              <InfoRow label="Beans +10%" value={"margin " + (recipe().margin - 2.6).toFixed(1) + "%"} />
              <InfoRow label="Cup +10%" value={"margin " + (recipe().margin - 0.8).toFixed(1) + "%"} />
            </View>
          </View>

          <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low p-3">
            <View class="flex-row items-center gap-2">
              <Icon name="science" size={16} color="#6B5752" />
              <Text class="font-body text-body-sm text-outline">
                Editing a recipe never changes past sales — it applies to the next batch.
              </Text>
            </View>
            <Button label="Edit recipe" size="sm" icon="edit" />
          </View>
        </View>
      </View>
    </Screen>
  );
}
