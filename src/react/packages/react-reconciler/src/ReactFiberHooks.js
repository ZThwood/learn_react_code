import ReactSharedInternals from "shared/ReactSharedInternals";
import {scheduleUpdateOnFiber} from "react-reconcile/src/ReactFiberWorkLoop";
import {enqueueCurrentHookUpdate} from "./ReactFiberConcurrentUpdates";

const {ReactCurrentDispatcher} = ReactSharedInternals;
// 当前正在渲染中的fiber
let currentlyRenderingFiber = null;
let workInProgressHook = null;
// 当前的hooks
let currentHook = null;

// 初次挂在
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
};

// 更新
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
};

/**
 * setState 在传入的新状态和当前的状态相同时跳过更新
 * @param {*} initialState
 * @returns
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, // 上次的reducer
    lastRenderedState: initialState, // 上次的状态
  };
  hook.queue = queue;

  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));

  return [hook.memoizedState, dispatch];
}

function dispatchSetState(fiber, queue, action) {
  const update = {
    action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  const {lastRenderedReducer, lastRenderedState} = queue;

  const eagerState = lastRenderedReducer(lastRenderedState, action);
  update.hasEagerState = true;
  update.eagerState = eagerState;
  if (Object.is(eagerState, lastRenderedState)) {
    return;
  }
  const root = enqueueCurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}

// useState其实就是内置了reducer的useState
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

function updateState() {
  return updateReducer(baseStateReducer);
}

/**
 * 代码执行到useReducer的时候会执行此函数
 * 挂载useReducer，每个useReducer都回调用一遍此函数
 * @param reducer useReducer的第一个参数
 * @param initialArg useReducer的第二个参数
 * @returns {(*)[]} 返回一个元组[state, dispatch]
 */
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg; // 初始化hook的状态
  // 一个useReducer多次调用dispatch，会共同使用这个更新队列
  const queue = {
    pending: null,
    dispatch: null,
  };
  hook.queue = queue;

  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));
  return [hook.memoizedState, dispatch];
}

/**
 * 更新useReducer
 * @param reducer useReducer的第一个参数
 * @returns {(*)[]} 返回一个元组[state, dispatch]
 */
function updateReducer(reducer) {
  // 获取新的hooks
  const hook = updateWorkInProgressHook();
  // 获取新hook的更新队列
  const queue = hook.queue;
  // 获取当前的hook
  const current = currentHook;
  // 获取将要生效的hook的更新队列
  const pendingQueue = queue.pending;
  // 初始化一个新的状态，取值为当前的状态
  let newState = current.memoizedState;
  if (pendingQueue !== null) {
    queue.pending = null;
    const firstUpdate = pendingQueue.next;
    let update = firstUpdate;
    do {
      if (update.hasEagerState) {
        newState = update.eagerState;
      } else {
        const action = update.action;
        newState = reducer(newState, action);
      }
      update = update.next;
    } while (update !== null && update !== firstUpdate);
  }
  hook.memoizedState = newState;
  return [hook.memoizedState, queue.dispatch];
}

/**
 * 执行派发动作的方法，更新状态，是页面重新渲染
 * 前两个参数是bind绑定的是后传入的，后一个参数使用使用dispatch的时候传入的action
 * @param fiber function对应的fiber
 * @param queue hook对应的更新队列
 * @param action 派发的动作 - 用户传入的
 */
function dispatchReducerAction(fiber, queue, action) {
  // 每个hook中会存放一个更新队列
  const update = {
    action,
    next: null,
  };
  // 把当前最新的更新添加到更新队列中，并返回当前的fiber
  const root = enqueueCurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}

/**
 * 更新视图
 * 函数组件的fiber.memoizedState存放的hooks单向链表
 * 每个hook.memoizedState存放的当前hook的状态
 * memoizedState 指向链表的头部
 * workInProgressHook 指向链表的最后一个
 */
function updateWorkInProgressHook() {
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

/**
 * 挂载构建中的Hook，不同的hooks都会调用这个方法
 * 当前函数的所有hooks都会存放在 fiber.memoizedState这个链表上
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook状态
    queue: null, // 存放本hook的更新队列， queue.pending = update
    next: null, // 指向下一个hook，一个函数可能有多个hook，他们会组成一个单向列表
  };
  if (workInProgressHook === null) {
    // memoizedState指向链表的头部
    // workInProgressHook 指向链表的最后一个
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

/**
 * 渲染函数组件，每个组件执行一次
 * @param current 当前函数组件已挂载的fiber
 * @param workInProgress 当前函数组件的新fiber
 * @param Component 函数组件的函数体
 * @param props 组件属性
 * @returns {*} 虚拟DOM或者说React元素
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  // Function 组件对应的fiber
  currentlyRenderingFiber = workInProgress;
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // 存放各种hooks，在函数组件执行的时候就能够获取到对应的hooks
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  // 函数组件执行
  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  return children;
}
