import { Canvas, Text, View, type JSX } from "nsh";
import { chartColors, palette } from "../tokens";

/** Vertical bars with labels underneath — built from views, so it themes. */
export function BarsChart(props: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  highlight?: number;
  showLabels?: boolean;
  class?: string;
}) {
  const height = props.height ?? 120;
  let max = 1;
  for (const row of props.data) if (row.value > max) max = row.value;
  return (
    <View class={"flex-row items-end gap-2 " + (props.class ?? "")}>
      <Each of={props.data}>
        {(row, index) => {
          const bar = Math.max(4, Math.round((row().value / max) * height));
          const strong = props.highlight === index();
          return (
            <View class="flex-1 items-center gap-2">
              <View
                class="w-full justify-end rounded-sm bg-surface-container-low"
                style={{ height: height }}
              >
                <View
                  class="w-full rounded-sm"
                  style={{
                    height: bar,
                    backgroundColor: strong
                      ? palette.primary
                      : props.color ?? palette.primaryContainer + "B3",
                  }}
                />
              </View>
              <If when={props.showLabels !== false}>
                <Text class="font-label text-label-sm text-outline">{row().label}</Text>
              </If>
            </View>
          );
        }}
      </Each>
    </View>
  );
}

/** A compact column sparkline, one value per bar. */
export function MiniBars(props: {
  data: number[];
  height?: number;
  color?: string;
  class?: string;
}) {
  const height = props.height ?? 36;
  let max = 1;
  for (const v of props.data) if (v > max) max = v;
  return (
    <View class={"flex-row items-end gap-0.5 " + (props.class ?? "")} style={{ height }}>
      <Each of={props.data}>
        {(value) => (
          <View
            class="flex-1 rounded-sm"
            style={{
              height: Math.max(2, Math.round((value() / max) * height)),
              backgroundColor: props.color ?? palette.primaryContainer,
              opacity: 0.55,
            }}
          />
        )}
      </Each>
    </View>
  );
}

function points(data: number[], width: number, height: number, pad: number) {
  let min = data[0] ?? 0;
  let max = min;
  for (const v of data) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  return data.map((v, i) => ({
    x: pad + i * step,
    y: height - pad - ((v - min) / span) * (height - pad * 2),
  }));
}

/** A filled line chart drawn natively. */
export function AreaChart(props: {
  data: number[];
  height?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  class?: string;
}) {
  const height = props.height ?? 120;
  const stroke = props.color ?? palette.primaryContainer;
  return (
    <Canvas
      class={"w-full " + (props.class ?? "")}
      style={{ height }}
      draw={(cx, size) => {
        const pts = points(props.data, size.width, size.height, 6);
        if (pts.length === 0) return;
        cx.beginPath();
        cx.moveTo(pts[0].x, size.height);
        for (const p of pts) cx.lineTo(p.x, p.y);
        cx.lineTo(pts[pts.length - 1].x, size.height);
        cx.closePath();
        cx.fillStyle = props.fill ?? "#B4432614";
        cx.fill();

        cx.beginPath();
        cx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) cx.lineTo(p.x, p.y);
        cx.strokeStyle = stroke;
        cx.lineWidth = props.strokeWidth ?? 2;
        cx.lineJoin = "round";
        cx.lineCap = "round";
        cx.stroke();
      }}
    />
  );
}

/** Two lines on one canvas, for a comparison. */
export function DualLineChart(props: {
  series: { data: number[]; color: string }[];
  height?: number;
  class?: string;
}) {
  const height = props.height ?? 140;
  return (
    <Canvas
      class={"w-full " + (props.class ?? "")}
      style={{ height }}
      draw={(cx, size) => {
        for (const line of props.series) {
          const pts = points(line.data, size.width, size.height, 6);
          if (pts.length === 0) continue;
          cx.beginPath();
          cx.moveTo(pts[0].x, pts[0].y);
          for (const p of pts) cx.lineTo(p.x, p.y);
          cx.strokeStyle = line.color;
          cx.lineWidth = 2;
          cx.lineJoin = "round";
          cx.lineCap = "round";
          cx.stroke();
        }
      }}
    />
  );
}

/** A ring chart; the centre is the caller's content. */
export function Donut(props: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  class?: string;
  children?: JSX.Element;
}) {
  const size = props.size ?? 148;
  const thickness = props.thickness ?? 16;
  return (
    <View
      class={"items-center justify-center " + (props.class ?? "")}
      style={{ width: size, height: size }}
    >
      <Canvas
        style={{ position: "absolute", width: size, height: size }}
        draw={(cx) => {
          const total = props.segments.reduce((sum, s) => sum + s.value, 0) || 1;
          const cx0 = size / 2;
          const cy0 = size / 2;
          const r = (size - thickness) / 2;
          let angle = -Math.PI / 2;
          for (const segment of props.segments) {
            const sweep = (segment.value / total) * Math.PI * 2;
            cx.beginPath();
            cx.arc(cx0, cy0, r, angle, angle + sweep - 0.02);
            cx.strokeStyle = segment.color;
            cx.lineWidth = thickness;
            cx.stroke();
            angle += sweep;
          }
        }}
      />
      <View class="items-center justify-center">{props.children}</View>
    </View>
  );
}

/** A thin progress track. */
export function ProgressBar(props: {
  value: number;
  color?: string;
  height?: number;
  class?: string;
  trackClass?: string;
}) {
  const clamped = Math.max(0, Math.min(1, props.value));
  return (
    <View
      class={
        "w-full overflow-hidden rounded-full " +
        (props.trackClass ?? "bg-surface-container") +
        (props.class ? " " + props.class : "")
      }
      style={{ height: props.height ?? 6 }}
    >
      <View
        class="h-full rounded-full"
        style={{
          width: ((clamped * 100).toFixed(1) + "%") as `${number}%`,
          backgroundColor: props.color ?? palette.primaryContainer,
        }}
      />
    </View>
  );
}

/** Label, track and value — a category's share of a total. */
export function ShareRow(props: {
  label: string;
  value: string;
  ratio: number;
  color?: string;
  class?: string;
}) {
  return (
    <View class={"gap-1.5 " + (props.class ?? "")}>
      <View class="flex-row items-center justify-between gap-3">
        <Text class="font-body text-body-md text-on-surface">{props.label}</Text>
        <Text class="font-label text-label-md text-on-surface tabular-nums">
          {props.value}
        </Text>
      </View>
      <ProgressBar value={props.ratio} color={props.color} height={5} />
    </View>
  );
}

/** The chart palette, exported for screens that pick colors. */
export { chartColors };
