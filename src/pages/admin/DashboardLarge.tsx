import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Typography, Grid, Space } from "@arco-design/web-react";
import VChart from "@visactor/vchart";
import dayjs from "dayjs";
import { useAdminStore } from "@/store/useAdminStore";

const { Title } = Typography;

/* ---------- VChart 通用组件 ---------- */
function VChartView({ spec }: { spec: any }) {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!divRef.current) return;
    try {
      const c = new VChart(spec, { dom: divRef.current });
      chartRef.current = c;
      c.renderSync();
    } catch (e) {
      console.error("VChart error:", e);
    }
    return () => {
      chartRef.current?.release();
      chartRef.current = null;
    };
  }, [JSON.stringify(spec)]);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}

/* ---------- Arco Design 调色板 ---------- */
const ARCO_COLORS = ["#165DFF", "#0FC6C2", "#722ED1", "#F77234", "#F53F3F", "#F7BA1E", "#9FDB1D", "#14C9C9"];

/* ---------- 公共浅色主题坐标轴 ---------- */
const lightAxisX = { orient: "bottom" as const, label: { style: { fill: "#86909c", fontSize: 11 } }, domainLine: { style: { stroke: "#e5e6eb" } }, tick: { style: { stroke: "#e5e6eb" } } };
const lightAxisY = { orient: "left" as const, label: { style: { fill: "#86909c", fontSize: 11 } }, domainLine: { style: { stroke: "#e5e6eb" } }, tick: { style: { stroke: "#e5e6eb" } } };

