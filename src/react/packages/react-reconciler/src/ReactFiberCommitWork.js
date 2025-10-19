import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "react-reconcile/src/ReactWorkTags";
import {
  MutationMask,
  Placement,
  Update,
} from "react-reconcile/src/ReactFiberFlags";
import {
  appendChild,
  insertBefore,
  commitUpdate,
  removeChild,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";

let hostParent = null;

/**
 * 提交删除副作用
 * @param {*} root 跟节点
 * @param {*} returnFiber 父fiber
 * @param {*} deleteFiber 删除的fiber
 */
function commitDeletionEffects(root, returnFiber, deleteFiber) {
  let parent = returnFiber;
  // 向上查找真实的DOM父节点
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode;
        break findParent;
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo;
        break findParent;
      }
    }
    parent = parent.return;
  }
  commitDeletionEffectsOnFiber(root, returnFiber, deleteFiber);
  hostParent = null;
}

function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor,
  deletedFiber,
) {
  switch (deletedFiber.tag) {
    case HostComponent:
    case HostText: {
      // const prevHostParent = hostParent;
      // hostParent = null;
      // 删除节点的时候先删除他的子节点，再删除自己
      // 因为如果子节点是函数组件或者类组件需要处理生命周期等操作
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      // hostParent = prevHostParent;
      // 删除自己
      if (hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * 递归删除子节点
 * 因为子节点不一定是原生DOM借点
 * @param {*} finishedRoot
 * @param {*} nearestMountedAncestor
 * @param {*} parent
 */
function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAncestor,
  parent,
) {
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
    child = child.sibling;
  }
}
/**
 * 递归遍历处理变更的副作用
 * @param {*} root
 * @param {*} parentFiber
 */
function recursivelyTraverseMutationEffects(root, parentFiber) {
  // 先删除父fiber上需要删除的节点
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }
  if (parentFiber.subtreeFlags & MutationMask) {
    let {child} = parentFiber;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const {flags} = finishedWork;
  if (flags & Placement) {
    commitPlacement(finishedWork);
    // 删除flags里的Placement
    finishedWork.flags &= ~Placement;
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}

/**
 * 将子节点的真是DOM插入到父节点
 * @param node 子节点
 * @param parent 父节点 - 已确认过是真实DOM节点
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const {stateNode} = node;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else {
    const {child} = node;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let {sibling} = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

/**
 * 获取最近的弟弟的真实节点
 * 插入的锚点
 * @param {*} fiber
 * @returns
 */
function getHostSibling(fiber) {
  let node = fiber;

  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (node.tag !== HostComponent && node.tag !== HostText) {
      // 如果当前的节点是要插入的节点，就不用往下看了
      if (node.flags & Placement) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function commitPlacement(finishedWork) {
  // 确定父节点是真实DOM节点
  let parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    default:
      break;
  }
}

/**
 * 遍历fiber树，执行fiber上的副作用
 * @param finishedWork 当前的fiber树
 * @param root 根节点
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostText: {
      // 先递归遍历他们的子节点，处理他们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 在处理自己身上的副作用
      commitReconciliationEffects(finishedWork);
      return;
    }
    case HostComponent: {
      // 先递归遍历他们的子节点，处理他们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 在处理自己身上的副作用
      commitReconciliationEffects(finishedWork);

      // 处理DOM更新
      if (flags & Update) {
        const instance = finishedWork.stateNode;
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type;
          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;
          if (updatePayload) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork,
            );
          }
        }
      }
      return;
    }
    default:
      break;
  }
}
