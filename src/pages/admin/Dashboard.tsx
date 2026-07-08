import { Card, Statistic, Table, Tag, Progress, Grid } from "@arco-design/web-react";
import {
  IconFile,
  IconCheckCircle,
  IconCloseCircle,
  IconClockCircle,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import { useAdminStore } from "@/store/useAdminStore";
import VChart from "@visactor/vchart";
import { useEffect, useRef } from "react";

const { Row, Col } = Grid;

const FLOOR_COLORS = ["#16a34a", "#22c55e", "#f59e0b", "#ef4444"];

/* ---------- VChart 图表组件 ---------- */

function TrendLineChart({ data }: { data: Record<string, unknown>[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const vchartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const spec: any = {
      type: "common",
      data: [{ id: "trend", values: data }],
      series: [
        {
          type: "line",
          xField: "date",
          yField: "到岗",
          point: { visible: true },
          line: { style: { stroke: "#16a34a", lineWidth: 2 } },
        },
        {
          type: "line",
          xField: "date",
          yField: "缺勤",
          point: { visible: true },
          line: { style: { stroke: "#ef4444", lineWidth: 2 } },
        },
        {
          type: "line",
          xField: "date",
          yField: "未签到",
          point: { visible: true },
          line: { style: { stroke: "#f59e0b", lineWidth: 2 } },
        },
      ],
      axes: [
        { orient: "bottom", label: { visible: true } },
        { orient: "left", label: { visible: true } },
      ],
      tooltip: { mark: { visible: true } },
      legends: { visible: true },
    };
    const vchart = new VChart(spec, { dom: chartRef.current });
    vchartRef.current = vchart;
    vchart.renderSync();
    return () => {
      vchartRef.current?.release();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
}

function FloorBarChart({ data }: { data: Record<string, unknown>[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const vchartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const spec: any = {
      type: "bar",
      data: [{ id: "floor", values: data }],
      xField: "总数",
      yField: "name",
      direction: "horizontal",
      series: [
        {
          type: "bar",
          xField: "已到岗",
          yField: "name",
          stack: true,
          bar: { style: { fill: "#16a34a" } },
        },
        {
          type: "bar",
          xField: "未到岗",
          yField: "name",
          stack: true,
          bar: { style: { fill: "#e5e7eb" } },
        },
      ],
      axes: [
        { orient: "bottom", label: { visible: true } },
        { orient: "left", label: { visible: true } },
      ],
      tooltip: { mark: { visible: true } },
      legends: { visible: true },
    };
    const vchart = new VChart(spec, { dom: chartRef.current });
    vchartRef.current = vchart;
    vchart.renderSync();
    return () => {
      vchartRef.current?.release();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
}

function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const vchartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const spec: any = {
      type: "pie",
      data: [{ id: "cat", values: data }],
      valueField: "value",
      categoryField: "name",
      pie: { style: { cornerRadius: 4 } },
      label: { visible: true },
      tooltip: { mark: { visible: true } },
      legends: { visible: true },
      color: FLOOR_COLORS,
    };
    const vchart = new VChart(spec, { dom: chartRef.current });
    vchartRef.current = vchart;
    vchart.renderSync();
    return () => {
      vchartRef.current?.release();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
}

/* ---------- 主页面 ---------- */

export default function AdminDashboard() {
  const { merchants, records } = useAdminStore();

  // 今日数据
  const today = dayjs().format("YYYY-MM-DD");
  const todayRecords = records.filter((r) => r.date === today);
  const signedIn = todayRecords.filter((r) => r.status === "signedIn").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const unsigned = todayRecords.filter((r) => r.status === "unsigned").length;
  const rate = Math.round((signedIn / merchants.length) * 100);

  // 近 7 天趋势
  const trendData = (() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates.map((date) => {
      const list = records.filter((r) => r.date === date);
      const s = list.filter((r) => r.status === "signedIn").length;
      const a = list.filter((r) => r.status === "absent").length;
      const u = list.filter((r) => r.status === "unsigned").length;
      return {
        date: date.slice(5),
        到岗: s,
        缺勤: a,
        未签到: u,
        到岗率: list.length ? Math.round((s / list.length) * 100) : 0,
      };
    });
  })();

  // 楼层分布
  const floorData = ["1F", "2F", "3F", "4F"].map((floor, idx) => {
    const list = merchants.filter((m) => m.floor === floor);
    const signed = list.filter((m) =>
      todayRecords.find(
        (r) => r.merchantId === m.id && r.status === "signedIn"
      )
    ).length;
    return {
      name: floor,
      总数: list.length,
      已到岗: signed,
      未到岗: list.length - signed,
      color: FLOOR_COLORS[idx],
    };
  });

  // 业态分布
  const categoryData = (() => {
    const map = merchants.reduce<Record<string, number>>((acc, m) => {
      acc[m.category] = (acc[m.category] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // 缺勤 Top5
  const absentTop = merchants
    .map((m) => ({
      ...m,
      absentCount: records.filter(
        (r) =>
          r.merchantId === m.id &&
          r.status === "absent" &&
          r.date >= dayjs().subtract(6, "day").format("YYYY-MM-DD")
      ).length,
    }))
    .filter((m) => m.absentCount > 0)
    .sort((a, b) => b.absentCount - a.absentCount)
    .slice(0, 5);

  const statCards = [
    { title: "商户总数", value: merchants.length, icon: <IconFile style={{ color: "rgb(var(--primary-6))", fontSize: 22 }} />, suffix: "户" },
    { title: "今日到岗", value: signedIn, icon: <IconCheckCircle style={{ color: "rgb(var(--success-6))", fontSize: 22 }} />, suffix: ` / ${merchants.length}` },
    { title: "今日缺勤", value: absent, icon: <IconCloseCircle style={{ color: "rgb(var(--danger-6))", fontSize: 22 }} />, suffix: "户" },
    { title: "今日未签到", value: unsigned, icon: <IconClockCircle style={{ color: "rgb(var(--warning-6))", fontSize: 22 }} />, suffix: "户" },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <div className="stat-grid">
        {statCards.map((s) => (
          <Card key={s.title} bordered hoverable>
            <Statistic
              title={s.title}
              value={s.value}
              suffix={s.suffix}
              prefix={s.icon}
            />
          </Card>
        ))}
      </div>

      {/* 趋势图 + 到岗率 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={16}>
          <Card
            title={
              <div className="card-header-bar">
                <span className="card-title-text">近 7 天考勤趋势</span>
              </div>
            }
            bordered
          >
            <div className="chart-container">
              <TrendLineChart data={trendData} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            title={
              <div className="card-header-bar">
                <span className="card-title-text">今日到岗率</span>
              </div>
            }
            bordered
          >
            <div style={{ textAlign: "center", paddingTop: 24 }}>
              <Progress
                type="circle"
                percent={rate}
                trailColor="var(--color-fill-2)"
                size="large"
              />
              <div style={{ marginTop: 16 }}>
                <span style={{ color: "#999" }}>
                  {signedIn} / {merchants.length} 户已到岗
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 楼层分布 + 业态占比 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={
              <div className="card-header-bar">
                <span className="card-title-text">楼层到岗分布</span>
              </div>
            }
            bordered
          >
            <div className="chart-container">
              <FloorBarChart data={floorData} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <div className="card-header-bar">
                <span className="card-title-text">业态占比</span>
              </div>
            }
            bordered
          >
            <div className="chart-container">
              <CategoryPieChart data={categoryData} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 缺勤 Top5 */}
      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text">本周缺勤 Top5 商户</span>
          </div>
        }
        bordered
        style={{ marginTop: 16 }}
      >
        <div className="table-wrap">
          <Table
            data={absentTop}
            rowKey="id"
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={false}
            columns={[
              {
                title: "排名",
                key: "rank",
                width: 60,
                render: (_value, _record, index) => index + 1,
              },
              { title: "商户名称", dataIndex: "name", key: "name", ellipsis: true },
              { title: "楼层", dataIndex: "floor", key: "floor", minWidth: 70 },
              { title: "铺位", dataIndex: "location", key: "location", minWidth: 80 },
              { title: "业态", dataIndex: "category", key: "category", minWidth: 80 },
              {
                title: "缺勤次数",
                dataIndex: "absentCount",
                key: "absentCount",
                minWidth: 90,
                render: (value: number) => (
                  <Tag color="red" bordered={false}>
                    {value} 次
                  </Tag>
                ),
                sorter: (a: typeof absentTop[number], b: typeof absentTop[number]) =>
                  b.absentCount - a.absentCount,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
