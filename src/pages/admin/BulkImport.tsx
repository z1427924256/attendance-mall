import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Upload,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Statistic,
  Message,
} from "@arco-design/web-react";
import {
  IconDownload,
  IconUpload,
  IconFile,
  IconEdit,
  IconDelete,
  IconClockCircle,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";

const FormItem = Form.Item;
import {
  bulkImportMerchants,
  batchUpdateMerchants,
  fetchImportLogs,
  type ImportLog,
  type ImportResult,
} from "@/api/client";
import { useAdminStore } from "@/store/useAdminStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { exportCsv } from "@/utils/exportCsv";
import type { Merchant } from "@/data/mockData";

const FLOORS = ["1F", "2F", "3F", "4F"];

// 模板表头 → 字段名映射
const HEADER_MAP: Record<string, string> = {
  商户名称: "name",
  楼层: "floor",
  铺位号: "location",
  业态: "category",
  负责人: "manager",
  联系电话: "contact",
  面积: "area",
  营业时间: "openHours",
};

const TEMPLATE_HEADERS = [
  "商户名称",
  "楼层",
  "铺位号",
  "业态",
  "负责人",
  "联系电话",
  "面积",
  "营业时间",
];

// 基础 CSV 解析（支持引号包裹、转义双引号、逗号、换行）
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, ""); // 去除 BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && src[i + 1] === "\n") i++;
        current.push(field);
        field = "";
        if (current.some((c) => c.trim() !== "")) {
          rows.push(current);
        }
        current = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || current.length > 0) {
    current.push(field);
    if (current.some((c) => c.trim() !== "")) {
      rows.push(current);
    }
  }
  return rows;
}

interface BatchFormData {
  floor?: string;
  category?: string;
}

