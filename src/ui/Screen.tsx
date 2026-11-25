import { Scroll, Text, View, type JSX } from "nsh";

/**
 * A workspace screen frame: the Fraunces title, an optional subtitle and
 * right-hand actions, then the content (scrolling by default).
 */
export function Screen(props: {
  title: string;
  subtitle?: string;
  actions?: JSX.Element;
  children?: JSX.Element;
  scroll?: boolean;
}) {
  const body = (
    <View class="flex-1 flex-col gap-4 min-h-0">
      {props.children}
    </View>
  );

  return (
    <View class="flex-1 flex-col gap-4 p-6 min-h-0">
      <View class="flex-row items-end justify-between gap-3">
        <View class="flex-1 gap-0.5 min-w-0">
          <Text class="font-headline text-headline-lg text-on-surface truncate">
            {props.title}
          </Text>
          <If when={props.subtitle}>
            {(text) => (
              <Text class="font-body text-body-sm text-outline">{text()}</Text>
            )}
          </If>
        </View>
        <View class="flex-row items-center gap-2">{props.actions}</View>
      </View>

      <If
        when={props.scroll !== false}
        else={body}
      >
        <Scroll class="flex-1" contentClass="gap-4 pb-2">
          {props.children}
        </Scroll>
      </If>
    </View>
  );
}
