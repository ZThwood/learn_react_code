import { createHostRootFiber } from './ReactFiber';
import { initializeUpdateQueue } from './ReactFiberClassUpdateQueue';

function FiberRootNode(containerInfo) {
    this.containerInfo = containerInfo;
}
/**
 * 创建根节点的fiber
 * @param {*} containerInfo 根节点#root真实DOM
 * @returns FiberRootNode的实例对象
 */
export function createFiberRoot(containerInfo) {
    // 创建FiberRootNode实例 containerInfo属性真向根节点#root的真实DOM
    const root = new FiberRootNode(containerInfo);

    // 创建根节点#root的fiber
    const uninitializedFiber = createHostRootFiber();
    // 用current属性指向根节点#root的fiber
    root.current = uninitializedFiber;
    // 根节点的fiber的stateNode指向根节点（真实DOM）
    uninitializedFiber.stateNode = root;
    // 初始化fiber的更新队列
    initializeUpdateQueue(uninitializedFiber);
    debugger;
    return root;
}
