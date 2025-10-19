export function scheduleCallback(callback) {
  // 系统自带api
  requestIdleCallback(callback);
}
