import { Card, Form, Input, Switch, TimePicker, Button, Tag, Popconfirm, DatePicker, Message } from "@arco-design/web-react";
import { IconPlus, IconDelete, IconCheck } from "@arco-design/web-react/icon";

const FormItem = Form.Item;
import dayjs from "dayjs";
import { useState } from "react";
import { useAdminStore } from "@/store/useAdminStore";

const WEEK_OPTIONS = [
  { label: "周日", value: 0 },
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
];

export default function RuleConfig() {
  const { rule, updateRule } = useAdminStore();
  const [newHoliday, setNewHoliday] = useState<string>("");

  const handleAddHoliday = () => {
    if (!newHoliday) {
      Message.warning("请选择日期");
      return;
    }
    const dateStr = dayjs(newHoliday).format("YYYY-MM-DD");
    if (rule.holidays.includes(dateStr)) {
      Message.warning("该日期已存在");
      return;
    }
    updateRule({ holidays: [...rule.holidays, dateStr].sort() });
    setNewHoliday("");
    Message.success("已添加节假日");
  };

  const handleRemoveHoliday = (date: string) => {
    updateRule({ holidays: rule.holidays.filter((d) => d !== date) });
    Message.success("已移除");
  };

  const handleToggleWeeklyOff = (day: number) => {
    const next = rule.weeklyOff.includes(day)
      ? rule.weeklyOff.filter((d) => d !== day)
      : [...rule.weeklyOff, day];
    updateRule({ weeklyOff: next });
  };

  const handleSave = () => {
    Message.success("规则已保存");
  };

  const handleTimePickerChange = (
    value: string,
    field: "dailyStartTime" | "dailyEndTime" | "absentThreshold"
  ) => {
    if (value) {
      updateRule({ [field]: value });
    }
  };

  return (
    <div>
      <Card bordered>
        <div className="card-section-header">
          <span className="card-title-text">点名规则配置</span>
          <div className="card-actions">
            <Button
              type="primary"
              icon={<IconCheck />}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </div>
        </div>
        <h5 style={{ marginBottom: 16, marginTop: 0 }}>基础时间设置</h5>
        <Form layout="vertical" style={{ maxWidth: 500 }}>
          <FormItem label="每日点名开始时间">
            <TimePicker
              value={rule.dailyStartTime}
              format="HH:mm"
              step={{ minute: 5 }}
              style={{ width: "100%" }}
              onChange={(value: string) => handleTimePickerChange(value, "dailyStartTime")}
            />
          </FormItem>
          <FormItem label="每日点名结束时间">
            <TimePicker
              value={rule.dailyEndTime}
              format="HH:mm"
              step={{ minute: 5 }}
              style={{ width: "100%" }}
              onChange={(value: string) => handleTimePickerChange(value, "dailyEndTime")}
            />
          </FormItem>
          <FormItem label="自动缺勤判定时间" help="超过此时间仍未签到的商户将自动判为缺勤">
            <div className="inline-group">
              <TimePicker
                value={rule.absentThreshold}
                format="HH:mm"
                step={{ minute: 5 }}
                onChange={(value: string) => handleTimePickerChange(value, "absentThreshold")}
              />
              <Switch
                checked={rule.enableAutoAbsent}
                onChange={(value: boolean) => updateRule({ enableAutoAbsent: value })}
              />
              <span className="text-secondary">启用自动判定</span>
            </div>
          </FormItem>
          <FormItem label="提前提醒（分钟）" help="点名结束前 N 分钟向未签到商户发送提醒">
            <Input
              value={String(rule.remindBefore)}
              onChange={(value: string) => {
                const num = Number(value);
                if (!isNaN(num)) {
                  updateRule({ remindBefore: Math.min(60, Math.max(0, num)) });
                }
              }}
            />
          </FormItem>
        </Form>
      </Card>

      <Card
        style={{ marginTop: 16 }}
        bordered
      >
        <div className="card-section-header">
          <span className="card-title-text">每周休息日</span>
        </div>
        <span className="text-secondary">休息日不进行点名</span>
        <div style={{ marginTop: 12 }}>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {WEEK_OPTIONS.map((d) => (
              <Tag
                key={d.value}
                bordered={false}
                onClick={() => handleToggleWeeklyOff(d.value)}
                style={{
                  padding: "4px 12px",
                  fontSize: 14,
                  cursor: "pointer",
                  border: rule.weeklyOff.includes(d.value)
                    ? "1px solid rgb(var(--primary-6))"
                    : undefined,
                  background: rule.weeklyOff.includes(d.value) ? "var(--color-primary-light-1)" : undefined,
                  color: rule.weeklyOff.includes(d.value) ? "rgb(var(--primary-6))" : undefined,
                }}
              >
                {d.label}
              </Tag>
            ))}
          </div>
        </div>
      </Card>

      <Card
        style={{ marginTop: 16 }}
        bordered
      >
        <div className="card-section-header">
          <span className="card-title-text">节假日配置</span>
        </div>
        <div className="filter-bar">
          <DatePicker
            value={newHoliday}
            onChange={(value: string) => setNewHoliday(value)}
            format="YYYY-MM-DD"
            placeholder="选择日期"
            allowClear
          />
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={handleAddHoliday}
          >
            添加
          </Button>
        </div>

        {rule.holidays.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#999" }}>
            暂无节假日
          </div>
        ) : (
          <div className="list-stack">
            {rule.holidays.map((date: string) => (
              <div
                key={date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#fafafa",
                  borderRadius: 6,
                }}
              >
                <div className="inline-group">
                  <span style={{ fontWeight: 600 }}>{date}</span>
                  <Tag color="blue" bordered={false}>
                    {dayjs(date).format("dddd")}
                  </Tag>
                </div>
                <Popconfirm
                  title="确认移除？"
                  onOk={() => handleRemoveHoliday(date)}
                >
                  <Button type="text" status="danger" size="small" icon={<IconDelete />}>
                    移除
                  </Button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        style={{ marginTop: 16 }}
        bordered
      >
        <div className="card-section-header">
          <span className="card-title-text">规则预览</span>
        </div>
        <div style={{ background: "var(--color-primary-light-1)", padding: 16, borderRadius: 6, border: "1px solid var(--color-primary-light-3)" }}>
          <div className="list-stack">
            <div>
              {"\u2713"} 每日点名时间：<span style={{ fontWeight: 600 }}>{rule.dailyStartTime} - {rule.dailyEndTime}</span>
            </div>
            <div>
              {"\u2713"} 自动缺勤判定：
              {rule.enableAutoAbsent ? (
                <>
                  超过 <span style={{ fontWeight: 600 }}>{rule.absentThreshold}</span> 未签到自动判缺勤
                </>
              ) : (
                <span className="text-secondary">未启用</span>
              )}
            </div>
            <div>
              {"\u2713"} 提前提醒：点名结束前 <span style={{ fontWeight: 600 }}>{rule.remindBefore}</span> 分钟
            </div>
            <div>
              {"\u2713"} 休息日：
              {rule.weeklyOff.length > 0
                ? rule.weeklyOff
                    .sort()
                    .map((d) => WEEK_OPTIONS.find((w) => w.value === d)?.label)
                    .join("、")
                : "无"}
            </div>
            <div>
              {"\u2713"} 节假日：共 <span style={{ fontWeight: 600 }}>{rule.holidays.length}</span> 天
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
