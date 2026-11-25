// Kova ERP — Desktop Login screen
import { View, Text, signal } from "nsh";
import { Input, Link } from "nsh/base";
import { StitchButton, StitchCard } from "../components";
import { typeClass, radius } from "../design/tokens";

interface LoginFormState {
  email: string;
  password: string;
  deviceId: string;
}

interface DesktopLoginProps {
  onLogin: () => void;
}

export function DesktopLogin({ onLogin }: DesktopLoginProps) {
  const form = signal<LoginFormState>({ email: "", password: "", deviceId: "" });
  const error = signal<string | null>(null);
  const isLoading = signal(false);

  const handleLogin = () => {
    error.value = null;
    isLoading.value = true;
    // TODO: call kova-auth POST /api/v1/auth/login
    console.log("Login:", form.value);
    setTimeout(() => { isLoading.value = false; onLogin(); }, 1000);
  };

  return (
    <View class="flex-1 bg-surface min-h-screen flex items-center justify-center p-lg">
      <StitchCard variant="elevated" padding="lg" class="w-full max-w-[420px]">
        <View class="flex flex-col items-center gap-lg">
          <View class="w-12 h-12 rounded-sm bg-primary-container text-on-primary flex items-center justify-center">
            <Text class={`${typeClass("headline-lg")} font-headline tabular-nums`}>K</Text>
          </View>
          <View class="flex flex-col items-center gap-xs">
            <Text class={typeClass("headline-lg")} font-headline>Welcome back</Text>
            <Text class={typeClass("body-sm")}>Sign in to your Kova café terminal</Text>
          </View>

          <View class="w-full flex flex-col gap-sm">
            <View class="flex flex-col gap-xs">
              <Text class={typeClass("label-md")} font-label>Email</Text>
              <Input
                placeholder="you@kovacafe.com"
                value={form.value.email}
                onChange={(v: string) => form.value = { ...form.value, email: v }}
                class="w-full bg-transparent border-0 p-0 text-body-md text-on-surface outline-none"
              />
            </View>

            <View class="flex flex-col gap-xs">
              <Text class={typeClass("label-md")} font-label>Password</Text>
              <Input
                placeholder="••••••••"
                value={form.value.password}
                onChange={(v: string) => form.value = { ...form.value, password: v }}
                class="w-full bg-transparent border-0 p-0 text-body-md text-on-surface outline-none"
              />
            </View>

            <View class="flex flex-col gap-xs">
              <Text class={typeClass("label-md")} font-label>Terminal device ID</Text>
              <Input
                placeholder="term_gul_01"
                value={form.value.deviceId}
                onChange={(v: string) => form.value = { ...form.value, deviceId: v }}
                class="w-full bg-transparent border-0 p-0 text-body-md text-on-surface outline-none"
              />
            </View>
          </View>

          {error.value && (
            <View class="bg-error-container text-on-error rounded-md px-md py-sm">
              <Text class={typeClass("body-sm")}>{error.value}</Text>
            </View>
          )}

          <StitchButton
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleLogin}
            disabled={isLoading.value}
            class="my-md"
          >
            <Text class={typeClass("label-lg")} font-label>{isLoading.value ? "Signing in…" : "Sign in"}</Text>
          </StitchButton>

          <View class="w-full flex justify-center gap-md border-t border-outline-variant pt-lg">
            <View class="flex-1 border-t border-outline-variant" />
            <Text class={typeClass("body-sm")} text-outline>or</Text>
            <View class="flex-1 border-t border-outline-variant" />
          </View>

          <StitchButton
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => {}}
          >
            <Text class={typeClass("label-md")} font-label>Continue with PIN</Text>
          </StitchButton>
        </View>
      </StitchCard>

      <View class="absolute bottom-lg left-1/2 -translate-x-1/2">
        <Text class={typeClass("body-sm")} text-outline>Kova ERP · Terminal login</Text>
      </View>
    </View>
  );
}
