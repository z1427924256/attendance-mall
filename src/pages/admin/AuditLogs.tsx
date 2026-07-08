import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Alert,
  Message,
} from "@arco-design/web-react";
import {
  IconSearch,
  IconRefresh,
  IconDownload,
  IconNotification,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import {
  fetchAuditLogs,
  type AuditLog,
  type AuditLogFilters,
} from "@/api/client";
import { useIsMobile } from "@/hooks/useIsMobile";
import { exportCsv } from "@/utils/exportCsv";

interface FilterState {
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  module: string;
  action: string;
  user: string;
}

const MODULE_OPTIONS = [
  { label: "全部模块", value: "" },
  { label: "商户", value: "merchant" },
  { label: "考勤", value: "attendance" },
  { label: "规则", value: "rule" },
  { label: "备份", value: "backup" },
  { label: "异常", value: "exception" },
  { label: "预警规则", value: "alert_rule" },
  { label: "公告", value: "announcement" },
  { label: "系统配置", value: "system_config" },
];

const ACTION_OPTIONS = [
  { label: "全部操作", value: "" },
  { label: "创建", value: "create" },
  { label: "更新", value: "update" },
  { label: "删除", value: "delete" },
  { label: "批量签到", value: "batch_sign" },
  { label: "批量更新", value: "batch_update" },
  { label: "批量删除", value: "batch_delete" },
  { label: "批量导入", value: "bulk_import" },
  { label: "备份", value: "backup" },
  { label: "还原", value: "restore" },
  { label: "生成异常", value: "generate_exceptions" },
];

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);
const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

const MODULE_COLORS: Record<string, string> = {
  merchant: "blue",
  attendance: "green",
  rule: "orange",
  backup: "blue",
  exception: "red",
  alert_rule: "orange",
  announcement: "blue",
  system_config: "gray",
};

const ACTION_COLORS: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
  batch_sign: "blue",
  batch_update: "blue",
  batch_delete: "red",
  bulk_import: "blue",
  backup: "blue",
  restore: "orange",
  generate_exceptions: "orange",
};

