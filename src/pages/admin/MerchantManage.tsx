import { useState, useMemo } from "react";
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
  Avatar,
  Popconfirm,
  Message,
} from "@arco-design/web-react";
import { IconPlus, IconEdit, IconDelete, IconSearch, IconFile } from "@arco-design/web-react/icon";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAdminStore } from "@/store/useAdminStore";
import type { Merchant } from "@/data/mockData";

const FormItem = Form.Item;

const FLOORS = ["1F", "2F", "3F", "4F"];
const CATEGORIES = [
  "茶饮",
  "咖啡",
  "快餐",
  "数码",
  "服装",
  "运动",
  "美妆个护",
  "生活百货",
  "潮玩",
  "火锅",
  "中餐",
  "西餐",
  "日料",
  "甜品",
];

const EMOJI_OPTIONS = [
  "🍵", "☕", "🍔", "🍗", "📱", "📲", "🍏", "👕", "👗", "🧥",
  "👔", "👟", "💄", "💊", "🛍️", "🎁", "🧩", "🍲", "🥟", "🍜",
  "🍕", "🥘", "🍰", "🍦", "🐟", "🥬", "🍚",
];

interface FormValues {
  name: string;
  floor: string;
  location: string;
  category: string;
  emoji: string;
  manager: string;
  contact: string;
  area: number;
  openHours: string;
  verified: boolean;
  avatar?: string;
}

const defaultFormData: FormValues = {
  name: "",
  floor: "1F",
  location: "",
  category: "茶饮",
  emoji: "🍵",
  manager: "",
  contact: "",
  area: 100,
  openHours: "10:00-22:00",
  verified: false,
  avatar: "",
};

