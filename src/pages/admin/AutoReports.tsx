import { useMemo, useState } from "react";
import {
  Card,
  Radio,
  DatePicker,
  Button,
  Table,
  Tag,
  Message,
} from "@arco-design/web-react";
import dayjs, { type Dayjs } from "dayjs";
import { useAdminStore } from "@/store/useAdminStore";
import { exportCsv } from "@/utils/exportCsv";

// 内联 SVG 图标
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  fileText: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z",
  fileExcel: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M9,13H11V15H9V13M9,17H11V15H13V17H15V15H13V13H15V11H13V9H11V11H9V9H7V11H9V13H7V15H9V17Z",
  fileMarkdown: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M7,17V11H9V15L11,12L13,15V11H15V17H13L11,14L9,17H7Z",
  reload: "M19,12V13.5C21.24,13.5 23,15.26 23,17.5C23,18.4 22.71,19.23 22.22,19.91L21.04,18.73C21.27,18.36 21.4,17.94 21.4,17.5C21.4,16.36 20.54,15.5 19.4,15.5C18.96,15.5 18.54,15.63 18.17,15.86L17,14.69V12H15V9H12V7H15V4H17L20,7V12H19M5,19V13.5C2.76,13.5 1,15.26 1,17.5C1,18.4 1.29,19.23 1.78,19.91L2.96,18.73C2.73,18.36 2.6,17.94 2.6,17.5C2.6,16.36 3.46,15.5 4.6,15.5C5.04,5.5 5.46,15.63 5.83,15.86L7,14.69V12H9V9H12V7H9V4H7L4,7V12H5V19Z",
};

type ReportType = "daily" | "weekly" | "monthly";

const REPORT_LABELS: Record<ReportType, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
};

interface ReportRange {
  start: Dayjs;
  end: Dayjs;
}

function getReportRange(type: ReportType, date: Dayjs): ReportRange {
  if (type === "daily") {
    return { start: date.startOf("day"), end: date.endOf("day") };
  }
  if (type === "weekly") {
    const start = date.startOf("week");
    return { start, end: start.add(6, "day").endOf("day") };
  }
  return { start: date.startOf("month"), end: date.endOf("month") };
}

