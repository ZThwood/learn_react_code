export const allNativeEvents = new Set();

/**
 * 注册两个阶段的事件
 * @param registrationName React的事件名
 * @param dependencies 原生事件数组
 */
export function registerTwoPhaseEvent(registrationName, dependencies) {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + "Capture", dependencies);
}

/**
 * 所有的事件插件系统都会调用这个方法，allNativeEvents会汇总所有的原生事件
 * @param registrationName React的事件名
 * @param dependencies 原生事件数组
 */
export function registerDirectEvent(registrationName, dependencies) {
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}
