import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * 响应式 hook：检测是否为移动端视口
 * 所有后台页面共用，保证断点一致
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
}