/* ---------- 页面组件 ---------- */
export default function DashboardLarge() {
  const { merchants, records } = useAdminStore();
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- 数据计算 ---- */
  const today = useMemo(() => {
    if (records.length === 0) return dayjs().format("YYYY-MM-DD");
    return records.reduce((max, r) => (r.date > max ? r.date : max), records[0].date);
  }, [records]);

  const todayRecords = useMemo(() => records.filter((r) => r.date === today), [records, today]);
  const signedIn = todayRecords.filter((r) => r.status === "signedIn").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const rate = merchants.length ? Math.round((signedIn / merchants.length) * 100) : 0;

  const trendData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) dates.push(dayjs(today).subtract(i, "day").format("YYYY-MM-DD"));
    return dates.map((date) => {
      const list = records.filter((r) => r.date === date);
      return { date: date.slice(5), 到岗: list.filter((r) => r.status === "signedIn").length, 缺勤: list.filter((r) => r.status === "absent").length, 未签到: list.filter((r) => r.status === "unsigned").length };
    });
  }, [records, today]);

  const floorData = useMemo(() => ["1F", "2F", "3F", "4F"].map((floor) => {
    const mids = new Set(merchants.filter((m) => m.floor === floor).map((m) => m.id));
    const recs = todayRecords.filter((r) => mids.has(r.merchantId));
    const s = recs.filter((r) => r.status === "signedIn").length;
    const total = recs.length || merchants.filter((m) => m.floor === floor).length;
    return { name: floor, 到岗率: total ? Math.round((s / total) * 100) : 0, 缺勤率: total ? Math.round(((total - s) / total) * 100) : 0 };
  }), [merchants, todayRecords]);

  const categoryData = useMemo(() => {
    const map: Record<string, { total: number; signed: number }> = {};
    merchants.forEach((m) => {
      if (!map[m.category]) map[m.category] = { total: 0, signed: 0 };
      map[m.category].total++;
      if (todayRecords.find((r) => r.merchantId === m.id)?.status === "signedIn") map[m.category].signed++;
    });
    return Object.entries(map).map(([name, v]) => ({ name, value: v.total }));
  }, [merchants, todayRecords]);

  const merchantRankData = useMemo(() => merchants.map((m) => {
    const recs = todayRecords.filter((r) => r.merchantId === m.id);
    const s = recs.filter((r) => r.status === "signedIn").length;
    return { name: m.name, 到岗率: recs.length ? Math.round((s / recs.length) * 100) : 0 };
  }).sort((a, b) => b.到岗率 - a.到岗率).slice(0, 10), [merchants, todayRecords]);

  /* ---- 统计卡片 ---- */
  const statCards = [
    { title: "商户总数", value: merchants.length, color: "#165DFF" },
    { title: "今日到岗", value: signedIn, color: "#0FC6C2" },
    { title: "今日缺勤", value: absent, color: "#F53F3F" },
    { title: "到岗率", value: `${rate}%`, color: "#F7BA1E" },
  ];

  /* ---- 图表 spec ---- */
  const trendSpec = useMemo(() => ({
    type: "common",
    data: [{ id: "t", values: trendData }],
    series: [
      { type: "area", dataIndex: 0, xField: "date", yField: "到岗", area: { style: { fill: "rgba(22,93,255,0.12)" } }, line: { style: { stroke: "#165DFF", lineWidth: 2, curveType: "monotone" } }, point: { visible: true, style: { size: 5, fill: "#165DFF" } } },
      { type: "line", dataIndex: 0, xField: "date", yField: "缺勤", line: { style: { stroke: "#F53F3F", lineWidth: 2, curveType: "monotone" } }, point: { visible: true, style: { size: 5, fill: "#F53F3F" } } },
      { type: "line", dataIndex: 0, xField: "date", yField: "未签到", line: { style: { stroke: "#F7BA1E", lineWidth: 1.5, lineDash: [4, 4] } }, point: { visible: true, style: { size: 4, fill: "#F7BA1E" } } },
    ],
    axes: [lightAxisX, lightAxisY],
    tooltip: { mark: { visible: true } },
    legends: { visible: true, orient: "top" as const, position: "start" as const },
    padding: { top: 40, right: 16, bottom: 40, left: 40 },
  }), [trendData]);

  const floorSpec = useMemo(() => ({
    type: "bar",
    data: [{ id: "f", values: floorData }],
    xField: "name",
    yField: "到岗率",
    seriesField: "type",
    color: ["#165DFF", "#F53F3F"],
    bar: { style: { cornerRadius: [4, 4, 0, 0] } },
    axes: [lightAxisX, { ...lightAxisY, min: 0, max: 100 }],
    tooltip: { mark: { visible: true } },
    legends: { visible: true, orient: "top" as const, position: "start" as const },
    padding: { top: 40, right: 16, bottom: 40, left: 40 },
  }), [floorData]);

  const pieSpec = useMemo(() => ({
    type: "pie",
    data: [{ id: "c", values: categoryData }],
    valueField: "value",
    categoryField: "name",
    outerRadius: 0.72,
    innerRadius: 0.42,
    pie: { style: { cornerRadius: 4 } },
    color: ARCO_COLORS,
    label: { visible: true, style: { fontSize: 11 } },
    tooltip: { mark: { visible: true } },
    legends: { visible: true, orient: "bottom" as const },
    padding: { top: 16, right: 16, bottom: 48, left: 16 },
  }), [categoryData]);

  const rankSpec = useMemo(() => ({
    type: "bar",
    data: [{ id: "r", values: merchantRankData }],
    xField: "到岗率",
    yField: "name",
    direction: "horizontal" as const,
    bar: { style: { cornerRadius: [0, 4, 4, 0] } },
    color: "#165DFF",
    axes: [
      { ...lightAxisX, min: 0, max: 100 },
      { orient: "left" as const, label: { style: { fill: "#4e5969", fontSize: 11 } }, domainLine: { style: { stroke: "#e5e6eb" } }, tick: { style: { stroke: "#e5e6eb" } } },
    ],
    tooltip: { mark: { visible: true } },
    padding: { top: 16, right: 16, bottom: 40, left: 60 },
  }), [merchantRankData]);

  const absenceSpec = useMemo(() => ({
    type: "area",
    data: [{ id: "a", values: trendData }],
    xField: "date",
    yField: "缺勤",
    area: { style: { fill: "rgba(245,63,63,0.5)" } },
    line: { style: { stroke: "#F53F3F", lineWidth: 2, curveType: "monotone" } },
    point: { visible: true, style: { size: 5, fill: "#F53F3F" } },
    axes: [lightAxisX, lightAxisY],
    tooltip: { mark: { visible: true } },
    padding: { top: 16, right: 16, bottom: 40, left: 40 },
  }), [trendData]);

  const gaugeSpec = useMemo(() => ({
    type: "gauge",
    data: [{ id: "g", values: [{ value: rate, title: "今日到岗率" }] }],
    valueField: "value",
    categoryField: "title",
    outerRadius: 0.85,
    innerRadius: 0.7,
    startAngle: -225,
    endAngle: 45,
    gauge: { type: "circularProgress", pointer: { visible: false } },
    arc: { style: { fill: "#165DFF", stroke: "#e5e6eb" }, width: 14 },
    label: { visible: true, style: { fontSize: 28, fill: "#1d2129", fontWeight: 700 } },
    title: { visible: true, style: { fontSize: 14, fill: "#86909c" } },
    padding: { top: 40, right: 16, bottom: 16, left: 16 },
  }), [rate]);

  /* ---- 渲染 ---- */
  const chartCard = (title: string, spec: any, height = 340) => (
    <Card bordered title={<span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>} style={{ borderRadius: 8 }}>
      <div style={{ height, overflow: "hidden" }}><VChartView spec={spec} /></div>
    </Card>
  );

  return (
    <div style={{ margin: -24, minHeight: "calc(100vh - 100px)", background: "#f2f3f5", padding: 20 }}>
      {/* 标题栏 */}
      <Card bordered style={{ marginBottom: 16, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Space size="medium">
            <Title heading={4} style={{ margin: 0, color: "#165DFF" }}>商场考勤运营大屏</Title>
          </Space>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#86909c" }}>
            <span>数据周期：{today}</span>
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 600, color: "#1d2129" }}>{now.format("YYYY-MM-DD HH:mm:ss")}</span>
          </div>
        </div>
      </Card>

      {/* 统计卡片 4 列 */}
      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        {statCards.map((s) => (
          <Grid.Col span={6} key={s.title}>
            <Card bordered style={{ borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#86909c", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
            </Card>
          </Grid.Col>
        ))}
      </Grid.Row>

      {/* 第一行：仪表盘 + 趋势折线图 */}
      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        <Grid.Col span={6}>{chartCard("今日到岗率总览", gaugeSpec, 340)}</Grid.Col>
        <Grid.Col span={18}>{chartCard("近7天考勤趋势", trendSpec, 340)}</Grid.Col>
      </Grid.Row>

      {/* 第二行：楼层柱状图 + 业态环形图 */}
      <Grid.Row gutter={16} style={{ marginBottom: 16 }}>
        <Grid.Col span={12}>{chartCard("各楼层到岗率对比", floorSpec, 360)}</Grid.Col>
        <Grid.Col span={12}>{chartCard("业态考勤分布", pieSpec, 360)}</Grid.Col>
      </Grid.Row>

      {/* 第三行：商户排名 + 缺勤趋势 */}
      <Grid.Row gutter={16}>
        <Grid.Col span={12}>{chartCard("商户到岗率排名 Top 10", rankSpec, 400)}</Grid.Col>
        <Grid.Col span={12}>{chartCard("近7天缺勤趋势", absenceSpec, 400)}</Grid.Col>
      </Grid.Row>
    </div>
  );
}
