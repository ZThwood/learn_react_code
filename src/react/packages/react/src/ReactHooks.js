import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

function resolveDispatcher() {
  return ReactCurrentDispatcher.current;
}
/**
 * 相关逻辑是在react-reconciler中实现的
 * @param reducer 处理函数，根据老状态计算新状态
 * @param initialArg 初始状态
 */
export function useReducer(reducer, initialArg) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg);
}

/**
 * 相关逻辑是在react-reconciler中实现的
 * @param initialArg 初始状态
 */
export function useState(initialArg) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialArg);
}
