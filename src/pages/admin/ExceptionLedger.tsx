import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  DatePicker,
  Statistic,
  Message,
} from "@arco-design/web-react";
import { IconSearch, IconRefresh, IconEdit, IconDownload } from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  fetchExceptions,
  updateException,
  generateExceptions,
  type ExceptionItem,
} from "@/api/client";
import { exportCsv } from "@/utils/exportCsv";

const FormItem = Form.Item;

/* 内联 SVG 图标 */
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}><path d={d} /></svg>
);
const ThunderboltIcon = (p: { style?: React.CSSProperties }) => <Ic d="M7 2v11h3v9l7-12h-4l4-8z" {...p} />;
const WarningIcon = (p: { style?: React.CSSProperties }) => <Ic d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" {...p} />;

const STATUS_OPTIONS = [
  { label: "待处理", value: "pending" },
  { label: "整改中", value: "processing" },
  { label: "已办结", value: "resolved" },
  { label: "重点管控", value: "watchlist" },
];

const STATUS_TAG: Record<string, { color: "orange" | "blue" | "green" | "red"; text: string }> = {
  pending: { color: "orange", text: "待处理" },
  processing: { color: "blue", text: "整改中" },
  resolved: { color: "green", text: "已办结" },
  watchlist: { color: "red", text: "重点管控" },
};

const EXCEPTION_TYPE_OPTIONS = [
  { label: "缺勤", value: "absent" },
  { label: "未签到", value: "unsigned" },
];

const EXCEPTION_TYPE_TAG: Record<string, { color: "red" | "orange"; text: string }> = {
  absent: { color: "red", text: "缺勤" },
  unsigned: { color: "orange", text: "未签到" },
};

interface EditFormValues {
  status: string;
  handler: string;
  remark: string;
}

