import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  DatePicker,
  Table,
  Tag,
  Progress,
  Input,
  Button,
  Spin,
  Message,
} from "@arco-design/web-react";
import VChart from "@visactor/vchart";
import dayjs from "dayjs";
import { fetchRatings, type RatingItem } from "@/api/client";
import { exportCsv } from "@/utils/exportCsv";

// VChart 通用组件
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
    };
  }, [JSON.stringify(spec)]);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}

// 内联 SVG 图标
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  search: "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
  download: "M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z",
  trophy: "M15.2,10.7V16.8L17.2,18.8V19.8H6.8V18.8L8.8,16.8V10.7C8.8,7.4 10.5,5.4 12,5.4C13.5,5.4 15.2,7.4 15.2,10.7M12,3.4C9.5,3.4 7.6,5.7 7.6,9.4V15.4L5.6,17.4V18.4H4.4V20.4H19.6V18.4H18.4V17.4L16.4,15.4V9.4C16.4,5.7 14.5,3.4 12,3.4M11,21.4H13A1,1 0 0,1 12,22.4A1,1 0 0,1 11,21.4Z",
};

// 等级配置：英文 key 与中文 label 都兼容
const LEVEL_CONFIG: {
  key: string;
  labels: string[];
  color: string;
  tagColor: "green" | "blue" | "orange" | "red";
}[] = [
  { key: "excellent", labels: ["excellent", "优秀"], color: "#52c41a", tagColor: "green" },
  { key: "qualified", labels: ["qualified", "合格"], color: "#1677ff", tagColor: "blue" },
  { key: "warning", labels: ["warning", "预警"], color: "#fa8c16", tagColor: "orange" },
  { key: "watchlist", labels: ["watchlist", "重点管控"], color: "#ff4d4f", tagColor: "red" },
];

function normalizeLevelKey(level: string): string {
  const lower = (level || "").toLowerCase();
  for (const cfg of LEVEL_CONFIG) {
    if (cfg.labels.some((l) => l.toLowerCase() === lower)) return cfg.key;
  }
  return "watchlist";
}

function getLevelConfig(key: string) {
  return (
    LEVEL_CONFIG.find((c) => c.key === key) ?? LEVEL_CONFIG[LEVEL_CONFIG.length - 1]
  );
}

const LEVEL_LABELS: Record<string, string> = {
  excellent: "优秀",
  qualified: "合格",
  warning: "预警",
  watchlist: "重点管控",
};

