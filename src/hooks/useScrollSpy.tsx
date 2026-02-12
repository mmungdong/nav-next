import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollSpy = (ids: string[], offset: number = 100) => {
  const [activeId, setActiveId] = useState<string>('');

  // 标记是否是由点击导航触发的滚动
  const isClickScrolling = useRef(false);

  // 用于检测滚动结束的定时器
  const scrollEndTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // === 核心修复逻辑 ===

      // 如果当前处于“点击滚动模式”
      if (isClickScrolling.current) {
        // 只要还在触发 scroll 事件，就说明还没停下来
        // 我们清除之前的定时器，重新计时
        if (scrollEndTimer.current) {
          clearTimeout(scrollEndTimer.current);
        }

        // 设置一个新的定时器：如果 100ms 内没有新的 scroll 事件，说明滚动结束了
        scrollEndTimer.current = setTimeout(() => {
          isClickScrolling.current = false;
        }, 100);

        // 重要：在点击滚动模式下，绝对不要更新 activeId
        // 保持 activeId 为用户点击的那个 ID
        return;
      }

      // === 以下是常规的滚动监听逻辑 ===

      const scrollPosition = window.scrollY + offset;

      // 寻找当前视口中最顶部的 section
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveId(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始化检查

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    };
  }, [ids, offset]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // 1. 立即锁定：告诉监听器“我要开始自动滚动了，你别插手”
      isClickScrolling.current = true;

      // 2. 立即设置高亮，UI 瞬间响应
      setActiveId(id);

      // 3. 计算位置并滚动
      // 减去 80px 是为了避开顶部固定的 Header 或留出呼吸感
      const offsetTop = element.offsetTop - 80;

      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });

      // 4. 安全网：万一目标位置就在当前位置（距离为0），scroll 事件可能不会触发
      // 所以我们手动设置一个极短的定时器来启动“防抖检测”流程
      // 如果 scroll 触发了，这个定时器会被 handleScroll 里的逻辑覆盖，不影响
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000); // 这里的 1000 只是一个兜底，主要依赖 handleScroll 里的动态检测
    }
  }, []);

  return { activeId, scrollToSection };
};
