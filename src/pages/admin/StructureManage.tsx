import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Popconfirm,
  Tabs,
  Message,
} from "@arco-design/web-react";
import { IconPlus, IconEdit, IconDelete } from "@arco-design/web-react/icon";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  fetchFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  fetchAreas,
  createArea,
  updateArea,
  deleteArea,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type StructureItem,
} from "@/api/client";

const FormItem = Form.Item;

/* 内联 SVG 图标 */
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}><path d={d} /></svg>
);
const AppstoreIcon = (p: { style?: React.CSSProperties }) => <Ic d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" {...p} />;

type TabKey = "floors" | "areas" | "categories";

interface FormValues {
  name: string;
  sortOrder: number;
  status: string;
  floorId?: string;
}

const STATUS_COLOR: Record<string, { color: string; text: string }> = {
  active: { color: "green", text: "启用" },
  inactive: { color: "gray", text: "停用" },
};

export default function StructureManage() {
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<TabKey>("floors");
  const [floors, setFloors] = useState<StructureItem[]>([]);
  const [areas, setAreas] = useState<StructureItem[]>([]);
  const [categories, setCategories] = useState<StructureItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormValues>({
    name: "",
    sortOrder: 0,
    status: "active",
    floorId: undefined,
  });
  const [form] = Form.useForm<FormValues>();

  const loadFloors = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchFloors();
      setFloors(list);
    } catch (e) {
      Message.error((e as Error).message || "加载楼层失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAreas = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchAreas();
      setAreas(list);
    } catch (e) {
      Message.error((e as Error).message || "加载区域失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchCategories();
      setCategories(list);
    } catch (e) {
      Message.error((e as Error).message || "加载业态失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAll = useCallback(() => {
    loadFloors();
    loadAreas();
    loadCategories();
  }, [loadFloors, loadAreas, loadCategories]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const floorOptions = floors
    .filter((f) => f.status === "active")
    .map((f) => ({ label: f.name, value: f.id }));

  const floorNameMap = floors.reduce<Record<string, string>>((acc, f) => {
    acc[f.id] = f.name;
    return acc;
  }, {});

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      sortOrder: 0,
      status: "active",
      floorId: floorOptions[0]?.value,
    });
    setModalOpen(true);
  };

  const openEdit = (item: StructureItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      sortOrder: item.sortOrder,
      status: item.status,
      floorId: item.floorId,
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
      const values = formData;
      setSubmitting(true);
      if (activeTab === "floors") {
        if (editingId) {
          await updateFloor(editingId, values);
          Message.success("楼层更新成功");
        } else {
          await createFloor(values);
          Message.success("楼层新增成功");
        }
        loadFloors();
        loadAreas();
      } else if (activeTab === "areas") {
        if (editingId) {
          await updateArea(editingId, values);
          Message.success("区域更新成功");
        } else {
          await createArea(values);
          Message.success("区域新增成功");
        }
        loadAreas();
      } else {
        if (editingId) {
          await updateCategory(editingId, values);
          Message.success("业态更新成功");
        } else {
          await createCategory(values);
          Message.success("业态新增成功");
        }
        loadCategories();
      }
      setModalOpen(false);
    } catch (e) {
      Message.error((e as Error).message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === "floors") {
        await deleteFloor(id);
        loadFloors();
        loadAreas();
      } else if (activeTab === "areas") {
        await deleteArea(id);
        loadAreas();
      } else {
        await deleteCategory(id);
        loadCategories();
      }
      Message.success("删除成功");
    } catch (e) {
      Message.error((e as Error).message || "删除失败");
    }
  };

  const buildColumns = () => {
    const cols: {
      key: string;
      dataIndex?: string;
      title: string;
      width?: number;
      fixed?: "right";
      sorter?: (a: StructureItem, b: StructureItem) => number;
      render?: (value: unknown, row: StructureItem) => ReactNode;
    }[] = [
      {
        key: "name",
        dataIndex: "name",
        title: "名称",
        render: (_value: unknown, row: StructureItem) => (
          <span style={{ fontWeight: 600 }}>{row.name}</span>
        ),
      },
      {
        key: "sortOrder",
        dataIndex: "sortOrder",
        title: "排序",
        minWidth: 80,
        sorter: (a: StructureItem, b: StructureItem) => a.sortOrder - b.sortOrder,
      },
    ];

    if (activeTab === "areas") {
      cols.push({
        key: "floorId",
        dataIndex: "floorId",
        title: "所属楼层",
        minWidth: 120,
        render: (_value: unknown, row: StructureItem) => (
          <span>{row.floorId ? floorNameMap[row.floorId] ?? "-" : "-"}</span>
        ),
      });
    }

    cols.push(
      {
        key: "status",
        dataIndex: "status",
        title: "状态",
        minWidth: 80,
        render: (_value: unknown, row: StructureItem) => {
          const s = STATUS_COLOR[row.status] ?? { color: "gray", text: row.status };
          return <Tag color={s.color}>{s.text}</Tag>;
        },
      },
      {
        key: "createdAt",
        dataIndex: "createdAt",
        title: "创建时间",
        minWidth: 150,
        render: (_value: unknown, row: StructureItem) => (
          <span>{row.createdAt ? row.createdAt.slice(0, 19).replace("T", " ") : "-"}</span>
        ),
      },
      {
        key: "action",
        title: "操作",
        width: 180,
        fixed: "right" as const,
        render: (_value: unknown, row: StructureItem) => (
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
              title="确认删除？"
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
      }
    );

    return cols;
  };

  const currentList =
    activeTab === "floors" ? floors : activeTab === "areas" ? areas : categories;

  const tabTitle = (key: TabKey) =>
    key === "floors" ? "楼层管理" : key === "areas" ? "区域管理" : "业态分类";

  const tabLabelShort = tabTitle(activeTab).replace("管理", "").replace("分类", "");

  return (
    <Card
      bordered
    >
      <div className="card-section-header">
        <span className="card-title-text">
          <AppstoreIcon />
          楼层 / 区域 / 业态管理
        </span>
        <div className="card-actions">
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={openAdd}
          >
            新增{tabLabelShort}
          </Button>
        </div>
      </div>
      <Tabs
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as TabKey)}
        style={{ marginBottom: 8 }}
      >
        <Tabs.TabPane key="floors" title="楼层管理" />
        <Tabs.TabPane key="areas" title="区域管理" />
        <Tabs.TabPane key="categories" title="业态分类" />
      </Tabs>

      <div className="table-wrap">
        <Table
          data={currentList}
          columns={buildColumns()}
          rowKey="id"
          loading={loading}
          size="small"
          border={{ wrapper: true, cell: true }}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
        />
      </div>

      <Modal
        title={`${editingId ? "编辑" : "新增"}${tabLabelShort}`}
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
              label="名称"
              field="name"
              rules={[{ required: true, message: "请输入名称" }]}
            >
              <Input
                placeholder="请输入名称"
                maxLength={30}
                value={formData.name}
                onChange={(val) => setFormData({ ...formData, name: val })}
              />
            </FormItem>

            {activeTab === "areas" && (
              <FormItem
                label="所属楼层"
                field="floorId"
                rules={[{ required: true, message: "请选择所属楼层" }]}
              >
                <Select
                  placeholder="请选择楼层"
                  options={floorOptions}
                  value={formData.floorId}
                  onChange={(val) => setFormData({ ...formData, floorId: val })}
                />
              </FormItem>
            )}
          </div>

          <div className="form-row">
            <FormItem
              label="排序值"
              field="sortOrder"
              rules={[{ required: true, message: "请输入排序值" }]}
              extra="数值越小越靠前"
            >
              <InputNumber
                min={0}
                max={9999}
                value={formData.sortOrder}
                onChange={(val) => setFormData({ ...formData, sortOrder: val as number })}
                style={{ width: "100%" }}
              />
            </FormItem>

            <FormItem
              label="状态"
              field="status"
              rules={[{ required: true, message: "请选择状态" }]}
            >
              <Select
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                options={[
                  { label: "启用", value: "active" },
                  { label: "停用", value: "inactive" },
                ]}
              />
            </FormItem>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
