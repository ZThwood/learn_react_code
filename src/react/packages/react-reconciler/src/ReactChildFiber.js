import {REACT_ELEMENT_TYPE} from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import {Placement, ChildDeletion} from "react-reconcile/src/ReactFiberFlags";
import isArray from "shared/isArray";

/**
 * 创建子组件的协调器
 * @param shouldTrackSideEffects 是否跟踪副作用
 */
function createChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return;
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  /**
   * 更新fiber
   * @param {*} current
   * @param {*} pendingProps
   * @returns
   */
  function useFiber(current, pendingProps) {
    const clone = createWorkInProgress(current, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  /**
   * 删除currentFirstFiber以及之后的所有的fiber节点
   * @param {*} returnFiber
   * @param {*} currentFirstFiber
   * @returns
   */
  function deleteRemainingChild(returnFiber, currentFirstFiber) {
    if (!shouldTrackSideEffects) return;
    let childToDelete = currentFirstFiber;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  /**
   * 协调单个节点(只有一个节点的情况)
   * 使用当前的fiber和新的VDOM进行对比，因为如果fiber可以复用的情况下就不需要在创建fiber
   * @param {*} returnFiber 新的父fiber
   * @param {*} currentFirstFiber 当前fiber的第一个子fiber， 初次挂在是null
   * @param {*} element 新fiber的子ReactElement
   * @returns 新创建的子fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
    // DOM diff
    // 因为都是同一个节点的子节点，所如果key相同就是同一个节点
    // debugger;
    const key = element.key; // VDOM的可以
    let child = currentFirstFiber;
    while (child !== null) {
      // 当前fiber对应的key和新的VDOM对象的key是否一样
      if (child.key === key) {
        // 当前fiber 的type和 新VDOM的的类型是否相同，相同则可复用当前节点，然后删除多余的节点
        if (child.type === element.type) {
          deleteRemainingChild(returnFiber, child.sibling);
          // key 和type都一样 - 可复用
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        } else {
          // key相同，但是type不同，删除多余的节点
          deleteRemainingChild(returnFiber, child);
          break;
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }
    // 初次渲染直接创建
    // 根据虚拟DOM创建fiber
    const create = createFiberFromElement(element);
    // 将创建好的fiber节点的return指向父fiber
    create.return = returnFiber;
    return create;
  }

  /**
   * 单个子节点 - 设置副作用
   * @param newFiber
   * @returns {*} fiber
   */
  function placeSingleChild(newFiber) {
    // 说明要添加副作用
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      // 要在最后提交阶段插入此节点 React渲染分成渲染（创建fiber树）和提交（更新真实DOM）两个阶段
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  /**
   * 根据不同类型的虚拟DOM创建不同类型的fiber
   * @param {*} returnFiber 父fiber
   * @param {*} newChild 子虚拟DOM
   * @returns {*} 子fiber
   */
  function createChild(returnFiber, newChild) {
    // 如果是文本类型
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      created.return = returnFiber;
      return created;
    }
    // 如果使react元素类型
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          created.return = returnFiber;
          return created;
        }
        default:
          break;
      }
    }
  }

  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    // 如果有alternate说明是一个更新的节点，否则是一个新节点
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }

  function updateElement(returnFiber, current, element) {
    const elementType = element.type;
    if (current !== null) {
      // 如果类型和key都相同，则便是可以复用fiber和真实DOM
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        return existing;
      }
    }
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }

  /**
   *
   * @param {*} returnFiber
   * @param {*} oldFiber
   * @param {*} newChild
   * @returns
   */
  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (newChild !== null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (key === newChild.key) {
            return updateElement(returnFiber, oldFiber, newChild);
          }
          return null;
        }
        default:
          return null;
      }
    }
    return null;
  }

  /**
   * 将剩下的老节点全部放入到映射中
   * @param {*} returnFiber
   * @param {*} currentFirstChild
   * @returns
   */
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    // 处理文本节点
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild);
    }

    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key,
            ) || null;
          return updateElement(returnFiber, matchedFiber, newChild);
        }
      }
    }
  }

  /**
   * 多个子fiber，比较子fiber DOM-DIFF 就是用当前的子fiber链表和新的虚拟DOM进行比较
   * 将兄弟节点用sibling连接
   * @param {*} returnFiber 新的Fiber
   * @param {*} currentFirstFiber 当前的fiber的第一个子fiber
   * @param {*} newChildren 新fiber的虚拟DOM
   * @returns {*} fiber链表
   */
  function reconcileChildrenArray(returnFiber, currentFirstFiber, newChildren) {
    let resultingFirstChild = null; // 第一个新儿子
    let previousNewFiber = null; // 记录上一个fiber，目的是与下一个sibling连接
    let newIdx = 0; // 新的虚拟DOM索引
    let oldFiber = currentFirstFiber; // 第一个老Fiber
    let nextOldFiber = null; // 记录下一个fiber
    let lastPlacedIndex = 0;

    // 开始第一轮循环
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      // 暂存下一个老fiber
      nextOldFiber = oldFiber.sibling;
      // 试图更新或者复用老fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      if (newFiber === null) {
        break;
      }
      if (shouldTrackSideEffects) {
        // 有老fiber， 但心fiber没有复用老fiber和老的真实DOM，删除老fiber，在提交阶段会删除真实DOM
        if (oldFiber && oldFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        } else {
          returnFiber.flags |= Placement | ChildDeletion;
        }
      }
      // 指定新fiber的位置
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // 新的虚拟DOM遍历完了，但是新的虚拟DOM还没有遍历完
    // 说明新的虚拟DOM比老的虚拟DOM多，需要新增fiber
    if (newIdx === newChildren.length) {
      // 删除剩下的老fiber
      deleteRemainingChild(returnFiber, oldFiber);
    }

    if (oldFiber === null) {
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) continue; // 如果不是文本节点，也不是react元素跳过
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          // 如果没有previousNewFiber说明是第一个fiber(大儿子)
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }
    // 开始处理节点移动的情况
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    // 开始遍历剩下的虚拟DOM
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx],
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          existingChildren.delete(
            newFiber.key === null ? newIdx : newFiber.key,
          );
        }
        // 指定新fiber存放的位置
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          // 处理大儿子
          resultingFirstChild = newFiber;
        } else {
          // 处理其他儿子
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 全部处理完成，删除剩下的老fiber
    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }
    return resultingFirstChild;
  }

  /**
   * 比较子Fibers - DOM-DIFF 用当前的子fiber链表和新的子fiber进行对比
   * @param returnFiber 新的Fiber
   * @param currentFirstFiber 当前fiber第一个子fiber
   * @param newChild 新fiber的子虚拟DOM
   */
  function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstFiber, newChild),
          );
        default:
          break;
      }
      // 子节点不止一个
      if (isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFirstFiber, newChild);
      }
    }
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      return null;
    }
    return null;
  }
  return reconcileChildFibers;
}

// 当前有挂载的fiber，更新
export const reconcileChildFibers = createChildReconciler(true);

// 当前没有已挂载fiber，初次挂载
export const mountChildFibers = createChildReconciler(false);
