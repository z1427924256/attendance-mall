import { useMemo, useState, useEffect, useRef } from "react";
import {
  Card,
  DatePicker,
  Radio,
  Table,
  Tag,
  Button,
} from "@arco-design/web-react";
import { IconDownload } from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import VChart from "@visactor/vchart";
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

type Period = "week" | "month" | "quarter" | "custom";

export default function Reports() {
  const { merchants, records } = useAdminStore();
  const [period, setPeriod] = useState<Period>("week");
  const [customRange, setCustomRange] = useState<[string, string]>([
    dayjs().subtract(29, "day").format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD"),
  ]);

  const dateRange = useMemo(() => {
    const end = dayjs();
    switch (period) {
      case "week":
        return [end.subtract(6, "day"), end];
      case "month":
        return [end.subtract(29, "day"), end];
      case "quarter":
        return [end.subtract(89, "day"), end];
      case "custom":
        return [dayjs(customRange[0]), dayjs(customRange[1])];
    }
  }, [period, customRange]);

  const rangeRecords = useMemo(() => {
    return records.filter((r) => {
      const d = dayjs(r.date);
      return (
        (d.isAfter(dateRange[0], "day") || d.isSame(dateRange[0], "day")) &&
        (d.isBefore(dateRange[1], "day") || d.isSame(dateRange[1], "day"))
      );
    });
  }, [records, dateRange]);

  // 总体统计
  const total = rangeRecords.length;
  const signedIn = rangeRecords.filter((r) => r.status === "signedIn").length;
  const absent = rangeRecords.filter((r) => r.status === "absent").length;
  const unsigned = rangeRecords.filter((r) => r.status === "unsigned").length;
  const rate = total ? Math.round((signedIn / total) * 100) : 0;

  // 每日趋势
  const trendData = useMemo(() => {
    const map: Record<string, { signed: number; absent: number; unsigned: number }> = {};
    rangeRecords.forEach((r) => {
      if (!map[r.date]) {
        map[r.date] = { signed: 0, absent: 0, unsigned: 0 };
      }
      if (r.status === "signedIn") map[r.date].signed++;
      else if (r.status === "absent") map[r.date].absent++;
      else map[r.date].unsigned++;
    });
    return Object.keys(map)
      .sort()
      .map((date) => ({
        date: date.slice(5),
        到岗: map[date].signed,
        缺勤: map[date].absent,
        未签到: map[date].unsigned,
        到岗率:
          map[date].signed + map[date].absent + map[date].unsigned > 0
            ? Math.round(
                (map[date].signed /
                  (map[date].signed + map[date].absent + map[date].unsigned)) *
                  100
              )
            : 0,
      }));
  }, [rangeRecords]);

  // 各楼层统计
  const floorData = useMemo(() => {
    return ["1F", "2F", "3F", "4F"].map((floor) => {
      const floorMerchants = merchants.filter((m) => m.floor === floor);
      const floorRecords = rangeRecords.filter((r) =>
        floorMerchants.some((m) => m.id === r.merchantId)
      );
      const signed = floorRecords.filter((r) => r.status === "signedIn").length;
      const abs = floorRecords.filter((r) => r.status === "absent").length;
      const uns = floorRecords.filter((r) => r.status === "unsigned").length;
      return {
        楼层: floor,
        到岗: signed,
        缺勤: abs,
        未签到: uns,
        到岗率: floorRecords.length
          ? Math.round((signed / floorRecords.length) * 100)
          : 0,
      };
    });
  }, [merchants, rangeRecords]);

  // 商户维度排行
  const merchantStats = useMemo(() => {
    return merchants
      .map((m) => {
        const list = rangeRecords.filter((r) => r.merchantId === m.id);
        const signed = list.filter((r) => r.status === "signedIn").length;
        const absent = list.filter((r) => r.status === "absent").length;
        const unsigned = list.filter((r) => r.status === "unsigned").length;
        return {
          key: m.id,
          id: m.id,
          name: m.name,
          floor: m.floor,
          location: m.location,
          category: m.category,
          signed,
          absent,
          unsigned,
          total: list.length,
          rate: list.length ? Math.round((signed / list.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [merchants, rangeRecords]);

  const handleExport = () => {
    exportCsv(
      merchantStats.map((m) => ({
        商户名称: m.name,
        楼层: m.floor,
        铺位: m.location,
        业态: m.category,
        应到天数: m.total,
        已到岗: m.signed,
        缺勤: m.absent,
        未签到: m.unsigned,
        到岗率: `${m.rate}%`,
      })),
      `考勤报表_${dateRange[0].format("YYYYMMDD")}-${dateRange[1].format(
        "YYYYMMDD"
      )}`
    );
  };

  const statItems = [
    { title: "记录总数", value: total, color: undefined },
    { title: "到岗", value: signedIn, color: "rgb(var(--primary-6))" },
    { title: "缺勤", value: absent, color: "rgb(var(--danger-6))" },
    { title: "到岗率", value: rate, color: "rgb(var(--primary-6))", suffix: "%" },
  ];

  return (
    <div>
      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text">考勤报表统计</span>
          </div>
        }
        bordered
      >
        <div className="filter-bar">
          <Radio.Group
            value={period}
            onChange={(value: Period) => setPeriod(value)}
            type="button"
            size="small"
          >
            <Radio value="week">近7天</Radio>
            <Radio value="month">近30天</Radio>
            <Radio value="quarter">近90天</Radio>
            <Radio value="custom">自定义</Radio>
          </Radio.Group>
          {period === "custom" && (
            <DatePicker.RangePicker
              value={customRange}
              onChange={(dateString: string[]) => {
                if (dateString && dateString[0] && dateString[1]) {
                  setCustomRange([dateString[0], dateString[1]]);
                }
              }}
              format="YYYY-MM-DD"
            />
          )}
          <Button
            type="primary"
            icon={<IconDownload />}
            onClick={handleExport}
          >
            导出 CSV
          </Button>
        </div>

        <div className="stat-grid">
          {statItems.map((item) => (
            <Card key={item.title} bordered>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: item.color ?? "#333" }}>
                  {item.value}
                  {item.suffix && (
                    <span style={{ fontSize: 14 }}>{item.suffix}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text">每日考勤趋势</span>
          </div>
        }
        style={{ marginTop: 16 }}
        bordered
      >
        <div className="chart-container" style={{ height: 320 }}>
          <VChartComponent spec={{
            type: 'common',
            data: [{ id: 'trend', values: trendData }],
            series: [
              { type: 'line', xField: 'date', yField: '到岗', point: { visible: true }, line: { style: { stroke: '#16a34a', lineWidth: 2 } }, seriesField: '到岗' },
              { type: 'line', xField: 'date', yField: '缺勤', point: { visible: true }, line: { style: { stroke: '#ef4444', lineWidth: 2 } }, seriesField: '缺勤' },
              { type: 'line', xField: 'date', yField: '未签到', point: { visible: true }, line: { style: { stroke: '#f59e0b', lineWidth: 2 } }, seriesField: '未签到' }
            ],
            axes: [
              { orient: 'bottom', label: { visible: true } },
              { orient: 'left', label: { visible: true } }
            ],
            tooltip: { mark: { visible: true } },
            legends: { visible: true }
          } as any} />
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text">楼层考勤对比</span>
          </div>
        }
        style={{ marginTop: 16 }}
        bordered
      >
        <div className="chart-container" style={{ height: 320 }}>
          <VChartComponent spec={{
            type: 'common',
            data: [{ id: 'floor', values: floorData }],
            series: [
              { type: 'bar', xField: '楼层', yField: '到岗', bar: { style: { fill: '#16a34a' } }, seriesField: '到岗' },
              { type: 'bar', xField: '楼层', yField: '缺勤', bar: { style: { fill: '#ef4444' } }, seriesField: '缺勤' },
              { type: 'bar', xField: '楼层', yField: '未签到', bar: { style: { fill: '#f59e0b' } }, seriesField: '未签到' }
            ],
            axes: [
              { orient: 'bottom', label: { visible: true } },
              { orient: 'left', label: { visible: true } }
            ],
            tooltip: { mark: { visible: true } },
            legends: { visible: true }
          } as any} />
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text">商户考勤明细</span>
          </div>
        }
        style={{ marginTop: 16 }}
        bordered
      >
        <div style={{ marginBottom: 8 }}>
          <span className="text-secondary">按到岗率排序</span>
        </div>
        <div className="table-wrap">
          <Table
            data={merchantStats}
            rowKey="id"
            size="small"
            border={{ wrapper: true, cell: true }}
            stripe
            hover
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
            columns={[
              {
                title: "排名",
                key: "rank",
                width: 60,
                render: (_value: unknown, _record: unknown, index: number) => index + 1,
              },
              {
                title: "商户",
                dataIndex: "name",
                key: "name",
                render: (_value: unknown, row: typeof merchantStats[number]) => (
                  <span>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>{" "}
                    <span className="text-secondary">({row.location})</span>
                  </span>
                ),
              },
              { title: "业态", dataIndex: "category", key: "category", minWidth: 80 },
              { title: "应到", dataIndex: "total", key: "total", minWidth: 60 },
              {
                title: "已到岗",
                dataIndex: "signed",
                key: "signed",
                minWidth: 70,
                render: (_value: unknown, row: typeof merchantStats[number]) => (
                  <span style={{ color: "rgb(var(--success-6))" }}>{row.signed}</span>
                ),
              },
              {
                title: "缺勤",
                dataIndex: "absent",
                key: "absent",
                minWidth: 60,
                render: (_value: unknown, row: typeof merchantStats[number]) =>
                  row.absent > 0 ? (
                    <Tag color="red" bordered={false}>{row.absent}</Tag>
                  ) : (
                    <span className="text-secondary">0</span>
                  ),
              },
              {
                title: "未签到",
                dataIndex: "unsigned",
                key: "unsigned",
                minWidth: 70,
                render: (_value: unknown, row: typeof merchantStats[number]) =>
                  row.unsigned > 0 ? (
                    <Tag color="orange" bordered={false}>{row.unsigned}</Tag>
                  ) : (
                    <span className="text-secondary">0</span>
                  ),
              },
              {
                title: "到岗率",
                dataIndex: "rate",
                key: "rate",
                minWidth: 80,
                sorter: (a: typeof merchantStats[number], b: typeof merchantStats[number]) => a.rate - b.rate,
                render: (_value: unknown, row: typeof merchantStats[number]) => (
                  <Tag
                    color={row.rate >= 80 ? "green" : row.rate >= 60 ? "orange" : "red"}
                    bordered={false}
                  >
                    {row.rate}%
                  </Tag>
                ),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