export default function Ratings() {
  const [month, setMonth] = useState<dayjs.Dayjs>(dayjs());
  const [list, setList] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    const monthStr = month.format("YYYY-MM");
    setLoading(true);
    fetchRatings(monthStr)
      .then((data) => {
        if (!cancelled) {
          setList(data);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[ratings] fetch failed:", e);
          setList([]);
          Message.warning("评级数据加载失败，请稍后重试");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // 等级分布统计
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {
      excellent: 0,
      qualified: 0,
      warning: 0,
      watchlist: 0,
    };
    list.forEach((r) => {
      const key = normalizeLevelKey(r.level);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return LEVEL_CONFIG.map((cfg) => ({
      name: LEVEL_LABELS[cfg.key],
      key: cfg.key,
      value: counts[cfg.key] ?? 0,
      color: cfg.color,
    }));
  }, [list]);

  // Top 10 排行
  const top10 = useMemo(() => {
    return [...list]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({
        name: r.merchantName,
        score: r.score,
        floor: r.floor,
      }));
  }, [list]);

  // 表格数据（带搜索）
  const tableData = useMemo(() => {
    const kw = keyword.trim();
    const filtered = kw
      ? list.filter((r) => r.merchantName.includes(kw))
      : list;
    return filtered.map((r) => ({
      key: r.merchantId,
      ...r,
      levelKey: normalizeLevelKey(r.level),
    }));
  }, [list, keyword]);

  const handleExport = () => {
    if (list.length === 0) {
      Message.warning("暂无数据可导出");
      return;
    }
    exportCsv(
      list
        .sort((a, b) => b.score - a.score)
        .map((r) => ({
          商户名称: r.merchantName,
          楼层: r.floor,
          铺位: r.location,
          业态: r.category,
          月份: r.month,
          考勤率: `${r.attendanceRate}%`,
          应到天数: r.totalDays,
          已到岗: r.presentCount,
          缺勤: r.absentCount,
          评分: r.score,
          等级: LEVEL_LABELS[normalizeLevelKey(r.level)] ?? r.level,
        })),
      `商户评级_${month.format("YYYY-MM")}`
    );
  };

  const total = list.length;
  const excellent = distribution.find((d) => d.key === "excellent")?.value ?? 0;
  const qualified = distribution.find((d) => d.key === "qualified")?.value ?? 0;
  const warning = distribution.find((d) => d.key === "warning")?.value ?? 0;
  const watchlist = distribution.find((d) => d.key === "watchlist")?.value ?? 0;

  const statItems = [
    { title: "商户总数", value: total, color: undefined, suffix: "" },
    { title: "优秀", value: excellent, color: "#52c41a", suffix: total ? ` ${Math.round((excellent / total) * 100)}%` : "" },
    { title: "合格", value: qualified, color: "#1677ff", suffix: total ? ` ${Math.round((qualified / total) * 100)}%` : "" },
    { title: "预警", value: warning, color: "#fa8c16", suffix: total ? ` ${Math.round((warning / total) * 100)}%` : "" },
    { title: "重点管控", value: watchlist, color: "#ff4d4f", suffix: total ? ` ${Math.round((watchlist / total) * 100)}%` : "" },
  ];

  // 饼图 spec
  const pieSpec = useMemo(() => ({
    type: "pie" as const,
    data: [{ id: "dist", values: distribution }],
    valueField: "value",
    categoryField: "name",
    outerRadius: 0.7,
    pie: { style: { cornerRadius: 4 } },
    color: distribution.map((d) => d.color),
    label: {
      visible: true,
      style: {
        formatter: (datum: any) => `${datum.name}: ${datum.value}`,
      },
    },
    tooltip: { mark: { visible: true } },
    legends: { visible: true },
  }), [distribution]);

  // 水平柱状图 spec
  const barColors = [
    "#faad14",
    "#d4b106",
    "#d48806",
    "#1677ff",
    "#1677ff",
    "#1677ff",
    "#1677ff",
    "#1677ff",
    "#1677ff",
    "#1677ff",
  ];
  const barSpec = useMemo(() => ({
    type: "bar" as const,
    data: [{ id: "top10", values: top10 }],
    xField: "score",
    yField: "name",
    direction: "horizontal" as const,
    bar: {
      style: {
        cornerRadius: [0, 4, 4, 0],
        fill: (datum: any) => barColors[(top10.indexOf(datum)) % barColors.length],
      },
    },
    axes: [
      { orient: "bottom", label: { visible: true }, min: 0, max: 100 },
      { orient: "left", label: { visible: true } },
    ],
    tooltip: { mark: { visible: true } },
  }), [top10]);

  return (
    <div>
      {/* 顶部：月份选择 + 汇总 */}
      <Card
        bordered
        hoverable
      >
        <div className="card-section-header">
          <span className="card-title-text">商户考核评级</span>
          <div className="card-actions">
            <DatePicker.MonthPicker
              value={month.toDate()}
              onChange={(dateString: string) => {
                if (dateString) setMonth(dayjs(dateString));
              }}
              format="YYYY-MM"
              size="small"
            />
            <Button
              type="outline"
              icon={<Ic d={ICONS.download} />}
              onClick={handleExport}
              size="small"
            >
              导出 CSV
            </Button>
          </div>
        </div>
        <Spin loading={loading}>
          <div className="stat-grid">
            {statItems.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fafafa",
                  padding: "16px 20px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: item.color ?? "#333",
                  }}
                >
                  {item.value}
                  {item.suffix && (
                    <span style={{ fontSize: 14 }}>{item.suffix}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Spin>
      </Card>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "10fr 14fr",
          gap: 16,
        }}
      >
        {/* 等级分布饼图 */}
        <Card title="评级分布" bordered hoverable>
          <Spin loading={loading}>
            {list.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
                暂无数据
              </div>
            ) : (
              <div className="chart-container" style={{ height: 320 }}>
                <VChartComponent spec={pieSpec} />
              </div>
            )}
          </Spin>
        </Card>

        {/* Top10 排行 */}
        <Card
          bordered
          hoverable
        >
          <div className="card-section-header">
            <span className="card-title-text">
              <Ic d={ICONS.trophy} size={18} style={{ color: "#faad14" }} />
              评分 Top 10 排行榜
            </span>
          </div>
          <Spin loading={loading}>
            {top10.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
                暂无数据
              </div>
            ) : (
              <div className="chart-container" style={{ height: 320 }}>
                <VChartComponent spec={barSpec} />
              </div>
            )}
          </Spin>
        </Card>
      </div>

      {/* 完整评级表 */}
      <Card
        style={{ marginTop: 16 }}
        bordered
        hoverable
      >
        <div className="card-section-header">
          <span className="card-title-text">商户评级明细</span>
          <div className="card-actions">
            <Input
              placeholder="搜索商户名称"
              prefix={<Ic d={ICONS.search} size={16} />}
              allowClear
              value={keyword}
              onChange={(v: string) => setKeyword(v)}
              size="small"
            />
          </div>
        </div>
        <div className="table-wrap">
          <Table
            data={tableData as unknown as Record<string, unknown>[]}
            rowKey="key"
            loading={loading}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
            columns={[
              {
                key: "rank",
                dataIndex: "rank",
                title: "排名",
                width: 60,
                render: (_col: unknown, _record: unknown, index: number) => index + 1,
              },
              {
                key: "merchantName",
                dataIndex: "merchantName",
                title: "商户名称",
                render: (_col: unknown, row: (typeof tableData)[number]) => (
                  <span>
                    <span style={{ fontWeight: 600 }}>{row.merchantName}</span>{" "}
                    <span style={{ color: "#999", fontSize: 12 }}>
                      ({row.location})
                    </span>
                  </span>
                ),
              },
              { key: "floor", dataIndex: "floor", title: "楼层", minWidth: 60 },
              { key: "category", dataIndex: "category", title: "业态", minWidth: 90 },
              {
                key: "attendanceRate",
                dataIndex: "attendanceRate",
                title: "考勤率",
                minWidth: 150,
              render: (_col: unknown, row: (typeof tableData)[number]) => (
                <Progress
                  percent={row.attendanceRate}
                  status={
                    row.attendanceRate >= 90
                      ? "success"
                      : row.attendanceRate >= 70
                      ? "normal"
                      : "error"
                  }
                  showText
                  style={{ fontSize: 12 }}
                />
              ),
              sorter: (a: (typeof tableData)[number], b: (typeof tableData)[number]) =>
                a.attendanceRate - b.attendanceRate,
            },
            {
              key: "absentCount",
              dataIndex: "absentCount",
              title: "缺勤",
              minWidth: 60,
              render: (_col: unknown, row: (typeof tableData)[number]) =>
                row.absentCount > 0 ? (
                  <Tag color="red">
                    {row.absentCount} 天
                  </Tag>
                ) : (
                  <span style={{ color: "#999" }}>0</span>
                ),
              sorter: (a: (typeof tableData)[number], b: (typeof tableData)[number]) =>
                a.absentCount - b.absentCount,
            },
            {
              key: "score",
              dataIndex: "score",
              title: "评分",
              minWidth: 70,
              render: (_col: unknown, row: (typeof tableData)[number]) => (
                <span style={{ fontWeight: 600 }}>{row.score}</span>
              ),
              sorter: (a: (typeof tableData)[number], b: (typeof tableData)[number]) =>
                a.score - b.score,
              defaultSortOrder: "descend" as const,
            },
            {
              key: "levelKey",
              dataIndex: "levelKey",
              title: "等级",
              minWidth: 80,
              render: (_col: unknown, row: (typeof tableData)[number]) => {
                const cfg = getLevelConfig(row.levelKey);
                return (
                  <Tag color={cfg.tagColor}>
                    {LEVEL_LABELS[row.levelKey]}
                  </Tag>
                );
              },
            },
          ]}
          />
        </div>
      </Card>
    </div>
  );
}