export default function ExceptionLedger() {
  const isMobile = useIsMobile();

  const [list, setList] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState<EditFormValues>({
    status: "pending",
    handler: "",
    remark: "",
  });
  const [form] = Form.useForm<EditFormValues>();

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (dateRange) {
        filters.startDate = dateRange[0].format("YYYY-MM-DD");
        filters.endDate = dateRange[1].format("YYYY-MM-DD");
      }
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.exceptionType = typeFilter;
      const data = await fetchExceptions(filters);
      setList(data);
    } catch (e) {
      Message.error((e as Error).message || "加载异常台账失败");
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, typeFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleReset = () => {
    setDateRange([dayjs().subtract(7, "day"), dayjs()]);
    setStatusFilter("");
    setTypeFilter("");
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await generateExceptions();
      Message.success(`台账已生成，共 ${res.count} 条异常记录`);
      loadList();
    } catch (e) {
      Message.error((e as Error).message || "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (item: ExceptionItem) => {
    setEditingId(item.id);
    setFormData({
      status: item.status,
      handler: item.handler ?? "",
      remark: item.remark ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }
    try {
      if (!editingId) return;
      setSubmitting(true);
      await updateException(editingId, formData);
      Message.success("整改信息已更新");
      setModalOpen(false);
      loadList();
    } catch (e) {
      Message.error((e as Error).message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (list.length === 0) {
      Message.warning("暂无数据可导出");
      return;
    }
    const rows = list.map((it) => ({
      日期: it.date,
      商户名称: it.merchantName ?? "",
      楼层: it.floor ?? "",
      铺位: it.location ?? "",
      异常类型: EXCEPTION_TYPE_TAG[it.exceptionType]?.text ?? it.exceptionType,
      状态: STATUS_TAG[it.status]?.text ?? it.status,
      处理人: it.handler ?? "",
      备注: it.remark ?? "",
      创建时间: it.createdAt ? dayjs(it.createdAt).format("YYYY-MM-DD HH:mm:ss") : "",
    }));
    exportCsv(rows, `考勤异常台账_${dayjs().format("YYYYMMDD_HHmmss")}`);
    Message.success("导出成功");
  };

  const stats = useMemo(() => {
    const total = list.length;
    const pending = list.filter((i) => i.status === "pending").length;
    const processing = list.filter((i) => i.status === "processing").length;
    const resolved = list.filter((i) => i.status === "resolved").length;
    return { total, pending, processing, resolved };
  }, [list]);

  const columns = [
    {
      key: "date",
      dataIndex: "date",
      title: "日期",
      minWidth: 100,
      render: (_value: unknown, row: ExceptionItem) =>
        row.date ? dayjs(row.date).format("YYYY-MM-DD") : "-",
    },
    { key: "merchantName", dataIndex: "merchantName", title: "商户", minWidth: 120, ellipsis: true },
    { key: "floor", dataIndex: "floor", title: "楼层", minWidth: 70 },
    { key: "location", dataIndex: "location", title: "铺位", minWidth: 90 },
    {
      key: "exceptionType",
      dataIndex: "exceptionType",
      title: "异常类型",
      minWidth: 80,
      render: (_value: unknown, row: ExceptionItem) => {
        const tag = EXCEPTION_TYPE_TAG[row.exceptionType] ?? { color: "gray" as const, text: row.exceptionType };
        return <Tag color={tag.color}>{tag.text}</Tag>;
      },
    },
    {
      key: "status",
      dataIndex: "status",
      title: "状态",
      minWidth: 80,
      render: (_value: unknown, row: ExceptionItem) => {
        const tag = STATUS_TAG[row.status] ?? { color: "gray" as const, text: row.status };
        return <Tag color={tag.color}>{tag.text}</Tag>;
      },
    },
    { key: "handler", dataIndex: "handler", title: "处理人", minWidth: 80, ellipsis: true },
    { key: "remark", dataIndex: "remark", title: "备注", ellipsis: true },
    {
      key: "action",
      title: "操作",
      width: 160,
      fixed: "right" as const,
      render: (_value: unknown, row: ExceptionItem) => (
        <div className="action-col">
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => openEdit(row)}
          >
            整改
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-root">
      <div className="stat-grid">
        <Card bordered>
          <Statistic title="异常总数" value={stats.total} prefix={<WarningIcon style={{ color: "#fa8c16" }} />} />
        </Card>
        <Card bordered>
          <Statistic title="待处理" value={stats.pending} styleValue={{ color: "#fa8c16" }} />
        </Card>
        <Card bordered>
          <Statistic title="整改中" value={stats.processing} styleValue={{ color: "#1677ff" }} />
        </Card>
        <Card bordered>
          <Statistic title="已办结" value={stats.resolved} styleValue={{ color: "rgb(var(--primary-6))" }} />
        </Card>
      </div>

      <Card bordered>
        <div className="card-section-header">
          <span className="card-title-text">
            <WarningIcon />
            考勤异常整改台账
          </span>
          <div className="card-actions">
            <Button
              icon={<ThunderboltIcon />}
              loading={generating}
              onClick={handleGenerate}
            >
              自动生成台账
            </Button>
            <Button
              type="primary"
              icon={<IconDownload />}
              onClick={handleExport}
            >
              导出 CSV
            </Button>
          </div>
        </div>
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
            placeholder="状态筛选"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(String(val ?? ""))}
            allowClear
            options={STATUS_OPTIONS}
          />
          <Select
            placeholder="异常类型"
            value={typeFilter || undefined}
            onChange={(val) => setTypeFilter(String(val ?? ""))}
            allowClear
            options={EXCEPTION_TYPE_OPTIONS}
          />
          <Button type="primary" icon={<IconSearch />} onClick={loadList}>
            查询
          </Button>
          <Button icon={<IconRefresh />} onClick={handleReset}>
            重置
          </Button>
        </div>

        <div className="table-wrap">
          <Table
            data={list}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
          />
        </div>
      </Card>

      <Modal
        title="异常整改"
        visible={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        style={{ width: isMobile ? "100%" : 600 }}
        unmountOnExit
      >
        <Form form={form} layout="vertical">
          <div className="form-row">
            <FormItem
              label="整改状态"
              field="status"
              rules={[{ required: true, message: "请选择状态" }]}
            >
              <Select
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
              />
            </FormItem>
            <FormItem
              label="处理人"
              field="handler"
              rules={[{ required: true, message: "请输入处理人" }]}
            >
              <Input
                placeholder="处理人姓名"
                maxLength={20}
                value={formData.handler}
                onChange={(val) => setFormData({ ...formData, handler: val })}
              />
            </FormItem>
          </div>
          <FormItem label="整改备注" field="remark">
            <Input.TextArea
              autoSize={{ minRows: 4 }}
              placeholder="请输入整改说明"
              maxLength={500}
              showWordLimit
              value={formData.remark}
              onChange={(val) => setFormData({ ...formData, remark: val })}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
