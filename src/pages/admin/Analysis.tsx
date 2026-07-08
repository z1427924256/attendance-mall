import { useMemo, useState, useEffect, useRef } from "react";
import {
  Card,
  Radio,
  DatePicker,
  Button,
  Statistic,
  Table,
  Tag,
  Message,
} from "@arco-design/web-react";
import VChart from "@visactor/vchart";
import dayjs, { type Dayjs } from "dayjs";
import { useAdminStore } from "@/store/useAdminStore";
import { exportCsv } from "@/utils/exportCsv";

/* VChart 图表组件 */
function VChartComponent({ spec }: { spec: any }) {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const chart = new VChart(spec, { dom: divRef.current });
    chartRef.current = chart;
    chart.renderSync();
    return () => {
      chartRef.current?.release();
      chartRef.current = null;
    };
  }, [JSON.stringify(spec)]);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}

/* 内联 SVG 图标 */
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}><path d={d} /></svg>
);
const ArrowUpIcon = (p: { style?: React.CSSProperties }) => <Ic d="M7 14l5-5 5 5z" {...p} />;
const ArrowDownIcon = (p: { style?: React.CSSProperties }) => <Ic d="M7 10l5 5 5-5z" {...p} />;
const DownloadIcon = (p: { style?: React.CSSProperties }) => <Ic d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" {...p} />;
const ThunderboltIcon = (p: { style?: React.CSSProperties }) => <Ic d="M7 2v11h3v9l7-12h-4l4-8z" {...p} />;

interface AnomalyRow {
  name: string;
  location: string;
  floor: string;
  category: string;
  baseRate: number;
  compareRate: number;
  diff: number;
  key: string;
}

const anomalyColumns = [
  {
    dataIndex: "name",
    key: "name",
    title: "商户",
    render: (_value: string, row: AnomalyRow) => (
      <span style={{ fontWeight: 600 }}>
        {row.name}{" "}
        <span style={{ color: "#999", fontSize: 12 }}>({row.location})</span>
      </span>
    ),
  },
  { dataIndex: "floor", key: "floor", title: "楼层", minWidth: 60 },
  { dataIndex: "category", key: "category", title: "业态", minWidth: 80 },
  {
    dataIndex: "baseRate",
    key: "baseRate",
    title: "基期到岗率",
    minWidth: 100,
    render: (_value: number, row: AnomalyRow) => <Tag color="blue">{row.baseRate}%</Tag>,
    sorter: (a: AnomalyRow, b: AnomalyRow) => a.baseRate - b.baseRate,
  },
  {
    dataIndex: "compareRate",
    key: "compareRate",
    title: "对比期到岗率",
    minWidth: 100,
    render: (_value: number, row: AnomalyRow) => <Tag color="orange">{row.compareRate}%</Tag>,
    sorter: (a: AnomalyRow, b: AnomalyRow) => a.compareRate - b.compareRate,
  },
  {
    dataIndex: "diff",
    key: "diff",
    title: "差异",
    minWidth: 70,
    render: (_value: number, row: AnomalyRow) => (
      <Tag color={row.diff >= 0 ? "green" : "red"}>
        {row.diff >= 0 ? "+" : ""}{row.diff}%
      </Tag>
    ),
    sorter: (a: AnomalyRow, b: AnomalyRow) => a.diff - b.diff,
    defaultSortOrder: "descend" as const,
  },
  {
    key: "trend",
    title: "趋势",
    minWidth: 70,
    render: (_value: unknown, row: AnomalyRow) =>
      row.diff > 0 ? (
        <span style={{ color: "#52c41a" }}>
          <ArrowUpIcon style={{ width: 12, height: 12 }} /> 上升
        </span>
      ) : (
        <span style={{ color: "#ff4d4f" }}>
          <ArrowDownIcon style={{ width: 12, height: 12 }} /> 下降
        </span>
      ),
  },
];

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface PeriodRange {
  start: Dayjs;
  end: Dayjs;
  label: string;
}

// 根据粒度 + 选中日期，计算周期起止
function getPeriodRange(period: Period, date: Dayjs): PeriodRange {
  switch (period) {
    case "daily":
      return { start: date.startOf("day"), end: date.endOf("day"), label: date.format("YYYY-MM-DD") };
    case "weekly": {
      const start = date.startOf("week");
      return { start, end: start.add(6, "day").endOf("day"), label: `${start.format("MM-DD")} 周` };
    }
    case "monthly":
      return { start: date.startOf("month"), end: date.endOf("month"), label: date.format("YYYY年MM月") };
    case "quarterly": {
      const month = date.month();
      const qStartMonth = Math.floor(month / 3) * 3;
      const start = date.month(qStartMonth).startOf("month");
      const end = start.add(2, "month").endOf("month");
      return { start, end, label: `${date.year()}年Q${Math.floor(month / 3) + 1}` };
    }
    case "yearly":
      return { start: date.startOf("year"), end: date.endOf("year"), label: `${date.year()}年` };
  }
}

