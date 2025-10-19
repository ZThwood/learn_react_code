const randomKey = Math.random().toString(36).slice(2);
const internalPropsKey = "__reactProps$" + randomKey;
const internalInstanceKey = "__reactFiber$" + randomKey;

/**
 * 获取挂载在dom上的fiber
 * @param targetNode 原生节点
 * @returns {*}
 */
export function getClosestInstanceFromNode(targetNode) {
  const targetInst = targetNode[internalInstanceKey];
  if (targetInst) {
    return targetInst;
  }
  return null;
}

/**
 * 将fiber的实例挂载到dom上
 * @param hostInst 节点的fiber
 * @param node 节点的原生DOM
 */
export function preCacheFiberNode(hostInst, node) {
  node[internalInstanceKey] = hostInst;
}

/**
 * 取缓存在dom上的props
 * @param node
 * @returns {*|null}
 */
export function getFiberCurrentPropsFromNode(node) {
  return node[internalPropsKey] || null;
}

/**
 * 将props缓存在dom上
 * @param node dom节点
 * @param props fiber的props属性
 */
export function updateFiberProps(node, props) {
  node[internalPropsKey] = props;
}
