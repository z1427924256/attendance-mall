import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Tag,
  Popconfirm,
  Message,
} from "@arco-design/web-react";
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconNotification,
  IconHistory,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  fetchAlertRecords,
  type AlertRule,
  type AlertRecord,
} from "@/api/client";

const FormItem = Form.Item;

const CONDITION_OPTIONS = [
  { label: "单日缺勤数", value: "daily_absent_count" },
  { label: "商户月度缺勤数", value: "merchant_monthly_absent" },
];

const CONDITION_TAG: Record<string, string> = {
  daily_absent_count: "单日缺勤数",
  merchant_monthly_absent: "商户月度缺勤数",
};

const RECORD_STATUS_TAG: Record<string, { color: "orange" | "red" | "green" | "blue"; text: string }> = {
  pending: { color: "orange", text: "待处理" },
  triggered: { color: "red", text: "已触发" },
  resolved: { color: "green", text: "已恢复" },
  notified: { color: "blue", text: "已通知" },
};

interface FormValues {
  name: string;
  conditionType: string;
  threshold: number;
  enabled: boolean;
}

export default function AlertRules() {
  const isMobile = useIsMobile();

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormValues>({
    name: "",
    conditionType: "daily_absent_count",
    threshold: 3,
    enabled: true,
  });
  const [form] = Form.useForm<FormValues>();

  const loadRules = useCallback(async () => {
    try {
      setLoadingRules(true);
      const list = await fetchAlertRules();
      setRules(list);
    } catch (e) {
      Message.error((e as Error).message || "加载预警规则失败");
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const list = await fetchAlertRecords();
      setRecords(list);
    } catch (e) {
      Message.error((e as Error).message || "加载预警记录失败");
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadRecords();
  }, [loadRules, loadRecords]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      conditionType: "daily_absent_count",
      threshold: 3,
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      conditionType: rule.conditionType,
      threshold: rule.threshold,
      enabled: rule.enabled,
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
      setSubmitting(true);
      if (editingId) {
        await updateAlertRule(editingId, formData);
        Message.success("规则更新成功");
      } else {
        await createAlertRule(formData);
        Message.success("规则新增成功");
      }
      setModalOpen(false);
      loadRules();
    } catch (e) {
      Message.error((e as Error).message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAlertRule(id);
      Message.success("删除成功");
      loadRules();
    } catch (e) {
      Message.error((e as Error).message || "删除失败");
    }
  };

  const handleToggleEnabled = async (rule: AlertRule, enabled: boolean) => {
    try {
      await updateAlertRule(rule.id, { enabled });
      Message.success(enabled ? "已启用" : "已停用");
      loadRules();
    } catch (e) {
      Message.error((e as Error).message || "操作失败");
    }
  };

  const ruleColumns = [
    {
      key: "name",
      dataIndex: "name",
      title: "规则名称",
      render: (_value: unknown, row: AlertRule) => (
        <span style={{ fontWeight: 600 }}>{row.name}</span>
      ),
    },
    {
      key: "conditionType",
      dataIndex: "conditionType",
      title: "条件类型",
      minWidth: 150,
      render: (_value: unknown, row: AlertRule) => (
        <Tag color="blue">{CONDITION_TAG[row.conditionType] ?? row.conditionType}</Tag>
      ),
    },
    {
      key: "threshold",
      dataIndex: "threshold",
      title: "阈值",
      minWidth: 80,
    },
    {
      key: "enabled",
      dataIndex: "enabled",
      title: "启用",
      minWidth: 70,
      render: (_value: unknown, row: AlertRule) => (
        <Switch
          checked={row.enabled}
          size="small"
          onChange={(v: boolean) => handleToggleEnabled(row, v)}
        />
      ),
    },
    {
      key: "createdAt",
      dataIndex: "createdAt",
      title: "创建时间",
      minWidth: 150,
      render: (_value: unknown, row: AlertRule) =>
        row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm") : "-",
    },
    {
      key: "action",
      title: "操作",
      width: 180,
      fixed: "right" as const,
      render: (_value: unknown, row: AlertRule) => (
        <div className="action-col">
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该规则？"
            onOk={() => handleDelete(row.id)}
          >
            <Button
              type="text"
              status="danger"
              size="small"
              icon={<IconDelete />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const recordColumns = [
    {
      key: "ruleName",
      dataIndex: "ruleName",
      title: "规则名称",
      minWidth: 150,
      render: (_value: unknown, row: AlertRecord) => row.ruleName || "-",
    },
    { key: "content", dataIndex: "content", title: "预警内容", ellipsis: true },
    {
      key: "status",
      dataIndex: "status",
      title: "状态",
      minWidth: 90,
      render: (_value: unknown, row: AlertRecord) => {
        const tag = RECORD_STATUS_TAG[row.status] ?? { color: "gray" as const, text: row.status };
        return <Tag color={tag.color}>{tag.text}</Tag>;
      },
    },
    {
      key: "createdAt",
      dataIndex: "createdAt",
      title: "时间",
      minWidth: 150,
      render: (_value: unknown, row: AlertRecord) =>
        row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm") : "-",
    },
  ];

  return (
    <div className="page-root">
      <Card bordered>
        <div className="card-section-header">
          <span className="card-title-text">
            <IconNotification />
            预警规则
          </span>
          <div className="card-actions">
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={openAdd}
            >
              新增规则
            </Button>
          </div>
        </div>
        <div className="table-wrap">
          <Table
            data={rules}
            columns={ruleColumns}
            rowKey="id"
            loading={loadingRules}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
          />
        </div>
      </Card>

      <Card bordered>
        <div className="card-section-header">
          <span className="card-title-text">
            <IconHistory />
            预警记录
          </span>
        </div>
        <div className="table-wrap">
          <Table
            data={records}
            columns={recordColumns}
            rowKey="id"
            loading={loadingRecords}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
          />
        </div>
      </Card>

      <Modal
        title={editingId ? "编辑规则" : "新增规则"}
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
              label="规则名称"
              field="name"
              rules={[{ required: true, message: "请输入规则名称" }]}
            >
              <Input
                placeholder="如：单日缺勤预警"
                maxLength={30}
                value={formData.name}
                onChange={(val) => setFormData({ ...formData, name: val })}
              />
            </FormItem>
            <FormItem
              label="条件类型"
              field="conditionType"
              rules={[{ required: true, message: "请选择条件类型" }]}
            >
              <Select
                options={CONDITION_OPTIONS}
                value={formData.conditionType}
                onChange={(val) => setFormData({ ...formData, conditionType: val })}
              />
            </FormItem>
          </div>
          <div className="form-row">
            <FormItem
              label="阈值"
              field="threshold"
              rules={[{ required: true, message: "请输入阈值" }]}
              extra="达到该值将触发预警"
            >
              <InputNumber
                min={1}
                max={9999}
                value={formData.threshold}
                onChange={(val) => setFormData({ ...formData, threshold: val as number })}
                style={{ width: "100%" }}
              />
            </FormItem>
            <FormItem label="启用" field="enabled">
              <Switch
                checked={formData.enabled}
                onChange={(v: boolean) => setFormData({ ...formData, enabled: v })}
              />
            </FormItem>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
