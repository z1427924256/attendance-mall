import { useState } from "react";
import { Card, Button, Upload, Table, Statistic, Alert, Modal, Descriptions, Message } from "@arco-design/web-react";
import {
  IconUpload,
  IconDownload,
  IconNotification,
} from "@arco-design/web-react/icon";
import dayjs from "dayjs";
import { exportBackup, restoreBackup } from "@/api/client";
import { useIsMobile } from "@/hooks/useIsMobile";

interface PreviewRow {
  table: string;
  count: number;
}

const LAST_BACKUP_KEY = "lastBackupTime";

export default function BackupRestore() {
  const isMobile = useIsMobile();
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingSql, setExportingSql] = useState(false);
  const [restoring] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() =>
    localStorage.getItem(LAST_BACKUP_KEY)
  );
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmData, setConfirmData] = useState<Record<string, unknown[]> | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const recordBackupTime = () => {
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
    localStorage.setItem(LAST_BACKUP_KEY, now);
    setLastBackupTime(now);
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const blob = await exportBackup("json");
      triggerDownload(
        blob,
        `backup-${dayjs().format("YYYYMMDD-HHmmss")}.json`
      );
      recordBackupTime();
      Message.success("JSON 备份导出成功");
    } catch (e) {
      Message.error("导出失败：" + (e as Error).message);
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportSql = async () => {
    setExportingSql(true);
    try {
      const blob = await exportBackup("sql");
      triggerDownload(
        blob,
        `backup-${dayjs().format("YYYYMMDD-HHmmss")}.sql`
      );
      recordBackupTime();
      Message.success("SQL 备份导出成功");
    } catch (e) {
      Message.error("导出失败：" + (e as Error).message);
    } finally {
      setExportingSql(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!confirmData) return;
    setConfirmLoading(true);
    try {
      const res = await restoreBackup(confirmData);
      if (res.success) {
        Message.success(res.message || "数据还原成功");
      } else {
        Message.error(res.message || "数据还原失败");
      }
    } catch (e) {
      Message.error("还原失败：" + (e as Error).message);
    } finally {
      setConfirmLoading(false);
      setConfirmVisible(false);
      setConfirmData(null);
    }
  };

  const handleRestoreFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text) as Record<string, unknown[]>;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          Message.error("备份文件格式不正确：应为 JSON 对象");
          return;
        }
        const rows: PreviewRow[] = Object.entries(data).map(
          ([table, rows]) => ({
            table,
            count: Array.isArray(rows) ? rows.length : 0,
          })
        );
        const total = rows.reduce((s, r) => s + r.count, 0);
        setPreviewRows(rows);
        setTotalRecords(total);
        setConfirmData(data);
        setConfirmVisible(true);
      } catch (e) {
        Message.error("JSON 解析失败：" + (e as Error).message);
      }
    };
    reader.onerror = () => Message.error("文件读取失败");
    reader.readAsText(file);
  };

  const previewColumns = [
    { dataIndex: "table", key: "table", title: "数据表", render: (_value: unknown, row: PreviewRow) => row.table },
    { dataIndex: "count", key: "count", title: "记录数", minWidth: 80, render: (_value: unknown, row: PreviewRow) => row.count, align: "right" as const },
  ];

  return (
    <div className="page-root">
      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconNotification />数据备份</span>
          </div>
        }
        bordered
      >
        <div className="filter-bar">
          <div style={{ flex: "1 1 0%", minWidth: 200 }}>
            <Statistic title="上次备份时间" value={lastBackupTime || "暂无备份记录"} />
          </div>
          <div className="filter-bar" style={{ flex: "1 1 0%" }}>
            <Button
              type="primary"
              icon={<IconDownload />}
              loading={exportingJson}
              onClick={handleExportJson}
              long={isMobile}
            >
              导出 JSON 备份
            </Button>
            <Button
              icon={<IconDownload />}
              loading={exportingSql}
              onClick={handleExportSql}
              long={isMobile}
            >
              导出 SQL 备份
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconUpload />数据还原</span>
          </div>
        }
        bordered
      >
        <div className="upload-zone">
          <Upload
            drag
            accept=".json"
            autoUpload={false}
            multiple={false}
            showUploadList={false}
            disabled={restoring}
            beforeUpload={(file: File) => {
              handleRestoreFile(file);
              return false;
            }}
          >
            <div style={{ padding: "32px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <IconUpload style={{ fontSize: 48, color: "rgb(var(--primary-6))", marginBottom: 12 }} />
              <p style={{ margin: 0 }}>点击或拖拽 JSON 备份文件到此处还原</p>
              <p style={{ margin: "4px 0 0", color: "var(--color-text-3)", fontSize: 12 }}>
                仅支持单文件 .json 格式，还原前会预览数据表统计并需二次确认
              </p>
            </div>
          </Upload>
        </div>
        <Alert
          type="info"
          style={{ marginTop: 12 }}
          content={
            <span style={{ color: "var(--color-text-3)" }}>
              还原流程：选择文件 → 自动解析并预览各表记录数 → 确认后执行还原
            </span>
          }
        />
      </Card>

      <Card
        title={
          <div className="card-header-bar">
            <span className="card-title-text"><IconNotification />备份说明</span>
          </div>
        }
        bordered
      >
        <Alert
          type="info"
          content={
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>备份与还原规则</div>
              <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                <li>备份范围包含全部数据表（商户、考勤、规则、日志等）</li>
                <li>还原操作不可撤销，执行后将覆盖现有数据，请谨慎操作</li>
                <li>所有备份、还原操作自动写入审计日志，可随时追溯</li>
              </ul>
            </div>
          }
        />
      </Card>

      <Modal
        title="确认还原数据？"
        visible={confirmVisible}
        onOk={handleConfirmRestore}
        onCancel={() => setConfirmVisible(false)}
        okText="确认还原"
        cancelText="取消"
        okButtonProps={{ status: "danger", loading: confirmLoading }}
        unmountOnExit
        style={{ width: isMobile ? "100%" : 600 }}
      >
        <div>
          <Alert
            type="warning"
            content="还原操作不可撤销，将覆盖现有数据"
            style={{ marginBottom: 12 }}
          />
          <Descriptions
            layout="horizontal"
            colon
            column={2}
            data={[
              { key: "tables", label: "数据表数量", value: previewRows.length },
              { key: "total", label: "记录总数", value: totalRecords },
            ]}
          />
          <div className="table-wrap">
            <Table
              size="small"
              data={previewRows}
              rowKey="table"
              columns={previewColumns}
              border={{ wrapper: true, cell: true }}
              scroll={{ x: "max-content" }}
              pagination={false}
              style={{ marginTop: 12 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
