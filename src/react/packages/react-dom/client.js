import {createRoot as createRootImpl} from "./src/client/ReactDOMRoot";

/**
 * 创建根节点的Fiber
 * @param {*} container 根容器的真实DOM
 * @returns ReactDOMRoot 实例
 */
export function createRoot(container) {
  return createRootImpl(container);
}
