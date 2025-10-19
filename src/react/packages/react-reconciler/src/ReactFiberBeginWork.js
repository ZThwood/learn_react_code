import logger, {indent} from "shared/logger";
import {
  HostRoot,
  HostComponent,
  HostText,
  IndeterminateComponent,
  FunctionComponent,
} from "react-reconcile/src/ReactWorkTags";
import {processUpdateQueue} from "./ReactFiberClassUpdateQueue";
import {
  mountChildFibers,
  reconcileChildFibers,
} from "react-reconcile/src/ReactChildFiber";
import {renderWithHooks} from "./ReactFiberHooks";
import {shouldSetTextContent} from "react-dom-bindings/src/client/ReactDOMHostConfig";

/**
 * 根据新的虚拟DOM生成新的fiber链表
 * @param current 当前的父fiber
 * @param workInProgress 新的父fiber
 * @param nextChildren 新的子ReactElement
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果没有当前的fiber，说明此fiber是新创建的，他的所有子fiber都是新创建的
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 如果有,当前的fiber需要做DOM-DIFF，拿当前的子fiber和新的DOM进行比较，最小化更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
    );
  }
}
/**
 * 处理根节点的fiber树构建
 * @param {*} current 当前的fiber
 * @param {*} workInProgress 新的fiber
 * @returns 第一个子节点的fiber
 */
function updateHostRoot(current, workInProgress) {
  // 需要知道根节点的子ReactElement update.payload = {element} -> workInProgress.memoizedState={element}
  processUpdateQueue(workInProgress); // workInProgress.memoizedState={element}
  const nextState = workInProgress.memoizedState;
  // 根节点的子ReactElement
  const nextChildren = nextState.element;
  // DOM-DIFF算法，根据根节点的子ReactElement 生成子fiber链表
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 处理函数组件
 * @param current 当前fiber
 * @param workInProgress 新fiber
 * @param Component 组件类型，函数组件就是函数本身
 */
function mountIndeterminateComponent(current, workInProgress, Component) {
  const props = workInProgress.pendingProps;
  // react元素
  const value = renderWithHooks(current, workInProgress, Component, props);
  workInProgress.tag = FunctionComponent;
  // 处理完成后变为fiber
  reconcileChildren(current, workInProgress, value);
  return workInProgress.child;
}

export function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
) {
  // react元素
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
  );
  // 处理完成后变为fiber
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 构建原生组件的子fiber链表
 * @param current 当前的fiber
 * @param workInProgress 新fiber
 */
function updateHostComponent(current, workInProgress) {
  const {type} = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children; // 子虚拟DOM
  // 如果子节点是一个文本节点, 优化处理
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  if (isDirectTextChild) {
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 根据虚拟DOM构建新的fiber链表
 * @param current 当前fiber
 * @param workInProgress 新fiber
 * @returns {null} 返回当前fiber的子节点，没有返回null
 */
export function beginWork(current, workInProgress) {
  logger(" ".repeat(indent.number) + "beginWork", workInProgress);
  indent.number += 2;
  switch (workInProgress.tag) {
    // 组件有两种，一种是类组件一种是函数组件，但是他们都是函数
    // 在区分两种组件之前用IndeterminateComponent代表
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
      );
    case FunctionComponent: {
      const Component = workInProgress.type;
      const nextProps = workInProgress.pendingProps;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        nextProps,
      );
    }
    case HostRoot: // 根fiber
      return updateHostRoot(current, workInProgress);
    case HostComponent: // 原生组件 - div
      return updateHostComponent(current, workInProgress);
    case HostText: // 文本节点一定是没有子节点的
      return null;
    default:
      return null;
  }
}
