// 动画配置文件
import { shouldReduceMotion } from './utils';

// 基础动画时长（根据用户偏好调整）
const getDuration = (_fast: number, normal: number, _slow: number): number => {
  if (shouldReduceMotion()) return 0;
  return normal;
};

// 缓动函数
const easeInOut = [0.42, 0, 0.58, 1] as [number, number, number, number];
const easeOut = [0.37, 0, 0.63, 1] as [number, number, number, number];
const easeIn = [0.42, 0, 1, 1] as [number, number, number, number];

export const animationConfig = {
  // 通用动画时长
  durations: {
    fast: 150,
    normal: 250,
    slow: 400,
  },

  // 是否应该减少动画
  reduceMotion: shouldReduceMotion(),

  // 标准缓动函数
  easings: {
    easeInOut,
    easeOut,
    easeIn,
  },

  // 卡片动画配置 - 优化交错延迟
  card: {
    enter: {
      duration: getDuration(150, 300, 400),
      ease: easeInOut,
      staggerDelay: shouldReduceMotion() ? 0 : 0.03, // 减少交错延迟
    },
    hover: {
      y: -4,
      duration: shouldReduceMotion() ? 0 : 150,
    },
  },

  // Sidebar 动画配置
  sidebar: {
    collapsedWidth: 80,
    expandedWidth: 256,
    width: {
      duration: shouldReduceMotion() ? 0 : 200,
      ease: easeInOut,
    },
    collapseButton: {
      rotate: {
        duration: shouldReduceMotion() ? 0 : 200,
        ease: easeInOut,
      },
    },
    menuItem: {
      enter: {
        duration: shouldReduceMotion() ? 0 : 200,
        ease: easeInOut,
        staggerDelay: shouldReduceMotion() ? 0 : 0.03,
      },
      hover: {
        scale: 1.02,
        duration: shouldReduceMotion() ? 0 : 100,
      },
      tap: {
        scale: 0.98,
        duration: shouldReduceMotion() ? 0 : 50,
      },
    },
  },

  // Modal 动画配置
  modal: {
    backdrop: {
      enter: {
        opacity: {
          duration: shouldReduceMotion() ? 0 : 150,
          ease: easeOut,
        },
      },
      exit: {
        opacity: {
          duration: shouldReduceMotion() ? 0 : 100,
          ease: easeIn,
        },
      },
    },
    content: {
      enter: {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        opacity: {
          duration: shouldReduceMotion() ? 0 : 150,
          ease: easeOut,
        },
        scale: {
          duration: shouldReduceMotion() ? 0 : 200,
          ease: easeOut,
        },
        y: {
          duration: shouldReduceMotion() ? 0 : 200,
          ease: easeOut,
        },
      },
      exit: {
        animate: { opacity: 0, scale: 0.95, y: 20 },
        opacity: {
          duration: shouldReduceMotion() ? 0 : 100,
          ease: easeIn,
        },
        scale: {
          duration: shouldReduceMotion() ? 0 : 100,
          ease: easeIn,
        },
        y: {
          duration: shouldReduceMotion() ? 0 : 100,
          ease: easeIn,
        },
      },
    },
  },

  // 页面过渡动画
  page: {
    enter: {
      opacity: {
        duration: shouldReduceMotion() ? 0 : 200,
        ease: easeOut,
      },
      y: {
        from: 20,
        duration: shouldReduceMotion() ? 0 : 200,
        ease: easeOut,
      },
    },
  },
};

// 通用动画 variants
export const animations = {
  // 淡入上移动画
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: animationConfig.durations.normal / 1000,
        ease: animationConfig.easings.easeOut,
      },
    },
  },

  // 骨架屏闪烁
  shimmer: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },

  // 弹跳效果
  bounce: {
    scale: {
      0: { scale: 1 },
      0.5: { scale: 1.05 },
      1: { scale: 1 },
    },
    transition: {
      duration: 0.3,
    },
  },
};

// 滚动到顶部的平滑滚动配置
export const scrollToTop = {
  behavior: 'smooth' as ScrollBehavior,
  top: 0,
};

export default animationConfig;