// 将周期切分为多个子区间
function splitSubIntervals(period: Period, range: PeriodRange): { start: Dayjs; end: Dayjs; label: string }[] {
  const { start, end } = range;
  const list: { start: Dayjs; end: Dayjs; label: string }[] = [];
  if (period === "daily") {
    list.push({ start, end, label: "当日" });
  } else if (period === "weekly") {
    for (let i = 0; i < 7; i++) {
      const d = start.add(i, "day");
      list.push({ start: d.startOf("day"), end: d.endOf("day"), label: `第${i + 1}天` });
    }
  } else if (period === "monthly") {
    const days = end.date();
    for (let i = 0; i < days; i++) {
      const d = start.add(i, "day");
      list.push({ start: d.startOf("day"), end: d.endOf("day"), label: `${i + 1}日` });
    }
  } else if (period === "quarterly") {
    for (let i = 0; i < 3; i++) {
      const d = start.add(i, "month");
      list.push({ start: d.startOf("month"), end: d.endOf("month"), label: `第${i + 1}月` });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const d = start.add(i, "month");
      list.push({ start: d.startOf("month"), end: d.endOf("month"), label: `${i + 1}月` });
    }
  }
  return list;
}

function calcRate(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const signed = records.filter((r) => r.status === "signedIn").length;
  return Math.round((signed / records.length) * 100);
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "日", value: "daily" },
  { label: "周", value: "weekly" },
  { label: "月", value: "monthly" },
  { label: "季", value: "quarterly" },
  { label: "年", value: "yearly" },
];

const DATE_MODE_MAP: Record<Period, "date" | "month" | "year"> = {
  daily: "date",
  weekly: "date",
  monthly: "month",
  quarterly: "month",
  yearly: "year",
};

interface AnomalyRow {
  key: string;
  name: string;
  floor: string;
  location: string;
  category: string;
  baseRate: number;
  compareRate: number;
  diff: number;
  baseDays: number;
  compareDays: number;
}

