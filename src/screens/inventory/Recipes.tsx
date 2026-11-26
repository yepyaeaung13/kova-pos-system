import { signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { loadRecipes, type Recipe } from "../../db/repo";
import { money } from "../../format";

export function RecipesScreen() {
  const recipeList = signal<Recipe[]>([]);
  const selectedIndex = signal(0);

  void loadRecipes().then((rows) => recipeList.set(rows)).catch(() => undefined);

  const selectedRecipe = () => recipeList()[selectedIndex()];

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
        <StatTile label="Recipes costed" value={String(recipeList().length)} hint="of 12 menu items" icon="menu_book" />
        <StatTile
          label="Average margin"
          value={(recipeList().reduce((sum, row) => sum + row.margin, 0) / recipeList().length).toFixed(1) + "%"}
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
          <Each of={recipeList()}>
            {(row, index) => (
              <View
                role="button"
                onPress={() => selectedIndex.set(index())}
                style={{ padding: 1, borderColor: selectedIndex() === index() ? "border-primary" : "border-outline-variant", borderWidth: 1 }}
              >
                <Text class="font-body text-body-md text-on-surface truncate">{row().product}</Text>
              </View>
            )}
          </Each>
        </View>

        <View class="flex-1 flex-col gap-2 p-4" style={{ minHeight: 200 }}>
          <If when={!!selectedRecipe()}>
            <CardHeader title={selectedRecipe()!.product} />
            <Eyebrow label={"Category: " + selectedRecipe()!.category} />
            <View class="mt-2">
              <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                Components
              </Text>
              <Each of={selectedRecipe()!.components ?? []}>
                {(comp) => (
                  <View class="flex-row items-center gap-2 border-b border-outline-variant/60 pb-1.5">
                    <Text class="flex-1 font-label text-label-sm text-outline">{comp.name}</Text>
                    <Text class="font-body text-body-sm text-on-surface-variant">{comp().qty}</Text>
                    <Text class="font-body text-body-sm text-on-surface-variant">${comp().cost.toFixed(2)}</Text>
                  </View>
                )}
              </Each>
            </View>
            <View class="mt-2">
              <Text class="font-label text-label-md text-on-surface">Price: {money(selectedRecipe()!.price)}</Text>
              <Text class="font-label text-label-md text-on-surface">Cost: {money(selectedRecipe()!.cost)}</Text>
              <Text class="font-label text-label-md text-on-surface">Margin: {selectedRecipe()!.margin}%</Text>
            </View>
          </If>
        </View>
      </View>
    </Screen>
  );
}