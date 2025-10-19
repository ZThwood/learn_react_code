import {markUpdateLaneFromFiberToRoot} from "./ReactFiberConcurrentUpdates";
import assign from "shared/assign";

export const UpdateState = 0;

/**
 * 给fiber初始化一个更新队列
 * @param {*} fiber fiber节点
 */
export function initializeUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null, // 指向一个循环列表的最新的update
      // lanes: NoLanes,
    },
    effects: null,
  };
  fiber.updateQueue = queue;
}

/**
 * 创建一个更新
 * @returns 返回update对象
 */
export function createUpdate() {
  const update = {
    tag: UpdateState, // 更新的类型
    payload: null, // HostRootFiber的payload的element存储的是它的子组件
    callback: null,

    next: null, // 指向下一个更新
  };
  return update;
}

/**
 * 将update对象添加到更新队列
 * updateQueue的数据结构：
 * 是一个环形链表，pending指向最后一个update
 * @param {*} fiber
 * @param {*} update 更新对象
 * @returns
 */
export function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return null;
  }
  const sharedQueue = updateQueue.shared;
  const pending = sharedQueue.pending;
  if (pending === null) {
    // 第一次更新，自己指向自己
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  // fiber的pending指向新的update（最后一个更新节点）
  sharedQueue.pending = update;
  return markUpdateLaneFromFiberToRoot(fiber);
}

/**
 * 处理fiber的状态 - memoizedState
 * 根据当前状态和更新队列中的状态计算新的状态
 * @param {*} fiber 要计算的fiber
 */
export function processUpdateQueue(fiber) {
  const queue = fiber.updateQueue;
  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    // 循环链表最后一个指向第一个update
    const firstPendingUpdate = lastPendingUpdate.next;
    // 剪断循环链表
    lastPendingUpdate.next = null;
    // 获取当前状态
    let newState = fiber.memoizedState;
    let update = firstPendingUpdate;
    while (update) {
      newState = getStateFromUpdate(update, newState);
      update = update.next;
    }
    // 赋值新状态
    fiber.memoizedState = newState;
  }
}

function getStateFromUpdate(update, preState) {
  switch (update.tag) {
    case UpdateState:
      const {payload} = update;
      return assign({}, preState, payload);
    default:
      return preState;
  }
}
// let fiber = {memoizedState: {id: 1}};
// initializeUpdateQueue(fiber);
//
// let update1 = createUpdate();
// update1.payload = {name: 'wsn'};
// enqueueUpdate(fiber, update1);
//
// let update2 = createUpdate();
// update2.payload = {age: '16'};
// enqueueUpdate(fiber, update2);
//
// let update3 = createUpdate();
// update3.payload = {sex: '男'};
// enqueueUpdate(fiber, update3);
// //  基于老的状态计算新的状态
// processUpdateQueue(fiber);
//
// console.log(fiber);
