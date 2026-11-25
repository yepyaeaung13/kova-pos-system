import { Scroll, signal, Text, View, type JSX } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { InfoRow } from "../../ui/Card";
import { Field, TextBox } from "../../ui/Field";
import { Toggle } from "../../ui/Avatar";
import { StatusPill } from "../../ui/Badge";
import { cashier, managerPin, saveManagerPin } from "../../store";
import { syncState, patchSync } from "../../sync/state";
import { setConfig } from "../../db/repo";

function Section(props: {
  title: string;
  hint: string;
  icon: string;
  children?: JSX.Element;
}) {
  return (
    <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
      <View class="flex-row items-center gap-2">
        <View class="h-7 w-7 items-center justify-center rounded-sm bg-surface-container">
          <Icon name={props.icon} size={16} />
        </View>
        <View class="flex-1 gap-0">
          <Text class="font-title text-title-md text-on-surface">{props.title}</Text>
          <Text class="font-body text-body-sm text-outline">{props.hint}</Text>
        </View>
      </View>
      {props.children}
    </View>
  );
}

function SwitchRow(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View class="flex-row items-center justify-between gap-3 border-t border-outline-variant/60 pt-2.5">
      <View class="flex-1 gap-0">
        <Text class="font-body text-body-md text-on-surface">{props.label}</Text>
        <If when={props.hint}>
          {(text) => <Text class="font-body text-body-sm text-outline">{text()}</Text>}
        </If>
      </View>
      <Toggle checked={props.checked} onChange={props.onChange} label={props.label} />
    </View>
  );
}