// 安全解析 JSON 字符串，失败则原样返回
function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export default function AuditLogs() {
  const isMobile = useIsMobile();
  const [list, setList] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs, dayjs.Dayjs] | null
  >(null);
  const [module, setModule] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [user, setUser] = useState<string>("");

  const fetchPage = useCallback(
    async (
      p: number,
      ps: number,
      filters: FilterState
    ) => {
      setLoading(true);
      try {
        const params: AuditLogFilters = { page: p, pageSize: ps };
        if (filters.dateRange) {
          params.startDate = filters.dateRange[0].format("YYYY-MM-DD");
          params.endDate = filters.dateRange[1].format("YYYY-MM-DD");
        }
        if (filters.module) params.module = filters.module;
        if (filters.action) params.action = filters.action;
        if (filters.user.trim()) params.user = filters.user.trim();
        const res = await fetchAuditLogs(params);
        setList(res.list);
        setTotal(res.total);
      } catch (e) {
        Message.error("审计日志加载失败：" + (e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 初始加载
  useEffect(() => {
    fetchPage(1, 10, {
      dateRange: null,
      module: "",
      action: "",
      user: "",
    });
  }, [fetchPage]);

  const currentFilters: FilterState = { dateRange, module, action, user };

  const handleSearch = () => {
    setPage(1);
    fetchPage(1, pageSize, currentFilters);
  };

  const handleReset = () => {
    setDateRange(null);
    setModule("");
    setAction("");
    setUser("");
    setPage(1);
    fetchPage(1, pageSize, {
      dateRange: null,
      module: "",
      action: "",
      user: "",
    });
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    fetchPage(p, ps, currentFilters);
  };

  const handleExport = () => {
    if (list.length === 0) {
      Message.warning("当前没有可导出的数据");
      return;
    }
    const rows = list.map((l) => ({
      时间: l.createdAt
        ? dayjs(l.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : "",
      用户: l.user,
      操作人: l.operator,
      模块: l.module,
      操作: l.action,
      目标类型: l.targetType,
      目标ID: l.targetId,
      IP地址: l.ip,
      变更前数据: l.beforeData || "",
      变更后数据: l.afterData || "",
    }));
    exportCsv(rows, `审计日志_${dayjs().format("YYYYMMDD-HHmmss")}`);
    Message.success("已导出当前页审计日志");
  };

  const columns = [
    {
      key: "createdAt",
      dataIndex: "createdAt",
      title: "时间",
      minWidth: 150,
      render: (_value: unknown, row: AuditLog) =>
        row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    { key: "user", dataIndex: "user", title: "用户", minWidth: 80, ellipsis: true },
    {
      key: "module",
      dataIndex: "module",
      title: "模块",
      minWidth: 90,
      render: (_value: unknown, row: AuditLog) => (
        <Tag color={MODULE_COLORS[row.module] || "gray"}>{MODULE_LABELS[row.module] || row.module}</Tag>
      ),
    },
    {
      key: "action",
      dataIndex: "action",
      title: "操作",
      minWidth: 100,
      render: (_value: unknown, row: AuditLog) => (
        <Tag color={ACTION_COLORS[row.action] || "gray"}>{ACTION_LABELS[row.action] || row.action}</Tag>
      ),
    },
    { key: "targetType", dataIndex: "targetType", title: "目标类型", minWidth: 90, ellipsis: true },
    { key: "targetId", dataIndex: "targetId", title: "目标ID", minWidth: 100, ellipsis: true },
    { key: "ip", dataIndex: "ip", title: "IP地址", minWidth: 110, ellipsis: true },
  ];

  const MOBILE_VISIBLE = new Set(["createdAt", "user", "module", "action"]);
  const visibleColumns = isMobile
    ? columns.filter((c) => MOBILE_VISIBLE.has(c.key))
    : columns;

  return (
    <div className="page-root">
      <Alert
        type="warning"
        content="审计日志永久归档，不可删除，记录全部后台操作行为"
      />

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconNotification />审计日志查询</span>
          </div>
        }
        bordered
      >
        <div className="filter-bar">
          <DatePicker.RangePicker
            value={dateRange ? [dateRange[0], dateRange[1]] : undefined}
            onChange={(_dateString, value) => {
              if (value && value[0] && value[1]) {
                setDateRange([value[0], value[1]]);
              } else {
                setDateRange(null);
              }
            }}
            placeholder={["开始日期", "结束日期"]}
            allowClear
          />
          <Select
            placeholder="模块"
            value={module || undefined}
            onChange={(v) => setModule(v ?? "")}
            options={MODULE_OPTIONS}
            allowClear
            showSearch
          />
          <Select
            placeholder="操作"
            value={action || undefined}
            onChange={(v) => setAction(v ?? "")}
            options={ACTION_OPTIONS}
            allowClear
            showSearch
          />
          <Input
            placeholder="用户名"
            value={user}
            onChange={(v) => setUser(v)}
            allowClear
            onPressEnter={handleSearch}
          />
          <Button
            type="primary"
            icon={<IconSearch />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button icon={<IconRefresh />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<IconDownload />} onClick={handleExport}>
            导出当前页
          </Button>
        </div>

        <div className="table-wrap">
          <Table
            data={list}
            columns={visibleColumns}
            rowKey="id"
            loading={loading}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page,
              pageSize: 10,
              total,
              showTotal: true,
              sizeCanChange: false,
              showJumper: true,
              onChange: (current: number, ps: number) => {
                handlePageChange(current, ps);
              },
            }}
            expandedRowRender={(record: AuditLog) => {
            const r = record;
            return (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>变更前数据：</span>
                  <pre
                    style={{
                      background: "var(--color-fill-2)",
                      padding: 8,
                      borderRadius: 4,
                      margin: "4px 0",
                      fontSize: 12,
                      maxHeight: 240,
                      overflow: "auto",
                    }}
                  >
                    {r.beforeData
                      ? JSON.stringify(safeParse(r.beforeData), null, 2)
                      : "无"}
                  </pre>
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>变更后数据：</span>
                  <pre
                    style={{
                      background: "var(--color-fill-2)",
                      padding: 8,
                      borderRadius: 4,
                      margin: "4px 0",
                      fontSize: 12,
                      maxHeight: 240,
                      overflow: "auto",
                    }}
                  >
                    {r.afterData
                      ? JSON.stringify(safeParse(r.afterData), null, 2)
                      : "无"}
                  </pre>
                </div>
                <span style={{ color: "var(--color-text-3)" }}>
                  操作人：{r.operator || "-"} · UserAgent：
                  {r.userAgent || "-"}
                </span>
              </div>
            );
          }}
          />
        </div>
      </Card>
    </div>
  );
}