export default function AutoReports() {
  const { merchants, records } = useAdminStore();

  const latestDate = useMemo(() => {
    if (records.length === 0) return dayjs();
    return records.reduce(
      (max, r) => (dayjs(r.date).isAfter(max) ? dayjs(r.date) : max),
      dayjs(records[0].date)
    );
  }, [records]);

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [date, setDate] = useState<Dayjs>(latestDate);
  const [generated, setGenerated] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<Dayjs>(dayjs());

  const range = useMemo(() => getReportRange(reportType, date), [reportType, date]);

  const reportTitle = useMemo(() => {
    if (reportType === "daily") {
      return `商场考勤日报 - ${date.format("YYYY年M月D日")}`;
    }
    if (reportType === "weekly") {
      return `商场考勤周报 - ${range.start.format("M月D日")} 至 ${range.end.format("M月D日")}`;
    }
    return `商场考勤月报 - ${date.format("YYYY年M月")}`;
  }, [reportType, date, range]);

  // 区间内记录
  const rangeRecords = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.date);
        return (
          (d.isAfter(range.start, "day") || d.isSame(range.start, "day")) &&
          (d.isBefore(range.end, "day") || d.isSame(range.end, "day"))
        );
      }),
    [records, range]
  );

  // 考勤概况
  const overview = useMemo(() => {
    const total = merchants.length;
    const present = rangeRecords.filter((r) => r.status === "signedIn").length;
    const absent = rangeRecords.filter((r) => r.status === "absent").length;
    const unsigned = rangeRecords.filter((r) => r.status === "unsigned").length;
    const expected = rangeRecords.length;
    const attendanceRate = expected
      ? Math.round((present / expected) * 100)
      : 0;
    const activeMerchantIds = new Set(rangeRecords.map((r) => r.merchantId));
    const activeMerchantCount = activeMerchantIds.size;
    const exceptionCount = absent + unsigned;
    const exceptionRate = expected
      ? Math.round((exceptionCount / expected) * 100)
      : 0;
    return {
      total,
      activeMerchantCount,
      present,
      absent,
      unsigned,
      expected,
      attendanceRate,
      exceptionCount,
      exceptionRate,
    };
  }, [merchants, rangeRecords]);

  // 楼层分布
  const floorDist = useMemo(() => {
    return ["1F", "2F", "3F", "4F"].map((floor) => {
      const floorMerchants = merchants.filter((m) => m.floor === floor);
      const ids = new Set(floorMerchants.map((m) => m.id));
      const recs = rangeRecords.filter((r) => ids.has(r.merchantId));
      const present = recs.filter((r) => r.status === "signedIn").length;
      const total = recs.length;
      return {
        key: floor,
        楼层: floor,
        商户数: floorMerchants.length,
        应到: total,
        已到岗: present,
        到岗率: total ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [merchants, rangeRecords]);

  // 重点关注：缺勤 / 未签到商户
  const watchlist = useMemo(() => {
    const map: Record<
      string,
      { merchant: (typeof merchants)[number]; absent: number; unsigned: number }
    > = {};
    rangeRecords.forEach((r) => {
      const m = merchants.find((mm) => mm.id === r.merchantId);
      if (!m) return;
      if (!map[r.merchantId]) {
        map[r.merchantId] = { merchant: m, absent: 0, unsigned: 0 };
      }
      if (r.status === "absent") map[r.merchantId].absent++;
      if (r.status === "unsigned") map[r.merchantId].unsigned++;
    });
    return Object.values(map)
      .filter((v) => v.absent > 0 || v.unsigned > 0)
      .sort((a, b) => b.absent + b.unsigned - (a.absent + a.unsigned));
  }, [merchants, rangeRecords]);

  const handleGenerate = () => {
    setGenerated(true);
    setGeneratedAt(dayjs());
    Message.success(`${REPORT_LABELS[reportType]}已生成`);
  };

  const buildExportRows = () => {
    const rows: Record<string, string | number>[] = [];
    rows.push({ 项目: "报告类型", 内容: REPORT_LABELS[reportType] });
    rows.push({ 项目: "报告周期", 内容: `${range.start.format("YYYY-MM-DD")} ~ ${range.end.format("YYYY-MM-DD")}` });
    rows.push({ 项目: "生成时间", 内容: generatedAt.format("YYYY-MM-DD HH:mm:ss") });
    rows.push({ 项目: "", 内容: "" });
    rows.push({ 项目: "一、考勤概况", 内容: "" });
    rows.push({ 项目: "商户总数", 内容: overview.total });
    rows.push({ 项目: "在册商户数", 内容: overview.activeMerchantCount });
    rows.push({ 项目: "应到记录", 内容: overview.expected });
    rows.push({ 项目: "已到岗", 内容: overview.present });
    rows.push({ 项目: "缺勤", 内容: overview.absent });
    rows.push({ 项目: "未签到", 内容: overview.unsigned });
    rows.push({ 项目: "到岗率", 内容: `${overview.attendanceRate}%` });
    rows.push({ 项目: "", 内容: "" });
    rows.push({ 项目: "二、异常统计", 内容: "" });
    rows.push({ 项目: "异常总数", 内容: overview.exceptionCount });
    rows.push({ 项目: "异常率", 内容: `${overview.exceptionRate}%` });
    rows.push({ 项目: "", 内容: "" });
    rows.push({ 项目: "三、楼层分布", 内容: "" });
    floorDist.forEach((f) => {
      rows.push({ 项目: `${f.楼层} 应到`, 内容: f.应到 });
      rows.push({ 项目: `${f.楼层} 已到岗`, 内容: f.已到岗 });
      rows.push({ 项目: `${f.楼层} 到岗率`, 内容: `${f.到岗率}%` });
    });
    rows.push({ 项目: "", 内容: "" });
    rows.push({ 项目: "四、重点关注商户", 内容: "" });
    if (watchlist.length === 0) {
      rows.push({ 项目: "无异常商户", 内容: "" });
    } else {
      watchlist.forEach((w) => {
        rows.push({
          项目: w.merchant.name,
          内容: `${w.merchant.floor} · ${w.merchant.location} · 缺勤${w.absent}次 / 未签到${w.unsigned}次`,
        });
      });
    }
    return rows;
  };

  const handleExportExcel = () => {
    if (!generated) {
      Message.warning("请先生成报告");
      return;
    }
    exportCsv(buildExportRows(), `商场考勤${REPORT_LABELS[reportType]}_${date.format("YYYYMMDD")}`);
    Message.success("Excel 文件已导出");
  };

  const handleExportCsv = () => {
    if (!generated) {
      Message.warning("请先生成报告");
      return;
    }
    exportCsv(buildExportRows(), `商场考勤${REPORT_LABELS[reportType]}_${date.format("YYYYMMDD")}`);
    Message.success("CSV 文件已导出");
  };

  return (
    <div className="page-root">
      {/* 控制区 */}
      <Card title="自动报告生成" bordered>
        <div className="filter-bar">
          <Radio.Group
            value={reportType}
            onChange={(v: ReportType) => {
              setReportType(v);
              setGenerated(false);
            }}
            type="button"
            size="small"
          >
            <Radio value="daily">日报</Radio>
            <Radio value="weekly">周报</Radio>
            <Radio value="monthly">月报</Radio>
          </Radio.Group>
          <div className="inline-group" style={{ flex: "1 1 140px", minWidth: 0 }}>
            <span style={{ color: "#999", fontSize: 13, flexShrink: 0 }}>日期：</span>
            <DatePicker
              value={date.toDate()}
              onChange={(dateString: string) => {
                if (dateString) {
                  setDate(dayjs(dateString));
                  setGenerated(false);
                }
              }}
              format="YYYY-MM-DD"
              style={{ flex: 1, minWidth: 120 }}
            />
          </div>
          <Button
            type="primary"
            icon={<Ic d={ICONS.reload} size={16} />}
            onClick={handleGenerate}
          >
            生成报告
          </Button>
        </div>
      </Card>

      {/* 报告预览 */}
      <Card bordered>
        <div className="card-section-header">
          <div className="card-title-text">
            <Ic d={ICONS.fileText} size={18} />
            报告预览
          </div>
          <div className="card-actions">
            <Button
              type="outline"
              icon={<Ic d={ICONS.fileExcel} size={16} style={{ color: "#52c41a" }} />}
              onClick={handleExportExcel}
            >
              导出 Excel
            </Button>
            <Button
              type="outline"
              icon={<Ic d={ICONS.fileMarkdown} size={16} />}
              onClick={handleExportCsv}
            >
              导出 CSV
            </Button>
          </div>
        </div>
        {!generated ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            请选择报告类型与日期后点击「生成报告」
          </div>
        ) : (
          <div className="report-preview">
            {/* 报告头 */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#333",
                }}
              >
                {reportTitle}
              </div>
              <div style={{ color: "#999", fontSize: 13 }}>
                生成时间：{generatedAt.format("YYYY-MM-DD HH:mm:ss")} · 数据周期：
                {range.start.format("YYYY-MM-DD")} 至 {range.end.format("YYYY-MM-DD")}
              </div>
            </div>

            <div className="report-divider" />

            {/* 一、考勤概况 */}
            <div className="report-section-title">一、考勤概况</div>

            <div className="report-desc-grid">
              <div className="report-desc-item">
                <div className="report-desc-label">商户总数</div>
                <div className="report-desc-value">{overview.total}</div>
              </div>
              <div className="report-desc-item">
                <div className="report-desc-label">在册商户数</div>
                <div className="report-desc-value">{overview.activeMerchantCount}</div>
              </div>
              <div className="report-desc-item">
                <div className="report-desc-label">应到记录</div>
                <div className="report-desc-value">{overview.expected}</div>
              </div>
              <div className="report-desc-item">
                <div className="report-desc-label">已到岗</div>
                <div className="report-desc-value" style={{ color: "#52c41a", fontWeight: 600 }}>{overview.present}</div>
              </div>
              <div className="report-desc-item">
                <div className="report-desc-label">缺勤</div>
                <div className="report-desc-value" style={{ color: "#ff4d4f", fontWeight: 600 }}>{overview.absent}</div>
              </div>
              <div className="report-desc-item">
                <div className="report-desc-label">未签到</div>
                <div className="report-desc-value" style={{ color: "#fa8c16", fontWeight: 600 }}>{overview.unsigned}</div>
              </div>
              <div className="report-desc-item report-desc-item-full">
                <div className="report-desc-label">到岗率</div>
                <div className="report-desc-value">
                  <Tag
                    color={
                      overview.attendanceRate >= 80
                        ? "green"
                        : overview.attendanceRate >= 60
                        ? "orange"
                        : "red"
                    }
                    style={{ fontSize: 14, padding: "2px 12px" }}
                  >
                    {overview.attendanceRate}%
                  </Tag>
                </div>
              </div>
            </div>

            {/* 二、异常统计 */}
            <div className="report-section-title">二、异常统计</div>
            <div className="report-stat-grid">
              <div className="report-stat-card">
                <div className="report-stat-label">缺勤次数</div>
                <div className="report-stat-value" style={{ color: "#ff4d4f" }}>{overview.absent}</div>
              </div>
              <div className="report-stat-card">
                <div className="report-stat-label">未签到次数</div>
                <div className="report-stat-value" style={{ color: "#fa8c16" }}>{overview.unsigned}</div>
              </div>
              <div className="report-stat-card">
                <div className="report-stat-label">异常率</div>
                <Tag
                  color={overview.exceptionRate > 30 ? "red" : "orange"}
                  style={{ fontSize: 16, padding: "2px 12px" }}
                >
                  {overview.exceptionRate}%
                </Tag>
              </div>
            </div>

            {/* 三、楼层分布 */}
            <div className="report-section-title">三、楼层分布</div>
            <div className="table-wrap">
              <Table
                data={floorDist as unknown as Record<string, unknown>[]}
                rowKey="key"
                size="small"
                border={{ wrapper: true, cell: true }}
                pagination={false}
                scroll={{ x: "max-content" }}
                style={{ marginBottom: 16 }}
                columns={[
                  { key: "楼层", dataIndex: "楼层", title: "楼层", minWidth: 60 },
                  { key: "商户数", dataIndex: "商户数", title: "商户数", minWidth: 70 },
                  { key: "应到", dataIndex: "应到", title: "应到", minWidth: 70 },
                  {
                    key: "已到岗",
                    dataIndex: "已到岗",
                    title: "已到岗",
                    minWidth: 70,
                    render: (_col: unknown, row: (typeof floorDist)[number]) => (
                      <span style={{ color: "#52c41a" }}>{row.已到岗}</span>
                    ),
                  },
                  {
                    key: "到岗率",
                    dataIndex: "到岗率",
                    title: "到岗率",
                    render: (_col: unknown, row: (typeof floorDist)[number]) => (
                      <Tag
                        color={
                          row.到岗率 >= 80
                            ? "green"
                            : row.到岗率 >= 60
                            ? "orange"
                            : "red"
                        }
                      >
                        {row.到岗率}%
                      </Tag>
                    ),
                  },
                ]}
              />
            </div>

            {/* 四、重点关注商户 */}
            <div className="report-section-title">四、重点关注商户</div>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: "center", padding: 16, color: "#999", fontSize: 13 }}>
                本周期内无缺勤或未签到商户，考勤状况良好。
              </div>
            ) : (
              <div className="table-wrap">
                <Table
                  data={
                    watchlist.map((w, i) => ({
                      key: i,
                      name: w.merchant.name,
                      floor: w.merchant.floor,
                      location: w.merchant.location,
                      category: w.merchant.category,
                      manager: w.merchant.manager,
                      absent: w.absent,
                      unsigned: w.unsigned,
                    })) as unknown as Record<string, unknown>[]
                  }
                  rowKey="key"
                  size="small"
                  border={{ wrapper: true, cell: true }}
                  scroll={{ x: "max-content" }}
                  pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
                  columns={[
                    {
                      key: "name",
                      dataIndex: "name",
                      title: "商户",
                      render: (
                        _col: unknown,
                        row: { name: string; location: string }
                      ) => (
                        <span>
                          <span style={{ fontWeight: 600 }}>{row.name}</span>{" "}
                          <span style={{ color: "#999", fontSize: 12 }}>
                            ({row.location})
                          </span>
                        </span>
                      ),
                    },
                    { key: "floor", dataIndex: "floor", title: "楼层", minWidth: 60 },
                    { key: "category", dataIndex: "category", title: "业态", minWidth: 80 },
                    { key: "manager", dataIndex: "manager", title: "负责人", minWidth: 70 },
                    {
                      key: "absent",
                      dataIndex: "absent",
                      title: "缺勤",
                      minWidth: 60,
                      render: (_col: unknown, row: { absent: number }) =>
                        row.absent > 0 ? (
                          <Tag color="red">{row.absent}</Tag>
                        ) : (
                          <span style={{ color: "#999" }}>0</span>
                        ),
                    },
                    {
                      key: "unsigned",
                      dataIndex: "unsigned",
                      title: "未签到",
                      minWidth: 70,
                      render: (_col: unknown, row: { unsigned: number }) =>
                        row.unsigned > 0 ? (
                          <Tag color="orange">{row.unsigned}</Tag>
                        ) : (
                          <span style={{ color: "#999" }}>0</span>
                        ),
                    },
                  ]}
                />
              </div>
            )}

            <div className="report-divider" style={{ margin: "16px 0 12px" }} />
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#999", fontSize: 12 }}>
                —— 报告结束 · 商场考勤管理系统自动生成 ——
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
