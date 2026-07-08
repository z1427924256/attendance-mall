import { useState, useMemo } from "react";
import { Card, Table, Button, Tag, DatePicker, Select, Input, Modal, Form, Popconfirm, Tooltip, Message } from "@arco-design/web-react";
import {
  IconCheckCircle,
  IconCloseCircle,
  IconEdit,
  IconClockCircle,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";

const FormItem = Form.Item;
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAdminStore } from "@/store/useAdminStore";
import type { AttendanceRecord } from "@/store/useAdminStore";

const STATUS_TAG: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  signedIn: { color: "green", text: "已到岗", icon: <IconCheckCircle /> },
  absent: { color: "red", text: "缺勤", icon: <IconCloseCircle /> },
  unsigned: { color: "orange", text: "未签到", icon: <IconEdit /> },
};

export default function AttendanceManage() {
  const isMobile = useIsMobile();
  const { merchants, records, setRecordStatus, addRemark, batchSign } =
    useAdminStore();

  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().format("YYYY-MM-DD"),
    dayjs().format("YYYY-MM-DD"),
  ]);
  const [merchantId, setMerchantId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [floorFilter, setFloorFilter] = useState<string>("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [remarkModal, setRemarkModal] = useState<{
    open: boolean;
    recordId: string;
    value: string;
  }>({ open: false, recordId: "", value: "" });

  const merchantMap = useMemo(() => {
    const m: Record<string, (typeof merchants)[number]> = {};
    merchants.forEach((it) => (m[it.id] = it));
    return m;
  }, [merchants]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        const d = dayjs(r.date);
        if (
          dateRange &&
          (d.isBefore(dayjs(dateRange[0]), "day") ||
            d.isAfter(dayjs(dateRange[1]), "day"))
        )
          return false;
        if (merchantId && r.merchantId !== merchantId) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (floorFilter && merchantMap[r.merchantId]?.floor !== floorFilter)
          return false;
        return true;
      })
      .sort((a, b) =>
        a.date === b.date
          ? (merchantMap[a.merchantId]?.name ?? "").localeCompare(
              merchantMap[b.merchantId]?.name ?? ""
            )
          : a.date < b.date
          ? 1
          : -1
      );
  }, [records, dateRange, merchantId, statusFilter, floorFilter, merchantMap]);

  const handleQuickSet = (
    r: AttendanceRecord,
    status: AttendanceRecord["status"]
  ) => {
    setRecordStatus(r.id, status, "管理员");
    Message.success(`${merchantMap[r.merchantId]?.name} 已标记为${
      STATUS_TAG[status].text
    }`);
  };

  const handleBatchSign = () => {
    if (selectedRowKeys.length === 0) {
      Message.warning("请先选择记录");
      return;
    }
    batchSign(selectedRowKeys, "管理员");
    Message.success(`已批量补签 ${selectedRowKeys.length} 条记录`);
    setSelectedRowKeys([]);
  };

  const openRemark = (r: AttendanceRecord) => {
    setRemarkModal({ open: true, recordId: r.id, value: r.remark ?? "" });
  };

  const handleSaveRemark = () => {
    addRemark(remarkModal.recordId, remarkModal.value);
    setRemarkModal({ ...remarkModal, open: false });
    Message.success("备注已保存");
  };

  const columns = [
    {
      title: "日期",
      dataIndex: "date",
      key: "date",
      minWidth: 100,
      render: (_value: unknown, row: AttendanceRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.date.slice(5)}</div>
          <span className="text-secondary" style={{ fontSize: 12 }}>
            {dayjs(row.date).format("dddd")}
          </span>
        </div>
      ),
    },
    {
      title: "商户",
      dataIndex: "merchant",
      key: "merchant",
      render: (_value: unknown, row: AttendanceRecord) => {
        const m = merchantMap[row.merchantId];
        return m ? (
          <div>
            <div>
              {m.emoji} {m.name}
            </div>
            <span className="text-secondary" style={{ fontSize: 12 }}>
              {m.location}
            </span>
          </div>
        ) : (
          <span className="text-secondary">已删除</span>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      minWidth: 80,
      render: (_value: unknown, row: AttendanceRecord) => {
        const s = STATUS_TAG[row.status];
        return (
          <Tag color={s.color} bordered={false}>
            {s.icon} {s.text}
          </Tag>
        );
      },
    },
    {
      title: "签到时间",
      dataIndex: "signedAt",
      key: "signedAt",
      minWidth: 80,
      render: (_value: unknown, row: AttendanceRecord) =>
        row.signedAt ?? <span className="text-secondary">-</span>,
    },
    {
      title: "操作人",
      dataIndex: "operator",
      key: "operator",
      minWidth: 70,
      render: (_value: unknown, row: AttendanceRecord) =>
        row.operator ? (
          <Tag color="blue" bordered={false}>{row.operator}</Tag>
        ) : (
          <span className="text-secondary">系统</span>
        ),
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      minWidth: 120,
      ellipsis: true,
      render: (_value: unknown, row: AttendanceRecord) =>
        row.remark ? (
          <Tooltip content={row.remark}>
            <span style={{ fontSize: 12 }}>{row.remark}</span>
          </Tooltip>
        ) : (
          <span className="text-secondary" style={{ fontSize: 12 }}>
            -
          </span>
        ),
    },
    {
      title: "操作",
      key: "action",
      width: 240,
      fixed: "right" as const,
      render: (_value: unknown, row: AttendanceRecord) => (
        <div className="action-col">
          {row.status !== "signedIn" && (
            <Button
              type="text"
              size="small"
              icon={<IconCheckCircle />}
              onClick={() => handleQuickSet(row, "signedIn")}
              style={{ color: "rgb(var(--primary-6))", padding: 0 }}
            >
              补签
            </Button>
          )}
          {row.status !== "absent" && (
            <Button
              type="text"
              size="small"
              status="danger"
              icon={<IconCloseCircle />}
              onClick={() => handleQuickSet(row, "absent")}
              style={{ padding: 0 }}
            >
              缺勤
            </Button>
          )}
          {row.status !== "unsigned" && (
            <Popconfirm
              title="确认重置为未签到？"
              onOk={() => handleQuickSet(row, "unsigned")}
            >
              <Button
                type="text"
                size="small"
                icon={<IconClockCircle />}
                style={{ padding: 0 }}
              >
                重置
              </Button>
            </Popconfirm>
          )}
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => openRemark(row)}
            style={{ padding: 0 }}
          >
            备注
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <div className="card-header-bar">
          <span className="card-title-text">考勤记录管理</span>
        </div>
      }
      bordered
    >
      <div className="filter-bar">
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dateString: string[]) => {
            if (dateString && dateString[0] && dateString[1]) {
              setDateRange([dateString[0], dateString[1]]);
            }
          }}
          allowClear={false}
          format="YYYY-MM-DD"
        />
        <Select
          placeholder="选择商户"
          value={merchantId || undefined}
          onChange={(v: string) => setMerchantId(v ?? "")}
          allowClear
          options={merchants.map((m) => ({
            label: `${m.emoji} ${m.name} (${m.location})`,
            value: m.id,
          }))}
        />
        <Select
          placeholder="状态"
          value={statusFilter || undefined}
          onChange={(v: string) => setStatusFilter(v ?? "")}
          allowClear
          options={[
            { label: "已到岗", value: "signedIn" },
            { label: "缺勤", value: "absent" },
            { label: "未签到", value: "unsigned" },
          ]}
        />
        <Select
          placeholder="楼层"
          value={floorFilter || undefined}
          onChange={(v: string) => setFloorFilter(v ?? "")}
          allowClear
          options={["1F", "2F", "3F", "4F"].map((f) => ({
            label: f,
            value: f,
          }))}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
        <span className="text-secondary" style={{ fontSize: 12 }}>
          共 {filtered.length} 条
        </span>
        <Button
          type="primary"
          onClick={handleBatchSign}
          disabled={selectedRowKeys.length === 0}
        >
          批量补签（{selectedRowKeys.length}）
        </Button>
      </div>

      <div className="table-wrap">
        <Table
          data={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          border={{ wrapper: true, cell: true }}
          stripe
          hover
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            checkboxProps: (record: AttendanceRecord) => ({
              disabled: record.status === "signedIn",
            }),
          }}
        />
      </div>

      <Modal
        title="编辑备注"
        visible={remarkModal.open}
        onOk={handleSaveRemark}
        onCancel={() => setRemarkModal({ ...remarkModal, open: false })}
        okText="保存"
        cancelText="取消"
        unmountOnExit
        maskClosable
        style={{ width: isMobile ? "100%" : 600 }}
      >
        <Form layout="vertical">
          <FormItem label="备注内容">
            <Input
              value={remarkModal.value}
              onChange={(value: string) =>
                setRemarkModal({ ...remarkModal, value })
              }
              placeholder="如：请假、设备故障、未到岗原因等"
              maxLength={200}
            />
          </FormItem>
        </Form>
      </Modal>
    </Card>
  );
}