export default function BulkImport() {
  const isMobile = useIsMobile();
  const { merchants, syncFromApi } = useAdminStore();
  const [form] = Form.useForm<BatchFormData>();

  const [importing, setImporting] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<ImportResult | null>(null);
  const [batchFormData, setBatchFormData] = useState<BatchFormData>({});

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const logs = await fetchImportLogs();
      setImportLogs(logs);
    } catch (e) {
      Message.error("导入历史加载失败：" + (e as Error).message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDownloadTemplate = () => {
    exportCsv(
      [
        {
          商户名称: "示例商户",
          楼层: "1F",
          铺位号: "1F-101",
          业态: "茶饮",
          负责人: "张三",
          联系电话: "138-0000-0001",
          面积: 80,
          营业时间: "10:00-22:00",
        },
      ],
      "商户导入模板"
    );
    Message.success("模板已下载");
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || "");
        const rows = parseCsv(text);
        if (rows.length < 2) {
          Message.error("CSV 文件内容为空或缺少数据行");
          return;
        }
        const headers = rows[0].map((h) => h.trim());
        const knownHeaders = headers.filter((h) => HEADER_MAP[h]);
        if (knownHeaders.length === 0) {
          Message.error(
            `未识别到有效表头，请使用模板。需包含：${TEMPLATE_HEADERS.join("、")}`
          );
          return;
        }
        const dataRows = rows.slice(1);
        const mapped: Record<string, unknown>[] = dataRows.map((row) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, idx) => {
            const key = HEADER_MAP[h];
            if (!key) return;
            let val: unknown = (row[idx] ?? "").trim();
            if (key === "area") {
              const n = Number(val);
              val = isNaN(n) ? 0 : n;
            }
            obj[key] = val;
          });
          return obj;
        });

        setImporting(true);
        try {
          const res = await bulkImportMerchants(mapped);
          if (res.success && res.failCount === 0) {
            Message.success(`导入完成：成功 ${res.successCount} 条`);
          } else {
            Message.warning(
              `导入完成：成功 ${res.successCount} 条，失败 ${res.failCount} 条`
            );
          }
          setResultModal(res);
          await syncFromApi();
          await loadLogs();
        } catch (e) {
          Message.error("导入失败：" + (e as Error).message);
        } finally {
          setImporting(false);
        }
      } catch (e) {
        Message.error("CSV 解析失败：" + (e as Error).message);
      }
    };
    reader.onerror = () => Message.error("文件读取失败");
    reader.readAsText(file);
  };

  const handleBatchEdit = async () => {
    try {
      await form.validate();
    } catch {
      return; // 表单校验失败
    }

    const patch: Record<string, unknown> = {};
    if (batchFormData.floor) patch.floor = batchFormData.floor;
    if (batchFormData.category?.trim()) patch.category = batchFormData.category.trim();
    if (Object.keys(patch).length === 0) {
      Message.warning("请至少填写一项需要修改的字段");
      return;
    }
    setBatchSubmitting(true);
    const ids = selectedRowKeys.map(String);
    try {
      const res = await batchUpdateMerchants(ids, patch, "update");
      Message.success(`批量修改成功，共更新 ${res.count} 条`);
      setBatchEditOpen(false);
      setBatchFormData({});
      setSelectedRowKeys([]);
      await syncFromApi();
    } catch (e) {
      Message.error("批量修改失败：" + (e as Error).message);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = selectedRowKeys.map(String);
    setDeleteConfirmLoading(true);
    try {
      const res = await batchUpdateMerchants(ids, {}, "delete");
      Message.success(`批量删除成功，共删除 ${res.count} 条`);
      setSelectedRowKeys([]);
      await syncFromApi();
    } catch (e) {
      Message.error("批量删除失败：" + (e as Error).message);
    } finally {
      setDeleteConfirmLoading(false);
      setDeleteConfirmVisible(false);
    }
  };

  const merchantColumns = [
    { dataIndex: "name", key: "name", title: "商户名称", minWidth: 120, ellipsis: true, render: (_v: unknown, row: Merchant) => row.name },
    { dataIndex: "floor", key: "floor", title: "楼层", minWidth: 70, render: (_v: unknown, row: Merchant) => row.floor },
    { dataIndex: "location", key: "location", title: "铺位号", minWidth: 90, render: (_v: unknown, row: Merchant) => row.location },
    { dataIndex: "category", key: "category", title: "业态", minWidth: 90, render: (_v: unknown, row: Merchant) => row.category },
    { dataIndex: "manager", key: "manager", title: "负责人", minWidth: 80, render: (_v: unknown, row: Merchant) => row.manager },
    { dataIndex: "contact", key: "contact", title: "联系电话", minWidth: 120, render: (_v: unknown, row: Merchant) => row.contact },
  ];

  const merchantMobileColumns = merchantColumns.filter((c) =>
    ["name", "floor", "category"].includes(c.dataIndex as string)
  );

  const logColumns = [
    {
      dataIndex: "createdAt",
      key: "createdAt",
      title: "时间",
      minWidth: 150,
      render: (_v: unknown, row: ImportLog) =>
        row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      dataIndex: "type",
      key: "type",
      title: "类型",
      minWidth: 90,
      render: (_v: unknown, row: ImportLog) => (row.type ? <Tag color="arcoblue" bordered={false}>{row.type}</Tag> : "-"),
    },
    { dataIndex: "total", key: "total", title: "总数", minWidth: 60 },
    {
      dataIndex: "successCount",
      key: "successCount",
      title: "成功",
      minWidth: 60,
      render: (_v: unknown, row: ImportLog) => <span style={{ color: "rgb(var(--success-6))" }}>{row.successCount}</span>,
    },
    {
      dataIndex: "failCount",
      key: "failCount",
      title: "失败",
      minWidth: 60,
      render: (_v: unknown, row: ImportLog) => (row.failCount > 0 ? <span style={{ color: "rgb(var(--danger-6))" }}>{row.failCount}</span> : row.failCount),
    },
    { dataIndex: "operator", key: "operator", title: "操作人", minWidth: 80, ellipsis: true },
  ];

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <div className="page-root">
      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconDownload />下载导入模板</span>
          </div>
        }
        bordered
      >
        <div className="filter-bar">
          <Button
            type="primary"
            icon={<IconFile />}
            onClick={handleDownloadTemplate}
          >
            下载商户导入模板（CSV）
          </Button>
          <span style={{ color: "var(--color-text-3)" }}>
            模板字段：{TEMPLATE_HEADERS.join("、")}
          </span>
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconUpload />批量导入商户</span>
          </div>
        }
        bordered
      >
        <div className="upload-zone">
          <Upload
            drag
            accept=".csv"
            autoUpload={false}
            multiple={false}
            showUploadList={false}
            disabled={importing}
            beforeUpload={(file: File) => {
              handleImportFile(file);
              return false;
            }}
          >
            <div style={{ padding: "32px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <IconUpload style={{ fontSize: 48, color: "rgb(var(--primary-6))", marginBottom: 12 }} />
              <p style={{ margin: 0 }}>点击或拖拽 CSV 文件到此处导入</p>
              <p style={{ margin: "4px 0 0", color: "var(--color-text-3)", fontSize: 12 }}>
                仅支持 .csv 格式，表头需与模板一致，导入完成后将显示结果明细
              </p>
            </div>
          </Upload>
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconEdit />批量操作</span>
          </div>
        }
        bordered
      >
        <div className="filter-bar">
          <Button
              icon={<IconEdit />}
              disabled={!hasSelected}
              onClick={() => setBatchEditOpen(true)}
            >
              批量修改
            </Button>
            <Button
              type="primary"
              status="danger"
              icon={<IconDelete />}
              disabled={!hasSelected}
              onClick={() => setDeleteConfirmVisible(true)}
            >
              批量删除
            </Button>
          <span style={{ color: "var(--color-text-3)" }}>
            共 {merchants.length} 户，已选 {selectedRowKeys.length} 户
          </span>
        </div>
        <div className="table-wrap">
          <Table
            data={merchants}
            columns={isMobile ? merchantMobileColumns : merchantColumns}
            rowKey="id"
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
          />
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconClockCircle />导入历史</span>
          </div>
        }
        bordered
      >
        <div className="table-wrap">
          <Table
            data={importLogs}
            columns={logColumns}
            rowKey="id"
            loading={logsLoading}
            size="small"
            border={{ wrapper: true, cell: true }}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10, showTotal: true, sizeCanChange: false }}
            expandedRowRender={(record: ImportLog) => {
            const r = record;
            return r.failReasons && r.failReasons.length > 0 ? (
              <div>
                <span style={{ fontWeight: 600 }}>
                  失败原因（{r.failReasons.length} 条）：
                </span>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {r.failReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <span style={{ color: "var(--color-text-3)" }}>无失败记录</span>
            );
          }}
          />
        </div>
      </Card>

      <Modal
        title="批量修改"
        visible={batchEditOpen}
        onOk={handleBatchEdit}
        onCancel={() => {
          setBatchEditOpen(false);
          setBatchFormData({});
        }}
        okText="保存"
        cancelText="取消"
        confirmLoading={batchSubmitting}
        unmountOnExit
        style={{ width: isMobile ? "100%" : 600 }}
      >
        <span style={{ color: "var(--color-text-3)" }}>
          将对选中的 {selectedRowKeys.length} 个商户应用以下修改，留空表示不修改该字段。
        </span>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div className="form-row">
            <FormItem label="楼层">
              <Select
                allowClear
                placeholder="选择新楼层"
                options={FLOORS.map((f) => ({ label: f, value: f }))}
                value={batchFormData.floor || undefined}
                onChange={(v: string) => setBatchFormData({ ...batchFormData, floor: v })}
              />
            </FormItem>
            <FormItem label="业态">
              <Input
                allowClear
                placeholder="输入新业态，如 茶饮"
                value={batchFormData.category || ""}
                onChange={(v: string) => setBatchFormData({ ...batchFormData, category: v })}
              />
            </FormItem>
          </div>
        </Form>
      </Modal>

      <Modal
        title="导入结果"
        visible={!!resultModal}
        onOk={() => setResultModal(null)}
        onCancel={() => setResultModal(null)}
        okText="知道了"
        style={{ width: isMobile ? "100%" : 600 }}
        footer={(_cancelNode, okNode) => okNode}
      >
        {resultModal && (
          <div>
            <div className="stat-grid">
              <Card bordered>
                <Statistic
                  title="总数"
                  value={resultModal.successCount + resultModal.failCount}
                />
              </Card>
              <Card bordered>
                <Statistic
                  title="成功"
                  value={resultModal.successCount}
                />
              </Card>
              <Card bordered>
                <Statistic
                  title="失败"
                  value={resultModal.failCount}
                />
              </Card>
            </div>
            {resultModal.failReasons.length > 0 ? (
              <div>
                <span style={{ fontWeight: 600 }}>失败原因：</span>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {resultModal.failReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <span style={{ color: "rgb(var(--success-6))" }}>全部导入成功，无失败记录。</span>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="确认批量删除？"
        visible={deleteConfirmVisible}
        onOk={handleBatchDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ status: "danger", loading: deleteConfirmLoading }}
        unmountOnExit
      >
        <span>
          将删除选中的 {selectedRowKeys.length} 个商户，删除后不可恢复，且会清除其考勤记录。
        </span>
      </Modal>
    </div>
  );
}