export function SettingsScreen() {
  const branch = signal("Kova Café · Gulberg");
  const address = signal("42 Main Boulevard, Gulberg III, Lahore");
  const terminal = signal("GUL-T01");
  const taxId = signal("NTN 7712345-6");
  const receiptFooter = signal("Thank you — see you at the counter.");
  const taxInclusive = signal(false);
  const printReceipt = signal(true);
  const printA4 = signal(false);
  const requireDrawer = signal(true);
  const autoLock = signal(true);
  const wifiOnly = signal(false);
  const gateway = signal(syncState().gateway);
  const saved = signal(false);

  return (
    <View class="flex-1 flex-col gap-4 p-6 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Settings</Text>
          <Text class="font-body text-body-sm text-outline">
            Branch, taxes, receipts and shift policy for {cashier.terminal}
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <If when={saved()}>
            <View class="flex-row items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1.5">
              <Icon name="check_circle" size={15} />
              <Text class="font-label text-label-sm text-on-secondary-container">Saved</Text>
            </View>
          </If>
          <Button label="Save changes" icon="save" variant="primary" onPress={() => saved.set(true)} />
        </View>
      </View>

      <Scroll class="flex-1" contentClass="pb-2">
      <View class="flex-row gap-4 items-start">
        <View class="flex-1 gap-4">
          <Section title="Branch & terminal" hint="What prints on every receipt" icon="storefront">
            <Field label="Branch name">
              <TextBox value={branch()} onChange={(value) => branch.set(value)} />
            </Field>
            <Field label="Address">
              <TextBox value={address()} onChange={(value) => address.set(value)} />
            </Field>
            <View class="flex-row gap-3">
              <View class="flex-1">
                <Field label="Terminal">
                  <TextBox value={terminal()} onChange={(value) => terminal.set(value)} />
                </Field>
              </View>
              <View class="flex-1">
                <Field label="Tax / NTN">
                  <TextBox value={taxId()} onChange={(value) => taxId.set(value)} />
                </Field>
              </View>
            </View>
            <Field label="Receipt footer" hint="One line, printed under the totals">
              <TextBox value={receiptFooter()} onChange={(value) => receiptFooter.set(value)} />
            </Field>
          </Section>

          <Section title="Tax" hint="Applied at checkout and on A4 invoices" icon="percent">
            <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
              <View class="gap-0">
                <Text class="font-label text-label-md text-on-surface">GST rate</Text>
                <Text class="font-body text-body-sm text-outline">Standard rate on food & beverage</Text>
              </View>
              <Text class="font-title text-title-lg tabular-nums text-on-surface">8%</Text>
            </View>
            <SwitchRow
              label="Prices include tax"
              hint="Menu prices already carry GST"
              checked={taxInclusive()}
              onChange={(value) => taxInclusive.set(value)}
            />
          </Section>
        </View>

        <View class="flex-1 gap-4">
          <Section title="Receipts & printing" hint="Thermal roll and A4 vouchers" icon="print">
            <SwitchRow
              label="Print receipt after payment"
              checked={printReceipt()}
              onChange={(value) => printReceipt.set(value)}
            />
            <SwitchRow
              label="Offer A4 invoice for business customers"
              checked={printA4()}
              onChange={(value) => printA4.set(value)}
            />
            <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
              <View class="flex-row items-center gap-2">
                <Icon name="print" size={18} color="#6B5752" />
                <View class="gap-0">
                  <Text class="font-label text-label-md text-on-surface">Thermal printer</Text>
                  <Text class="font-body text-body-sm text-outline">EPSON TM-T88VI · USB</Text>
                </View>
              </View>
              <StatusPill label="Online" tone="success" />
            </View>
          </Section>

          <Section title="Shift & security" hint="Who can open the drawer, and when" icon="lock">
            <SwitchRow
              label="Require counted drawer to close shift"
              checked={requireDrawer()}
              onChange={(value) => requireDrawer.set(value)}
            />
            <SwitchRow
              label="Lock the terminal after 5 minutes idle"
              checked={autoLock()}
              onChange={(value) => autoLock.set(value)}
            />
            <Field label="Manager PIN" hint="4 digits · approves refunds, voids and drawer overrides">
              <TextBox
                value={managerPin()}
                onChange={(value) => saveManagerPin(value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          </Section>

          <Section title="Offline & sync" hint="Local-first queue behaviour" icon="cloud_sync">
            <View class="gap-2 border-t border-outline-variant/60 pt-2.5">
              <InfoRow
                label="Connection"
                value={
                  !syncState().online
                    ? "Offline · queueing"
                    : syncState().reachable
                      ? "Online · gateway reachable"
                      : "Queueing · gateway unreachable"
                }
              />
              <InfoRow label="Queued writes" value={String(syncState().pending)} />
              <InfoRow label="Conflicts" value={String(syncState().conflicts)} />
              <InfoRow
                label="Last sync"
                value={
                  syncState().lastSyncedAt
                    ? syncState().lastSyncedAt!.replace("T", " ").slice(0, 19)
                    : "Never"
                }
              />
              <InfoRow
                label="Local database"
                value={
                  syncState().dbReady
                    ? "SQLite " + (syncState().dbVersion ?? "")
                    : "Unavailable"
                }
              />
              <InfoRow
                label="Journal mode"
                value={syncState().dbReady ? "WAL · synchronous NORMAL" : "—"}
              />
            </View>
            <Field label="Sync gateway" hint="Envoy gateway the outbox pushes to">
              <TextBox value={gateway()} onChange={(value) => gateway.set(value)} />
            </Field>
            <View class="flex-row items-center justify-between gap-2">
              <Text class="flex-1 font-body text-body-sm text-outline">
                {syncState().lastError ?? "Queue drains every 15s while online."}
              </Text>
              <Button
                label="Save gateway"
                size="sm"
                variant="soft"
                onPress={() => {
                  void setConfig("gateway_url", gateway()).then(() => {
                    patchSync({ gateway: gateway() });
                    saved.set(true);
                  });
                }}
              />
            </View>
            <SwitchRow
              label="Upload photos only on Wi-Fi"
              checked={wifiOnly()}
              onChange={(value) => wifiOnly.set(value)}
            />
          </Section>

          <View class="flex-row items-center gap-2 rounded-md border border-error/20 bg-error-container px-3 py-2.5">
            <Icon name="warning" size={18} color="#BA1A1A" />
            <Text class="flex-1 font-body text-body-sm text-on-error-container">
              Closing the terminal signs every device out. Ask a manager before you do.
            </Text>
            <Button label="Sign out all" size="sm" variant="danger" />
          </View>
        </View>
      </View>
      </Scroll>
    </View>
  );
}
