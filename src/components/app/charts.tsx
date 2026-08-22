'use client';

import { useId, useMemo, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * مكوّنات الرسوم البيانية — SVG خالص بلا أي مكتبة رسم.
 * ---------------------------------------------------------------------------
 * لوحة الألوان مأخوذة من لوحة مُتحقَّق منها لعمى الألوان (CVD):
 *   الشريحة ١ أزرق · الشريحة ٢ برتقالي · الشريحة ٣ أخضر مائي
 * وقد اجتازت فحوص فصل الألوان في الوضعين الفاتح والداكن.
 * لأن أحد الألوان أقل من ٣:١ على الخلفية الفاتحة، كل رسم هنا يوفّر
 * «عرض الجدول» وتسميات مباشرة حتى لا يعتمد الفهم على اللون وحده.
 */

export const SERIES = {
  1: { light: '#2a78d6', dark: '#3987e5', label: 'أزرق' },
  2: { light: '#eb6834', dark: '#d95926', label: 'برتقالي' },
  3: { light: '#1baf7a', dark: '#199e70', label: 'أخضر' },
} as const;

/** يستخدم متغيرات CSS فتتبدّل قيمها تلقائيًا في الوضع الليلي */
export const seriesVar = (slot: 1 | 2 | 3) => `var(--viz-${slot})`;

/* ------------------------------- غلاف الرسم ------------------------------- */

export function ChartCard({
  title,
  subtitle,
  children,
  table,
  legend,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  table?: { headers: string[]; rows: (string | number)[][] };
  legend?: { label: string; color: string }[];
  action?: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="card viz-root p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && (
            <button
              onClick={() => setShowTable((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-fg"
              aria-pressed={showTable}
            >
              {showTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {showTable ? 'الرسم' : 'جدول'}
            </button>
          )}
        </div>
      </header>

      {legend && legend.length >= 2 && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[12px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[13px]">
            <thead>
              <tr className="border-b border-line">
                {table.headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-bold text-muted">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className={cn('px-3 py-2', j > 0 && 'num font-semibold')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/* ------------------------------ رسم أعمدة ------------------------------ */

export function ColumnChart({
  data,
  color = seriesVar(1),
  height = 190,
  valueSuffix = '',
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];

  return (
    <div className="relative" style={{ height: height + 34 }}>
      {/* خطوط الشبكة */}
      <div className="absolute inset-x-0 top-0" style={{ height }}>
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: `${(tick / top) * 100}%` }}
          >
            <span className="num w-7 shrink-0 text-left text-[10px] text-faint">{tick}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
      </div>

      {/* الأعمدة */}
      <div className="absolute inset-x-0 bottom-[26px] flex items-end gap-1.5 pr-9" style={{ top: 0 }}>
        {data.map((item, index) => {
          const ratio = item.value / top;
          return (
            <div
              key={item.label + index}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === index && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-[11px] shadow-lift">
                  <span className="font-semibold">{item.label}</span>
                  <span className="num mr-2 font-bold" style={{ color }}>
                    {item.value}
                    {valueSuffix}
                  </span>
                </div>
              )}
              <div
                className="mx-auto w-full max-w-[24px] rounded-t transition-all duration-500"
                style={{
                  height: `${Math.max(ratio * 100, item.value > 0 ? 3 : 0)}%`,
                  background: color,
                  opacity: hover === null || hover === index ? 1 : 0.45,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* المحور السيني */}
      <div className="absolute inset-x-0 bottom-0 flex gap-1.5 pr-9">
        {data.map((item, index) => (
          <span
            key={item.label + index}
            className={cn(
              'flex-1 truncate text-center text-[10px]',
              item.highlight ? 'font-bold text-fg' : 'text-faint',
            )}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- رسم خطي / مساحي --------------------------- */

export function AreaChart({
  data,
  height = 200,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  // المحور الرأسي على اليمين لأن الزمن يسير من اليمين إلى اليسار في الواجهة العربية
  const padding = { top: 12, right: 34, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];

  // i = 0 (الأقدم) عند أقصى اليمين، والأحدث عند اليسار
  const points = data.map((d, i) => ({
    x:
      padding.left +
      innerW -
      (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padding.top + innerH - (d.value / top) * innerH,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${points[points.length - 1]?.x ?? 0},${padding.top + innerH} L${points[0]?.x ?? 0},${padding.top + innerH} Z`;
  const color = seriesVar(1);

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label="تطوّر المهام المنجزة"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* شبكة أفقية */}
        {ticks.map((tick) => {
          const y = padding.top + innerH - (tick / top) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgb(var(--c-line))"
                strokeWidth="1"
              />
              <text
                x={width - padding.right + 6}
                y={y + 3}
                textAnchor="start"
                fontSize="9"
                fill="rgb(var(--c-faint))"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* منطقة التمرير */}
        {points.map((point, index) => (
          <rect
            key={point.label}
            x={point.x - innerW / Math.max(1, data.length) / 2}
            y={padding.top}
            width={innerW / Math.max(1, data.length)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}

        {hover !== null && points[hover] && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <circle
              cx={points[hover].x}
              cy={points[hover].y}
              r="5"
              fill={color}
              stroke="rgb(var(--c-surface))"
              strokeWidth="2"
            />
          </g>
        )}

        {/* نقطة النهاية مع تسمية مباشرة */}
        {points.length > 0 && (
          <>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={color}
              stroke="rgb(var(--c-surface))"
              strokeWidth="2"
            />
            <text
              x={points[points.length - 1].x + 8}
              y={points[points.length - 1].y - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="rgb(var(--c-fg))"
            >
              {points[points.length - 1].value}
            </text>
          </>
        )}
      </svg>

      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-[11px] shadow-lift"
          style={{
            left: `${(points[hover].x / width) * 100}%`,
            top: 0,
          }}
        >
          <span className="text-muted">{points[hover].label}</span>
          <span className="num mr-2 font-bold">{points[hover].value}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- أشرطة أفقية ---------------------------- */

export function BarList({
  data,
  valueSuffix = '',
}: {
  data: { label: string; value: number; color?: string; secondary?: string }[];
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium">{item.label}</span>
            <span className="num shrink-0 text-[13px] font-bold">
              {item.value}
              {valueSuffix}
              {item.secondary && <span className="mr-1 font-normal text-faint">{item.secondary}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`,
                background: item.color ?? seriesVar(1),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ حلقة نسبة ------------------------------ */

export function DonutStat({
  value,
  total,
  label,
  color = seriesVar(1),
  size = 132,
}: {
  value: number;
  total: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${percent}٪`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(var(--c-line))"
            strokeWidth="10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-2xl font-extrabold">{percent}٪</span>
          <span className="num text-[11px] text-muted">
            {value}/{total}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[12px] font-medium text-muted">{label}</p>
    </div>
  );
}

/* -------------------------------- مساعدات -------------------------------- */

/** قيم محور رأسية مستديرة ومقروءة */
function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 60 ? 10 : max <= 150 ? 25 : 50;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let value = 0; value <= top; value += step) out.push(value);
  return out;
}

export { useMemo };
