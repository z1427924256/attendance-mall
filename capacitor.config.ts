import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.attendance.mall",
  appName: "商场考勤管理",
  webDir: "dist",
  server: {
    // 使用线上后端 API
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
