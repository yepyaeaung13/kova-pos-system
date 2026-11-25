import { View } from "nsh";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { ScreenHost } from "../screens/Router";
import { LoginScreen } from "../screens/pos/Login";
import { route } from "../store";

/**
 * The desktop frame: the nav rail on the left, and the workspace column with
 * the header over whichever screen is current. Sign-in fills the whole window.
 */
export function AppShell() {
  return (
    <If
      when={route().screen === "login"}
      else={
        <View class="flex-1 flex-row bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
          <NavRail />
          <View class="flex-1 flex-col min-w-0">
            <TopBar />
            <ScreenHost />
          </View>
        </View>
      }
    >
      <LoginScreen />
    </If>
  );
}
