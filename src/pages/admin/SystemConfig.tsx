import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Message,
} from "@arco-design/web-react";
import { fetchSystemConfig, updateSystemConfig } from "@/api/client";

const FormItem = Form.Item;

/* 内联 SVG 图标 */
const Ic = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}><path d={d} /></svg>
);
const SaveIcon = (p: { style?: React.CSSProperties }) => <Ic d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" {...p} />;
const ReloadIcon = (p: { style?: React.CSSProperties }) => <Ic d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" {...p} />;
const ToolIcon = (p: { style?: React.CSSProperties }) => <Ic d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" {...p} />;
const BgColorsIcon = (p: { style?: React.CSSProperties }) => <Ic d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z" {...p} />;
const WarningIcon = (p: { style?: React.CSSProperties }) => <Ic d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" {...p} />;

interface FormValues {
  mall_name: string;
  logo_url: string;
  report_header: string;
  export_watermark: string;
  email_notification: boolean;
  theme_color: string;
}

const DEFAULT_VALUES: FormValues = {
  mall_name: "",
  logo_url: "",
  report_header: "",
  export_watermark: "",
  email_notification: false,
  theme_color: "#16a34a",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: "16px 0 12px",
  color: "#333",
};

export default function SystemConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormValues>({ ...DEFAULT_VALUES });
  const [form] = Form.useForm<FormValues>();

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await fetchSystemConfig();
      setFormData({
        mall_name: config.mall_name ?? "",
        logo_url: config.logo_url ?? "",
        report_header: config.report_header ?? "",
        export_watermark: config.export_watermark ?? "",
        email_notification: config.email_notification === "1",
        theme_color: config.theme_color || "#16a34a",
      });
    } catch (e) {
      Message.error((e as Error).message || "加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      await form.validate();
    } catch {
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, string> = {
        mall_name: formData.mall_name ?? "",
        logo_url: formData.logo_url ?? "",
        report_header: formData.report_header ?? "",
        export_watermark: formData.export_watermark ?? "",
        email_notification: formData.email_notification ? "1" : "0",
        theme_color: formData.theme_color ?? "#16a34a",
      };
      await updateSystemConfig(payload);
      Message.success("配置已保存");
    } catch (e) {
      Message.error((e as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
    Message.info("已重新加载配置");
  };

  return (
    <Card>
      <div className="card-section-header">
        <div className="card-title-text">
          <ToolIcon />
          系统配置中心
        </div>
        <div className="card-actions">
          <Button icon={<ReloadIcon />} onClick={handleReset} loading={loading}>
            重新加载
          </Button>
          <Button
            type="primary"
            icon={<SaveIcon />}
            onClick={handleSave}
            loading={saving}
          >
            保存配置
          </Button>
        </div>
      </div>
      <div
        style={{
          background: "#fffbe6",
          border: "1px solid #ffe58f",
          borderRadius: 4,
          padding: "8px 12px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#ad6800",
        }}
      >
        <WarningIcon style={{ color: "#faad14" }} />
        <span>系统配置页面仅超级管理员可访问及修改</span>
      </div>

      <Form form={form} layout="vertical" initialValues={DEFAULT_VALUES}>
        <div style={sectionTitleStyle}>基础信息</div>
        <div className="form-row">
          <FormItem
            label="商场名称"
            field="mall_name"
            rules={[{ required: true, message: "请输入商场名称" }]}
          >
            <Input
              placeholder="如：万象城购物中心"
              maxLength={50}
              value={formData.mall_name}
              onChange={(val) => setFormData({ ...formData, mall_name: val })}
            />
          </FormItem>
          <FormItem label="系统 LOGO URL" field="logo_url">
            <Input
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={(val) => setFormData({ ...formData, logo_url: val })}
            />
          </FormItem>
        </div>

        <div style={sectionTitleStyle}>报表与导出</div>
        <div className="form-row">
          <FormItem
            label="报表页眉文字"
            field="report_header"
            rules={[{ required: true, message: "请输入页眉文字" }]}
          >
            <Input
              placeholder="如：商场考勤月度报表"
              maxLength={50}
              value={formData.report_header}
              onChange={(val) => setFormData({ ...formData, report_header: val })}
            />
          </FormItem>
          <FormItem label="导出水印文字" field="export_watermark">
            <Input
              placeholder="如：内部资料 请勿外传"
              maxLength={50}
              value={formData.export_watermark}
              onChange={(val) => setFormData({ ...formData, export_watermark: val })}
            />
          </FormItem>
        </div>

        <div style={sectionTitleStyle}>通知与外观</div>
        <div className="form-row">
          <FormItem
            label="邮件推送开关"
            field="email_notification"
            extra="开启后异常与预警将通过邮件推送至管理员"
          >
            <Switch
              checked={formData.email_notification}
              onChange={(v: boolean) =>
                setFormData({ ...formData, email_notification: v })
              }
            />
          </FormItem>
          <FormItem
            label="主题色"
            field="theme_color"
            rules={[{ required: true, message: "请选择主题色" }]}
            extra={
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <BgColorsIcon style={{ width: 14, height: 14 }} />
                <span style={{ color: "#999" }}>
                  当前选择：<span style={{ fontWeight: 600 }}>{formData.theme_color}</span>
                </span>
              </div>
            }
          >
            <div style={{ display: "inline-block", width: 120 }}>
              <input
                type="color"
                value={formData.theme_color}
                onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                style={{
                  width: "100%",
                  height: 24,
                  padding: 2,
                  cursor: "pointer",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                }}
              />
            </div>
          </FormItem>
        </div>
      </Form>
    </Card>
  );
}