export default function MerchantManage() {
  const isMobile = useIsMobile();
  const { merchants, addMerchant, updateMerchant, removeMerchant } =
    useAdminStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormValues>({ ...defaultFormData });
  const [keyword, setKeyword] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const filtered = useMemo(() => {
    return merchants.filter((m) => {
      if (keyword && !m.name.includes(keyword)) return false;
      if (floorFilter && m.floor !== floorFilter) return false;
      if (categoryFilter && m.category !== categoryFilter) return false;
      return true;
    });
  }, [merchants, keyword, floorFilter, categoryFilter]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData });
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (m: Merchant) => {
    setEditingId(m.id);
    setFormData({
      name: m.name,
      floor: m.floor,
      location: m.location,
      category: m.category,
      emoji: m.emoji,
      manager: m.manager,
      contact: m.contact,
      area: m.area,
      openHours: m.openHours,
      verified: m.verified,
      avatar: m.avatar,
    });
    form.setFieldsValue({
      name: m.name,
      floor: m.floor,
      location: m.location,
      category: m.category,
      emoji: m.emoji,
      manager: m.manager,
      contact: m.contact,
      area: m.area,
      openHours: m.openHours,
      verified: m.verified,
      avatar: m.avatar,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await form.validate();
      setSubmitting(true);
      if (editingId) {
        updateMerchant(editingId, formData);
        Message.success("修改成功");
      } else {
        addMerchant({ ...formData, signedIn: false });
        Message.success("新增成功");
      }
      setModalOpen(false);
    } catch (e) {
      // 校验失败
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    removeMerchant(id);
    Message.success("删除成功");
  };

  const columns = [
    {
      title: "商户",
      dataIndex: "name",
      key: "name",
      render: (_value: string, row: Merchant) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            size={36}
            style={{ background: row.avatar ? undefined : "rgb(var(--primary-6))" }}
          >
            {row.avatar ? <img src={row.avatar} alt="" /> : row.name.slice(0, 2)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {row.emoji} {row.name}
              {row.verified && (
                <Tag color="green" size="small" style={{ marginLeft: 6 }}>
                  认证
                </Tag>
              )}
            </div>
            <span style={{ color: "#999", fontSize: 12 }}>
              {row.location}
            </span>
          </div>
        </div>
      ),
    },
    { title: "楼层", dataIndex: "floor", key: "floor", minWidth: 70 },
    { title: "业态", dataIndex: "category", key: "category", minWidth: 80 },
    { title: "负责人", dataIndex: "manager", key: "manager", minWidth: 80 },
    { title: "联系电话", dataIndex: "contact", key: "contact", minWidth: 120 },
    {
      title: "面积(㎡)",
      dataIndex: "area",
      key: "area",
      minWidth: 70,
      sorter: (a: Merchant, b: Merchant) => a.area - b.area,
    },
    { title: "营业时间", dataIndex: "openHours", key: "openHours", minWidth: 120 },
    {
      title: "操作",
      key: "action",
      width: 200,
      fixed: "right" as const,
      render: (_value: unknown, row: Merchant) => (
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
            title="确认删除该商户？删除后将同时清除其考勤记录"
            onOk={() => handleDelete(row.id)}
          >
            <Button type="text" status="danger" size="small" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Card
      bordered
    >
      <div className="card-section-header">
        <span className="card-title-text">商户列表（共 {merchants.length} 户）</span>
        <div className="card-actions">
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={openAdd}
          >
            新增商户
          </Button>
        </div>
      </div>
      <div className="filter-bar">
        <Input
          placeholder="搜索商户名称"
          prefix={<IconSearch />}
          value={keyword}
          onChange={setKeyword}
          allowClear
        />
        <Select
          placeholder="楼层"
          value={floorFilter || undefined}
          onChange={(val) => setFloorFilter(String(val ?? ""))}
          allowClear
        >
          {FLOORS.map((f) => (
            <Select.Option key={f} value={f}>
              {f}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="业态"
          value={categoryFilter || undefined}
          onChange={(val) => setCategoryFilter(String(val ?? ""))}
          allowClear
        >
          {CATEGORIES.map((c) => (
            <Select.Option key={c} value={c}>
              {c}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div className="table-wrap">
        <Table
          data={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          border={{ wrapper: true, cell: true }}
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
          scroll={{ x: "max-content" }}
        />
      </div>

      <Modal
        title={editingId ? "编辑商户" : "新增商户"}
        visible={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        style={{ width: isMobile ? "100%" : 600 }}
        unmountOnExit
      >
        <Form form={form} layout="vertical" initialValues={defaultFormData}>
          <FormItem
            label="商户名称"
            field="name"
            rules={[{ required: true, message: "请输入商户名称" }]}
          >
            <Input
              placeholder="如：喜茶"
              maxLength={20}
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
            />
          </FormItem>
          <div className="form-row">
            <FormItem
              label="楼层"
              field="floor"
              rules={[{ required: true, message: "请选择楼层" }]}
            >
              <Select
                value={formData.floor}
                onChange={(val) => setFormData({ ...formData, floor: val })}
              >
                {FLOORS.map((f) => (
                  <Select.Option key={f} value={f}>
                    {f}
                  </Select.Option>
                ))}
              </Select>
            </FormItem>
            <FormItem
              label="铺位号"
              field="location"
              rules={[{ required: true, message: "请输入铺位号" }]}
            >
              <Input
                placeholder="如：1F-101"
                value={formData.location}
                onChange={(val) => setFormData({ ...formData, location: val })}
              />
            </FormItem>
            <FormItem
              label="业态"
              field="category"
              rules={[{ required: true, message: "请选择业态" }]}
            >
              <Select
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
              >
                {CATEGORIES.map((c) => (
                  <Select.Option key={c} value={c}>
                    {c}
                  </Select.Option>
                ))}
              </Select>
            </FormItem>
            <FormItem label="图标" field="emoji">
              <Select
                value={formData.emoji}
                onChange={(val) => setFormData({ ...formData, emoji: val })}
              >
                {EMOJI_OPTIONS.map((e) => (
                  <Select.Option key={e} value={e}>
                    {e}
                  </Select.Option>
                ))}
              </Select>
            </FormItem>
          </div>
          <div className="form-row">
            <FormItem
              label="负责人"
              field="manager"
              rules={[{ required: true, message: "请输入负责人" }]}
            >
              <Input
                value={formData.manager}
                onChange={(val) => setFormData({ ...formData, manager: val })}
              />
            </FormItem>
            <FormItem
              label="联系电话"
              field="contact"
              rules={[{ required: true, message: "请输入联系电话" }]}
            >
              <Input
                placeholder="138-xxxx-xxxx"
                value={formData.contact}
                onChange={(val) => setFormData({ ...formData, contact: val })}
              />
            </FormItem>
            <FormItem label="面积(㎡)" field="area">
              <InputNumber
                min={0}
                value={formData.area}
                onChange={(val) => setFormData({ ...formData, area: Number(val) })}
                style={{ width: "100%" }}
              />
            </FormItem>
          </div>
          <div className="form-row" style={{ alignItems: "flex-end" }}>
            <FormItem
              label="营业时间"
              field="openHours"
              rules={[{ required: true, message: "请输入营业时间" }]}
            >
              <Input
                placeholder="如：10:00-22:00"
                value={formData.openHours}
                onChange={(val) => setFormData({ ...formData, openHours: val })}
              />
            </FormItem>
            <FormItem label="已认证" field="verified" style={{ marginBottom: 0 }}>
              <Switch
                checked={formData.verified}
                onChange={(val) => setFormData({ ...formData, verified: val })}
              />
            </FormItem>
          </div>
          <FormItem label="头像（URL，可空）" field="avatar">
            <Input
              placeholder="https://..."
              value={formData.avatar}
              onChange={(val) => setFormData({ ...formData, avatar: val })}
            />
          </FormItem>
        </Form>
      </Modal>
    </Card>
  );
}
