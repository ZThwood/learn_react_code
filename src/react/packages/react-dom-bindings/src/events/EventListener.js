/**
 * 绑定捕获事件
 * @param {*} target
 * @param {*} eventType click
 * @param {*} listener 回调函数
 * @returns listener 事件监听函数用于销毁事件监听
 */
export function addEventCaptureListener(target, eventType, listener) {
  target.addEventListener(eventType, listener, true);
  return listener;
}

/**
 * 绑定冒泡事件
 * @param {*} target
 * @param {*} eventType
 * @param {*} listener
 * @returns
 */
export function addEventBubbleListener(target, eventType, listener) {
  target.addEventListener(eventType, listener, false);
  return listener;
}

/**
 * 解除事件的绑定
 * @param {*} target
 * @param {*} eventType
 * @param {*} listener
 * @param {*} capture
 */
export function removerEventListener(target, eventType, listener, capture) {
  target.removerEventListener(eventType, listener, capture);
}
