// 日志工具模块
const logger = (function() {
  return {
    debug: (...args) => console.debug('[Scanner]', ...args),
    info: (...args) => console.info('[Scanner]', ...args),
    warn: (...args) => console.warn('[Scanner]', ...args),
    error: (...args) => console.error('[Scanner]', ...args)
  };
})();

window.logger = logger;
