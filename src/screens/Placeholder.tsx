import { Text, View } from "nsh";
import { Icon } from "../ui/Icon";
import { Card } from "../ui/Card";

/** A titled empty state for screens that are still landing. */
export function Placeholder(props: {
  title: string;
  subtitle: string;
  icon?: string;
  note?: string;
}) {
  return (
    <View class="flex-1 flex-col gap-5 p-6">
      <View class="gap-1">
        <Text class="font-headline text-headline-lg text-on-surface">
          {props.title}
        </Text>
        <Text class="font-body text-body-md text-on-surface-variant">
          {props.subtitle}
        </Text>
      </View>

      <View class="flex-row gap-4">
        <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
          <View class="h-8 w-8 items-center justify-center rounded-sm bg-surface-container">
            <Icon name={props.icon ?? "dashboard"} size={18} />
          </View>
          <Text class="font-title text-title-md text-on-surface">
            Ready for data
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Wired to the same offline queue as the register.
          </Text>
        </View>
        <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
          <View class="h-8 w-8 items-center justify-center rounded-sm bg-secondary-container">
            <Icon name="cloud_sync" size={18} />
          </View>
          <Text class="font-title text-title-md text-on-surface">
            Local-first
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Writes land in SQLite first, then sync when the link is back.
          </Text>
        </View>
        <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
          <View class="h-8 w-8 items-center justify-center rounded-sm bg-tertiary-container">
            <Icon name="verified" size={18} />
          </View>
          <Text class="font-title text-title-md text-on-surface">
            Audited
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Every change keeps who, when and why.
          </Text>
        </View>
      </View>

      <Card class="flex-1 items-center justify-center gap-2 p-6">
        <Icon name={props.icon ?? "construction"} size={34} color="#6B5752" />
        <Text class="font-title text-title-lg text-on-surface">
          {props.title} lands next
        </Text>
        <Text class="font-body text-body-md text-on-surface-variant">
          {props.note ?? "This screen is being translated from the design export."}
        </Text>
      </Card>
    </View>
  );
}
