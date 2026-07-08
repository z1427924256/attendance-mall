import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  DatePicker,
  Popconfirm,
  Message,
} from "@arco-design/web-react";
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconNotification,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchFloors,
  fetchCategories,
  type Announcement,
  type StructureItem,
} from "@/api/client";

const FormItem = Form.Item;

/* 内联 SVG 图标 */
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}><path d={d} /></svg>
);
const PushpinIcon = (p: { style?: React.CSSProperties }) => <Ic d="M16 9V4l1-1V2H7v1l1 1v5L6 12v2h5v7l1 1 1-1v-7h5v-2z" {...p} />;
const ExclamationIcon = (p: { style?: React.CSSProperties }) => <Ic d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" {...p} />;

const TYPE_OPTIONS = [
  { label: "全局公告", value: "global" },
  { label: "定向公告", value: "targeted" },
];

const TYPE_TAG: Record<string, { color: "blue" | "orange"; text: string }> = {
  global: { color: "blue", text: "全局" },
  targeted: { color: "orange", text: "定向" },
};

interface FormValues {
  title: string;
  content: string;
  type: string;
  scope: string[];
  pinned: boolean;
  forcePopup: boolean;
  expireAt: string;
}

export default function Announcements() {
  const isMobile = useIsMobile();

  const [list, setList] = useState<Announcement[]>([]);
  const [floors, setFloors] = useState<StructureItem[]>([]);
  const [categories, setCategories] = useState<StructureItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormValues>({
    title: "",
    content: "",
    type: "global",
    scope: [],
    pinned: false,
    forcePopup: false,
    expireAt: "",
  });
  const [form] = Form.useForm<FormValues>();

  const scopeOptions = useMemo(() => {
    const floorOpts = floors.map((f) => ({
      label: `楼层：${f.name}`,
      value: `floor:${f.id}`,
    }));
    const categoryOpts = categories.map((c) => ({
      label: `业态：${c.name}`,
      value: `category:${c.id}`,
    }));
    return [...floorOpts, ...categoryOpts];
  }, [floors, categories]);

  const scopeLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    floors.forEach((f) => (map[`floor:${f.id}`] = `楼层：${f.name}`));
    categories.forEach((c) => (map[`category:${c.id}`] = `业态：${c.name}`));
    return map;
  }, [floors, categories]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAnnouncements();
      setList(data);
    } catch (e) {
      Message.error((e as Error).message || "加载公告失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStructures = useCallback(async () => {
    try {
      const [f, c] = await Promise.all([fetchFloors(), fetchCategories()]);
      setFloors(f);
      setCategories(c);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    loadList();
    loadStructures();
  }, [loadList, loadStructures]);

  const normalizeScope = (scope: string | string[]): string[] => {
    if (!scope) return [];
    if (Array.isArray(scope)) return scope;
    try {
      const parsed = JSON.parse(scope);
      return Array.isArray(parsed) ? parsed : [scope];
    } catch {
      return scope.split(",").filter(Boolean);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      title: "",
      content: "",
      type: "global",
      scope: [],
      pinned: false,
      forcePopup: false,
      expireAt: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      scope: normalizeScope(item.scope),
      pinned: item.pinned,
      forcePopup: item.forcePopup,
      expireAt: item.expireAt || "",
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
      const payload: Partial<Announcement> = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        scope: formData.type === "targeted" ? formData.scope : [],
        pinned: formData.pinned,
        forcePopup: formData.forcePopup,
        expireAt: formData.expireAt,
      };
      if (editingId) {
        await updateAnnouncement(editingId, payload);
        Message.success("公告更新成功");
      } else {
        await createAnnouncement(payload);
        Message.success("公告发布成功");
      }
      setModalOpen(false);
      loadList();
    } catch (e) {
      Message.error((e as Error).message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      Message.success("删除成功");
      loadList();
    } catch (e) {
      Message.error((e as Error).message || "删除失败");
    }
  };

  const renderScope = (scope: string | string[]) => {
    const arr = normalizeScope(scope);
    if (arr.length === 0) return <span style={{ color: "#999" }}>-</span>;
    return (
      <div className="tag-list">
        {arr.map((s) => (
          <Tag key={s}>{scopeLabelMap[s] ?? s}</Tag>
        ))}
      </div>
    );
  };

  const columns = [
    {
      key: "title",
      dataIndex: "title",
      title: "标题",
      render: (_value: unknown, row: Announcement) => (
        <div className="tag-list">
          <span style={{ fontWeight: 600 }}>{row.title}</span>
          {row.pinned && (
            <Tag color="orange" icon={<PushpinIcon style={{ width: 12, height: 12 }} />}>
              置顶
            </Tag>
          )}
          {row.forcePopup && (
            <Tag color="red" icon={<ExclamationIcon style={{ width: 12, height: 12 }} />}>
              强制弹窗
            </Tag>
          )}
        </div>
      ),
    },
    {
      key: "content",
      dataIndex: "content",
      title: "内容",
      ellipsis: true,
    },
    {
      key: "type",
      dataIndex: "type",
      title: "类型",
      minWidth: 70,
      render: (_value: unknown, row: Announcement) => {
        const tag = TYPE_TAG[row.type] ?? { color: "gray" as const, text: row.type };
        return <Tag color={tag.color}>{tag.text}</Tag>;
      },
    },
    {
      key: "scope",
      dataIndex: "scope",
      title: "推送范围",
      minWidth: 150,
      render: (_value: unknown, row: Announcement) => renderScope(row.scope),
    },
    {
      key: "expireAt",
      dataIndex: "expireAt",
      title: "到期时间",
      minWidth: 110,
      render: (_value: unknown, row: Announcement) =>
        row.expireAt ? dayjs(row.expireAt).format("YYYY-MM-DD") : "长期",
    },
    {
      key: "createdAt",
      dataIndex: "createdAt",
      title: "创建时间",
      minWidth: 150,
      render: (_value: unknown, row: Announcement) =>
        row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm") : "-",
    },
    {
      key: "action",
      title: "操作",
      width: 180,
      fixed: "right" as const,
      render: (_value: unknown, row: Announcement) => (
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
            title="确认删除该公告？"
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

  return (
    <div className="page-root">
      <Card bordered>
        <div className="card-section-header">
          <span className="card-title-text">
            <IconNotification />
            公告广播管理
          </span>
          <div className="card-actions">
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={openAdd}
            >
              发布公告
            </Button>
          </div>
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

        <Modal
          title={editingId ? "编辑公告" : "发布公告"}
          visible={modalOpen}
          onOk={handleSubmit}
          onCancel={() => setModalOpen(false)}
          confirmLoading={submitting}
          style={{ width: isMobile ? "100%" : 600 }}
          unmountOnExit
        >
          <Form form={form} layout="vertical">
            <FormItem
              label="公告标题"
              field="title"
              rules={[{ required: true, message: "请输入标题" }]}
            >
              <Input
                placeholder="请输入公告标题"
                maxLength={50}
                value={formData.title}
                onChange={(val) => setFormData({ ...formData, title: val })}
              />
            </FormItem>
            <FormItem
              label="公告内容"
              field="content"
              rules={[{ required: true, message: "请输入内容" }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 4 }}
                placeholder="请输入公告内容"
                maxLength={1000}
                showWordLimit
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
              />
            </FormItem>
            <div className="form-row">
              <FormItem
                label="公告类型"
                field="type"
                rules={[{ required: true, message: "请选择类型" }]}
              >
                <Select
                  options={TYPE_OPTIONS}
                  value={formData.type}
                  onChange={(val) => {
                    const v = val;
                    setFormData({
                      ...formData,
                      type: v,
                      scope: v === "global" ? [] : formData.scope,
                    });
                  }}
                />
              </FormItem>
              {formData.type === "targeted" && (
                <FormItem
                  label="推送范围"
                  field="scope"
                  rules={[{ required: true, message: "请选择推送范围", type: "array" }]}
                  extra="可选择楼层或业态进行定向推送"
                >
                  <Select
                    mode="multiple"
                    placeholder="请选择楼层或业态"
                    options={scopeOptions}
                    value={formData.scope}
                    onChange={(val) => setFormData({ ...formData, scope: val as string[] })}
                    style={{ width: "100%" }}
                  />
                </FormItem>
              )}
            </div>
            <div className="form-row">
              <FormItem label="置顶" field="pinned">
                <Switch
                  checked={formData.pinned}
                  onChange={(v: boolean) => setFormData({ ...formData, pinned: v })}
                />
              </FormItem>
              <FormItem label="强制弹窗" field="forcePopup">
                <Switch
                  checked={formData.forcePopup}
                  onChange={(v: boolean) => setFormData({ ...formData, forcePopup: v })}
                />
              </FormItem>
              <FormItem label="到期时间" field="expireAt">
                <DatePicker
                  value={formData.expireAt ? dayjs(formData.expireAt) : undefined}
                  onChange={(_dateString, value) => setFormData({ ...formData, expireAt: value ? value.format("YYYY-MM-DD") : "" })}
                  format="YYYY-MM-DD"
                  placeholder="留空表示长期"
                  allowClear
                  style={{ width: "100%" }}
                />
              </FormItem>
            </div>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
