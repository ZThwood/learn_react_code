import {scheduleCallback} from "scheduler";
import {createWorkInProgress} from "react-reconcile/src/ReactFiber";
import {beginWork} from "./ReactFiberBeginWork";
import {completeWork} from "./ReactFiberCompleteWork";
import {
  MutationMask,
  NoFlags,
  Placement,
  Update,
  ChildDeletion,
} from "react-reconcile/src/ReactFiberFlags";
import {commitMutationEffectsOnFiber} from "./ReactFiberCommitWork";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "react-reconcile/src/ReactWorkTags";
import {finishQueueingConcurrentUpdates} from "./ReactFiberConcurrentUpdates";

let workInProgress = null;
let workInProgressRoot = null;

/**
 * fiber的调度更新
 * @param {*} root FiberRootNode
 */
export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

/**
 * 确保调度执行root上的更新
 * @param {*} root FiberRootNode
 * @returns
 */
function ensureRootIsScheduled(root) {
  if (workInProgressRoot) return;
  workInProgressRoot = root;
  // 告诉浏览器调度执行执行此函数
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root));
}

/**
 * 根据虚拟DOM创建fiber树，创建真实的DOM节点，把真实的DOM节点插入容器
 * @param {*} root FiberRootNode
 */
function performConcurrentWorkOnRoot(root) {
  // 第一次以同步的方式渲染根节点，为了更快的给用户展现
  renderRootSync(root);

  // 提交阶段，执行副作用，修改真实DOM
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  workInProgressRoot = null;
}

/**
 * render阶段
 * @param {*} root
 */
function renderRootSync(root) {
  prepareFreshStack(root);
  workLoopSync();
}

/**
 * 准备fiber树的跟fiber - HostRootFiber
 * @param {*} root
 */
function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null);
  finishQueueingConcurrentUpdates();
}

/**
 * 开启render阶段的同步工作循环
 */
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

/**
 * commit 阶段，执行副作用，修改真实DOM
 * @param {*} root 根节点
 */
function commitRoot(root) {
  const {finishedWork} = root;
  printFinishedWork(finishedWork);
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffect || rootHasEffect) {
    commitMutationEffectsOnFiber(finishedWork, root);
  }
  root.current = finishedWork;
}

/**
 * 执行一个工作单元
 * @param unitOfWork 当前要处理的新fiber节点
 */
function performUnitOfWork(unitOfWork) {
  // 获取新fiber对应的当前fiber
  const current = unitOfWork.alternate;
  // 完成当前fiber的子fiber链表构建，获取子元素，创建子元素的fiber，返回这个fiber
  const next = beginWork(current, unitOfWork);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 执行完成
    completeUnitOfWork(unitOfWork);
  } else {
    // 有子节点，让子节点成为下一个工作单元
    workInProgress = next;
  }
}

/**
 * 完成工作单元
 * @param unitOfWork
 */
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    // 执行此fiber的完成工作
    completeWork(current, completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    // 如果没有兄弟节点则说明当前是最后一个节点了，说明父节点也完成了
    // 当返回到root节点的时候completedWork和workInProgress都为null
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}

/** 打印副作用 */
function printFinishedWork(fiber) {
  let child = fiber.child;
  while (child) {
    printFinishedWork(child);
    child = child.sibling;
  }

  if (fiber.flags !== 0) {
    console.log(getFlags(fiber), getTag(fiber.tag), fiber.memoizedProps);
  }
}

function getTag(tag) {
  switch (tag) {
    case FunctionComponent:
      return "FunctionComponent";
    case HostRoot:
      return "HostRoot";
    case HostComponent:
      return "HostComponent";
    case HostText:
      return "HostText";
    case FunctionComponent:
      return "FunctionComponent";
    default:
      return tag;
  }
}
function getFlags(fiber) {
  const {flags, deletions} = fiber;
  if (flags === Placement) {
    return "插入";
  } else if (flags === Update) {
    return "更新";
  } else if (flags === ChildDeletion) {
    return (
      "子节点删除 " +
      deletions.map((fiber) => `${fiber.type} # ${fiber.memoizedProps.id}`)
    );
  }
  return flags;
}
