import { useState } from "react";
import { Card, Form, Input, Button, Message } from "@arco-design/web-react";
import { IconUser, IconLock } from "@arco-design/web-react/icon";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/useIsMobile";

const FormItem = Form.Item;

export default function AdminLogin() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{ username: string; password: string }>({
    username: "admin",
    password: "admin123",
  });

  const handleFinish = () => {
    if (!formData.username) {
      Message.warning("请输入账号");
      return;
    }
    if (!formData.password) {
      Message.warning("请输入密码");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (formData.username === "admin" && formData.password === "admin123") {
        localStorage.setItem("admin_auth", "1");
        Message.success("登录成功");
        navigate("/admin/dashboard", { replace: true });
      } else {
        Message.error("账号或密码错误");
      }
    }, 500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        padding: 16,
      }}
    >
      <Card
        style={{ width: "100%", maxWidth: 380, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: isMobile ? "24px 16px" : "32px 28px", boxSizing: "border-box" }}
        bordered
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h3 style={{ marginBottom: 4, color: "rgb(var(--primary-6))", marginTop: 0 }}>
            商场考勤管理系统
          </h3>
          <span style={{ color: "#999" }}>管理后台 · v1.0</span>
        </div>
        <Form
          layout="vertical"
          onSubmit={(e) => {
            e.preventDefault();
            handleFinish();
          }}
        >
          <FormItem label="账号">
            <Input
              value={formData.username}
              onChange={(value) =>
                setFormData({ ...formData, username: value })
              }
              placeholder="账号"
              prefix={<IconUser />}
              allowClear
            />
          </FormItem>
          <FormItem label="密码">
            <Input.Password
              value={formData.password}
              onChange={(value) =>
                setFormData({ ...formData, password: value })
              }
              placeholder="密码"
              prefix={<IconLock />}
              allowClear
            />
          </FormItem>
          <FormItem style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              long
              loading={loading}
              onClick={handleFinish}
            >
              登 录
            </Button>
          </FormItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <span style={{ color: "#999", fontSize: 12 }}>
            默认账号：admin / admin123
          </span>
        </div>
      </Card>
    </div>
  );
}