export default function Analysis() {
  const { merchants, records } = useAdminStore();

  const [period, setPeriod] = useState<Period>("monthly");
  // 默认基期 = 数据中最新日期所在月，对比期 = 上月
  const latestDate = useMemo(() => {
    if (records.length === 0) return dayjs();
    return records.reduce(
      (max, r) => (dayjs(r.date).isAfter(max) ? dayjs(r.date) : max),
      dayjs(records[0].date)
    );
  }, [records]);

  const [baseDate, setBaseDate] = useState<Dayjs>(latestDate);
  const [compareDate, setCompareDate] = useState<Dayjs>(
    latestDate.subtract(1, "month")
  );
  const [generated, setGenerated] = useState(true);

  const baseRange = useMemo(
    () => getPeriodRange(period, baseDate),
    [period, baseDate]
  );
  const compareRange = useMemo(
    () => getPeriodRange(period, compareDate),
    [period, compareDate]
  );

  // 区间内记录
  const baseRecords = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.date);
        return (
          (d.isAfter(baseRange.start, "day") || d.isSame(baseRange.start, "day")) &&
          (d.isBefore(baseRange.end, "day") || d.isSame(baseRange.end, "day"))
        );
      }),
    [records, baseRange]
  );
  const compareRecords = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.date);
        return (
          (d.isAfter(compareRange.start, "day") || d.isSame(compareRange.start, "day")) &&
          (d.isBefore(compareRange.end, "day") || d.isSame(compareRange.end, "day"))
        );
      }),
    [records, compareRange]
  );

  const baseRate = calcRate(baseRecords);
  const compareRate = calcRate(compareRecords);
  const diff = baseRate - compareRate;
  const growth = compareRate !== 0 ? Math.round((diff / compareRate) * 1000) / 10 : 0;

  // 判断同比 / 环比
  const compareLabel = useMemo(() => {
    const yearDiff = baseRange.start.year() - compareRange.start.year();
    if (yearDiff === 1 && baseRange.start.month() === compareRange.start.month()) {
      return "同比";
    }
    if (yearDiff === 0) {
      const monthDiff = baseRange.start.month() - compareRange.start.month();
      if (period === "monthly" && monthDiff === 1) return "环比";
      if (period === "quarterly" && monthDiff === 3) return "环比";
    }
    if (period === "yearly" && yearDiff === 1) return "同比";
    if (period === "daily" && baseRange.start.diff(compareRange.start, "day") === 1) return "环比";
    if (period === "weekly" && baseRange.start.diff(compareRange.start, "week") === 1) return "环比";
    return "对比";
  }, [period, baseRange, compareRange]);

  // 趋势对比
  const trendData = useMemo(() => {
    const baseIntervals = splitSubIntervals(period, baseRange);
    const compareIntervals = splitSubIntervals(period, compareRange);
    const len = Math.max(baseIntervals.length, compareIntervals.length);
    return Array.from({ length: len }, (_, i) => {
      const b = baseIntervals[i];
      const c = compareIntervals[i];
      const bRate = b
        ? calcRate(
            records.filter((r) => {
              const d = dayjs(r.date);
              return (
                (d.isAfter(b.start, "day") || d.isSame(b.start, "day")) &&
                (d.isBefore(b.end, "day") || d.isSame(b.end, "day"))
              );
            })
          )
        : null;
      const cRate = c
        ? calcRate(
            records.filter((r) => {
              const d = dayjs(r.date);
              return (
                (d.isAfter(c.start, "day") || d.isSame(c.start, "day")) &&
                (d.isBefore(c.end, "day") || d.isSame(c.end, "day"))
              );
            })
          )
        : null;
      return {
        label: b?.label ?? c?.label ?? `第${i + 1}段`,
        基期: bRate,
        对比期: cRate,
      };
    });
  }, [records, period, baseRange, compareRange]);

  // 楼层对比
  const floorCompare = useMemo(() => {
    return ["1F", "2F", "3F", "4F"].map((floor) => {
      const floorMerchants = merchants.filter((m) => m.floor === floor);
      const ids = new Set(floorMerchants.map((m) => m.id));
      const bRecs = baseRecords.filter((r) => ids.has(r.merchantId));
      const cRecs = compareRecords.filter((r) => ids.has(r.merchantId));
      return {
        楼层: floor,
        基期: calcRate(bRecs),
        对比期: calcRate(cRecs),
      };
    });
  }, [merchants, baseRecords, compareRecords]);

  // 异常商户：到岗率差异 > 10%
  const anomalyList = useMemo<AnomalyRow[]>(() => {
    return merchants
      .map((m) => {
        const bRecs = baseRecords.filter((r) => r.merchantId === m.id);
        const cRecs = compareRecords.filter((r) => r.merchantId === m.id);
        const bRate = calcRate(bRecs);
        const cRate = calcRate(cRecs);
        const d = bRate - cRate;
        return {
          key: m.id,
          name: m.name,
          floor: m.floor,
          location: m.location,
          category: m.category,
          baseRate: bRate,
          compareRate: cRate,
          diff: d,
          baseDays: bRecs.length,
          compareDays: cRecs.length,
        };
      })
      .filter((m) => m.baseDays > 0 && m.compareDays > 0 && Math.abs(m.diff) > 10)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [merchants, baseRecords, compareRecords]);

  const handleGenerate = () => {
    setGenerated(true);
    Message.success("分析已生成");
  };

  const handleExport = () => {
    if (anomalyList.length === 0) {
      Message.warning("暂无异常数据可导出");
      return;
    }
    exportCsv(
      anomalyList.map((m) => ({
        商户名称: m.name,
        楼层: m.floor,
        铺位: m.location,
        业态: m.category,
        基期到岗率: `${m.baseRate}%`,
        对比期到岗率: `${m.compareRate}%`,
        差异: `${m.diff}%`,
        趋势: m.diff > 0 ? "上升" : "下降",
      })),
      `考勤异常分析_${baseRange.label}_vs_${compareRange.label}`
    );
  };

  // 根据当前周期粒度渲染对应 DatePicker（Arco 通过子组件切换月/年）
  const renderDatePicker = (
    currentValue: Dayjs,
    onSelect: (val: string) => void
  ): React.ReactNode => {
    const mode = DATE_MODE_MAP[period];
    const size = "small";
    if (mode === "month") {
      return (
        <DatePicker.MonthPicker
          value={currentValue.toDate()}
          onChange={onSelect}
          size={size}
        />
      );
    }
    if (mode === "year") {
      return (
        <DatePicker.YearPicker
          value={currentValue.toDate()}
          onChange={onSelect}
          size={size}
        />
      );
    }
    return (
      <DatePicker
        value={currentValue.toDate()}
        onChange={onSelect}
        size={size}
      />
    );
  };

  return (
    <div>
      {/* 控制区 */}
      <Card title="考勤深度分析（同比 / 环比）" bordered>
        <div className="filter-bar">
          <Radio.Group
            value={period}
            onChange={(value: Period) => {
              setPeriod(value);
              setGenerated(false);
            }}
            type="button"
            size="small"
          >
            {PERIOD_OPTIONS.map((o) => (
              <Radio key={o.value} value={o.value}>
                {o.label}
              </Radio>
            ))}
          </Radio.Group>
          <div className="inline-group" style={{ gap: 6 }}>
            <span style={{ color: "#999" }}>基期：</span>
            {renderDatePicker(baseDate, (val: string) => {
              if (val) {
                setBaseDate(dayjs(val));
                setGenerated(false);
              }
            })}
          </div>
          <div className="inline-group" style={{ gap: 6 }}>
            <span style={{ color: "#999" }}>对比期：</span>
            {renderDatePicker(compareDate, (val: string) => {
              if (val) {
                setCompareDate(dayjs(val));
                setGenerated(false);
              }
            })}
          </div>
          <Button
            type="primary"
            icon={<ThunderboltIcon />}
            onClick={handleGenerate}
          >
            生成分析
          </Button>
        </div>
      </Card>

      {!generated ? (
        <Card style={{ marginTop: 16 }}>
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            请选择周期与日期后点击「生成分析」
          </div>
        </Card>
      ) : (
        <>
          {/* 汇总卡 */}
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <Card bordered bodyStyle={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 100 }}>
              <Statistic title="基期到岗率" value={baseRate} suffix="%" styleValue={{ color: "#1677ff" }} />
              <span style={{ color: "#999", fontSize: 12 }}>{baseRange.label}</span>
            </Card>
            <Card bordered bodyStyle={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 100 }}>
              <Statistic title="对比期到岗率" value={compareRate} suffix="%" styleValue={{ color: "#8c8c8c" }} />
              <span style={{ color: "#999", fontSize: 12 }}>{compareRange.label}</span>
            </Card>
            <Card bordered bodyStyle={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 100 }}>
              <Statistic
                title={`${compareLabel}差异`}
                value={diff}
                suffix="%"
                styleValue={{ color: diff >= 0 ? "#52c41a" : "#ff4d4f" }}
                prefix={diff >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              />
              <span style={{ color: "#999", fontSize: 12 }}>基期 − 对比期</span>
            </Card>
            <Card bordered bodyStyle={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 100 }}>
              <Statistic
                title="增长率"
                value={growth}
                suffix="%"
                styleValue={{ color: growth >= 0 ? "#52c41a" : "#ff4d4f" }}
                prefix={growth >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              />
              <span style={{ color: "#999", fontSize: 12 }}>相对对比期</span>
            </Card>
          </div>

          {/* 趋势对比 */}
          <Card title="趋势对比" style={{ marginTop: 16 }} bordered>
            <div className="chart-container" style={{ height: 320 }}>
              <VChartComponent spec={{
                type: 'common',
                data: [{ id: 'trend', values: trendData }],
                series: [
                  { type: 'line', xField: 'label', yField: '基期', point: { visible: true }, line: { style: { stroke: '#1677ff', lineWidth: 2 } }, seriesField: '基期' },
                  { type: 'line', xField: 'label', yField: '对比期', point: { visible: true }, line: { style: { stroke: '#fa8c16', lineWidth: 2, lineDash: [5, 3] } }, seriesField: '对比期' }
                ],
                axes: [
                  { orient: 'bottom', label: { visible: true } },
                  { orient: 'left', label: { visible: true }, min: 0, max: 100 }
                ],
                tooltip: { mark: { visible: true } },
                legends: { visible: true }
              } as any} />
            </div>
          </Card>

          {/* 楼层对比 */}
          <Card title="各楼层到岗率对比" style={{ marginTop: 16 }} bordered>
            <div className="chart-container" style={{ height: 320 }}>
              <VChartComponent spec={{
                type: 'common',
                data: [{ id: 'floor', values: floorCompare }],
                series: [
                  { type: 'bar', xField: '楼层', yField: '基期', bar: { style: { fill: '#1677ff', cornerRadius: [4, 4, 0, 0] } }, seriesField: '基期' },
                  { type: 'bar', xField: '楼层', yField: '对比期', bar: { style: { fill: '#fa8c16', cornerRadius: [4, 4, 0, 0] } }, seriesField: '对比期' }
                ],
                axes: [
                  { orient: 'bottom', label: { visible: true } },
                  { orient: 'left', label: { visible: true }, min: 0, max: 100 }
                ],
                tooltip: { mark: { visible: true } },
                legends: { visible: true }
              } as any} />
            </div>
          </Card>

          {/* 异常表 */}
          <Card
            style={{ marginTop: 16 }}
            bordered
          >
            <div className="card-section-header">
              <span className="card-title-text">异常商户明细（到岗率差异 &gt; 10%）</span>
              <div className="card-actions">
                <Button
                  icon={<DownloadIcon />}
                  onClick={handleExport}
                  size="small"
                >
                  导出 CSV
                </Button>
              </div>
            </div>
            <div className="table-wrap">
              <Table
                data={anomalyList}
                rowKey="key"
                size="small"
                border={{ wrapper: true, cell: true }}
                scroll={{ x: "max-content" }}
                pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
                columns={anomalyColumns}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
