// 动画配置文件
export const animationConfig = {
  // 通用动画时长
  durations: {
    fast: 150,
    normal: 250,
    slow: 400,
  },

  // 标准缓动函数
  easings: {
    easeInOut: [0.42, 0, 0.58, 1] as [number, number, number, number],
    easeOut: [0.37, 0, 0.63, 1] as [number, number, number, number],
    easeIn: [0.42, 0, 1, 1] as [number, number, number, number],
  },

  // Sidebar 动画配置
  sidebar: {
    collapsedWidth: 80,
    expandedWidth: 256,
    width: {
      duration: 300,
      ease: [0.42, 0, 0.58, 1] as [number, number, number, number], // easeInOut
    },
    collapseButton: {
      rotate: {
        duration: 300,
        ease: [0.42, 0, 0.58, 1] as [number, number, number, number], // easeInOut
      },
    },
    menuItem: {
      enter: {
        duration: 300,
        ease: [0.42, 0, 0.58, 1] as [number, number, number, number], // easeInOut
        staggerDelay: 0.05,
      },
      hover: {
        scale: 1.02,
        duration: 200,
      },
      tap: {
        scale: 0.98,
        duration: 100,
      },
    },
  },

  // Modal 动画配置
  modal: {
    backdrop: {
      enter: {
        opacity: {
          duration: 200,
          ease: [0.37, 0, 0.63, 1] as [number, number, number, number], // easeOut
        },
      },
      exit: {
        opacity: {
          duration: 150,
          ease: [0.42, 0, 1, 1] as [number, number, number, number], // easeIn
        },
      },
    },
    content: {
      enter: {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        opacity: {
          duration: 200,
          ease: [0.37, 0, 0.63, 1] as [number, number, number, number], // easeOut
        },
        scale: {
          duration: 250,
          ease: [0.37, 0, 0.63, 1] as [number, number, number, number], // easeOut
        },
        y: {
          duration: 250,
          ease: [0.37, 0, 0.63, 1] as [number, number, number, number], // easeOut
        },
      },
      exit: {
        animate: { opacity: 0, scale: 0.95, y: 20 },
        opacity: {
          duration: 150,
          ease: [0.42, 0, 1, 1] as [number, number, number, number], // easeIn
        },
        scale: {
          duration: 150,
          ease: [0.42, 0, 1, 1] as [number, number, number, number], // easeIn
        },
        y: {
          duration: 150,
          ease: [0.42, 0, 1, 1] as [number, number, number, number], // easeIn
        },
      },
    },
  },

  // 卡片动画配置
  card: {
    enter: {
      duration: 300,
      ease: [0.42, 0, 0.58, 1] as [number, number, number, number], // easeInOut
      staggerDelay: 0.05,
    },
    hover: {
      y: -5,
      duration: 200,
    },
  },
};

export default animationConfig;
