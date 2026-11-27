import { signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Field, TextBox } from "../../ui/Field";
import { navigate } from "../../store";
import { backendAuth, signInWithBackend } from "../../sync/auth";
import { syncState } from "../../sync/state";

export function LoginScreen() {
  const email = signal("sara@kova.pk");
  const password = signal("counter-demo");
  const remember = signal(true);
  const branch = signal("Gulberg Café · GUL-T01");

  return (
    <View class="flex-1 flex-row bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* Brand panel */}
      <View class="flex-1 flex-col justify-between bg-surface-container-low p-10" style={{ maxWidth: 620 }}>
        <View class="flex-row items-center gap-2.5">
          <View class="h-10 w-10 items-center justify-center rounded-sm bg-primary-container">
            <Text class="font-headline text-title-lg text-on-primary">K</Text>
          </View>
          <View class="gap-0">
            <Text class="font-headline text-title-lg text-on-surface">Kova</Text>
            <Text class="font-body text-body-sm text-outline">ERP · POS · Inventory · Books</Text>
          </View>
        </View>

        <View class="gap-4">
          <Text class="font-headline text-display-lg text-on-surface tracking-display">
            Run the counter, the kitchen and the books from one place.
          </Text>
          <Text class="font-body text-body-md text-on-surface-variant">
            Local-first by default. Every sale lands in SQLite, syncs when the link
            is back, and posts straight to the ledger.
          </Text>
          <View class="flex-row gap-2 pt-1">
            <Each of={["#932C10", "#3F5E27", "#2F5372", "#7E5700", "#75376A"]}>
              {(color) => (
                <View
                  class="h-7 w-7 rounded-full border border-outline-variant"
                  style={{ backgroundColor: color() }}
                />
              )}
            </Each>
            <View class="flex-row items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1">
              <Icon name="palette" size={15} color="#6B5752" />
              <Text class="font-label text-label-sm text-on-surface-variant">Quiet Paper</Text>
            </View>
          </View>
        </View>

        <View class="flex-row items-center justify-between border-t border-outline-variant pt-4">
          <Text class="font-body text-body-sm text-outline">
            3 branches · 1 kitchen · {syncState().pending} writes waiting
          </Text>
          <Text class="font-body text-body-sm text-outline">v0.1.0 · desktop</Text>
        </View>
      </View>

      {/* Form panel */}
      <View class="flex-1 items-center justify-center p-10">
        <View class="w-full gap-5" style={{ maxWidth: 400 }}>
          <View class="gap-1">
            <Text class="font-headline text-headline-lg text-on-surface">
              Clock in
            </Text>
            <Text class="font-body text-body-md text-on-surface-variant">
              Sign in to open the register for your shift.
            </Text>
          </View>

          <View class="gap-3">
            <Field label="Email">
              <TextBox value={email()} onChange={(value) => email.set(value)} icon="mail" />
            </Field>
            <Field label="Password">
              <TextBox value={password()} onChange={(value) => password.set(value)} icon="lock" masked />
            </Field>
            <Field label="Branch & terminal">
              <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
                <Text class="font-body text-body-md text-on-surface">{branch()}</Text>
                <Icon name="expand_more" size={18} color="#6B5752" />
              </View>
            </Field>
          </View>

          <View class="flex-row items-center justify-between">
            <View
              role="button"
              onPress={() => remember.update((value) => !value)}
              class="flex-row items-center gap-2"
            >
              <View
                class={
                  "h-4 w-4 items-center justify-center rounded-sm border " +
                  (remember() ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-lowest")
                }
              >
                <If when={remember()}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </If>
              </View>
              <Text class="font-body text-body-md text-on-surface-variant">
                Remember this terminal
              </Text>
            </View>
            <Text class="font-label text-label-md text-primary">Forgot password?</Text>
          </View>

          <Button
            label="Open the register"
            variant="primary"
            size="lg"
            iconRight="arrow_forward"
            onPress={() => {
              void signInWithBackend(email(), password());
              navigate("register");
            }}
          />

          <View class="flex-row items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5">
            <Icon name="wifi_off" size={16} color="#6B5752" />
            <Text class="flex-1 font-body text-body-sm text-on-surface-variant">
              {backendAuth() === "connected"
                ? "Connected to Kova Cloud · sync token ready."
                : "No connection? Signing in still works offline with the cached shift."}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
