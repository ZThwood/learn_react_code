import {allNativeEvents} from "./EventRegistry";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import {IS_CAPTURE_PHASE} from "./EventSystemFlags";
import {createEventListenerWrapperWithPriority} from "./ReactDOMEventListener";
import {addEventCaptureListener, addEventBubbleListener} from "./EventListener";
import {getEventTarget} from "./getEventTarget";
import {HostComponent} from "react-reconcile/src/ReactWorkTags";
import getListener from "./getListener";

/** 初始化调用收集事件名称 */
SimpleEventPlugin.registerEvents();

/**
 * 收集事件
 * @param {*} dispatchQueue 事件的派发队列
 * @param {*} domEventName 原生事件名称，如：click
 * @param {*} targetInst 当前节点的fiber
 * @param {*} nativeEvent 原生事件
 * @param {*} nativeEventTarget 事件源的真实dom
 * @param {*} eventSystemFlags 事件的标志：0 - 冒泡， 4 - 捕获
 * @param {*} targetContainer 根容器
 */
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer,
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer,
  );
}

/**
 * 执行派发事件
 * @param {*} listener 用户传入的回调函数
 * @param {*} event 合成的事件源对象
 * @param {*} currentTarget
 */
function executeDispatch(listener, event, currentTarget) {
  // nativeEventTarget 是原始事件源，不是变的（点击的那个元素）
  // currentTarget随着事件执行不断变化的
  event.currentTarget = currentTarget;
  // 最终执行回调函数;
  listener(event);
}

/**
 * 按照顺序派发每一个事件
 * @param {*} event 合成的事件源对象
 * @param {*} dispatchListeners 事件监听函数数组
 * @param {*} inCapturePhase 是否在捕获阶段
 * @returns
 */
function processDispatchQueueItemsInOrder(
  event,
  dispatchListeners,
  inCapturePhase,
) {
  // 捕获阶段，数组倒着执行，因为是从事件源开始收集的
  if (inCapturePhase) {
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const {listener, currentTarget} = dispatchListeners[i];
      // 目标函数肯定会执行一次，在监听函数中设置阻止冒泡，他的下一个监听函数就不会在执行了
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(listener, event, currentTarget);
    }
  } else {
    // 冒泡阶段数组从头开始以此执行
    for (let i = 0; i < dispatchListeners.length; i++) {
      const {listener, currentTarget} = dispatchListeners[i];
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(listener, event, currentTarget);
    }
  }
}

/**
 * 处理派发事件队列
 * @param {*} dispatchQueue 事件队列[{event, listeners}]
 * @param {*} eventSystemFlags 事件的标志：0 - 冒泡， 4 - 捕获
 */
function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  for (let i = 0; i < dispatchQueue.length; i++) {
    const {event, listeners} = dispatchQueue[i];
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase);
  }
}

/**
 * 提取 & 派发事件
 * @param {*} domEventName 原生事件名称，如：click
 * @param {*} eventSystemFlags 事件的标志：0 - 冒泡， 4 - 捕获
 * @param {*} nativeEvent 原生事件
 * @param {*} targetInst 当前节点的fiber
 * @param {*} targetContainer 根容器
 */
function dispatchEventsForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer,
) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue = [];
  // 1、提取合成事件
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer,
  );
  // 2、执行合成事件
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}

const listeningMarker = `_reactListening` + Math.random().toString(36).slice(2);

/**
 * 初始化创建完Root节点后调用
 * @param {*} rootContainerElement 根容器
 */
export function listenToAllSupportedEvents(rootContainerElement) {
  // 只监听一遍
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
    // 遍历原生事件，比如click、resize、mousedown 。。。
    // 时间集合：allNativeEvents = new Set('click', 'resize', 'mousedown')
    allNativeEvents.forEach((domEventName) => {
      listenToNativeEvent(domEventName, true, rootContainerElement); // 捕获
      listenToNativeEvent(domEventName, false, rootContainerElement); // 冒泡
    }); 
  }
}

/**
 * 收集事件监听器
 * @param {*} targetContainer 根容器
 * @param {*} domEventName 原生事件名称，如：click
 * @param {*} eventSystemFlags 事件的标志：0 - 冒泡， 4 - 捕获
 * @param {*} isCapturePhaseListener 是否为捕获阶段
 */
function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener,
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags,
  );

  // 将处理好的listener函数绑定到root上
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}

/**
 * 监听原生事件，区分捕获和冒泡
 * @param {*} domEventName 原生事件名称，如：click
 * @param {*} isCapturePhaseListener 是否为捕获阶段
 * @param {*} target 根容器 root
 */
export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  target,
) {
  let eventSystemFlags = 0;
  if (isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener,
  );
}

/**
 * 派发事件
 * @param {*} domEventName 原生事件名称，如：click
 * @param {*} eventSystemFlags 事件的标志：0 - 冒泡， 4 - 捕获
 * @param {*} nativeEvent 原生事件
 * @param {*} targetInst 当前节点的fiber
 * @param {*} targetContainer root容器
 */
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer,
) {
  dispatchEventsForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer,
  );
}

/**
 * 创建派发的listener
 * @param {*} instance dom节点对应的fiber实例
 * @param {*} listener 自定义的事件监听函数
 * @param {*} currentTarget 当前节点的真实DOM
 * @returns {fiber, 事件会掉函数，当前DOM节点}
 */
function createDispatchListener(instance, listener, currentTarget) {
  return {
    instance,
    listener,
    currentTarget,
  };
}

/**
 * 获取捕获 或 冒泡阶段的listener
 * 捕获阶段的处理会调用一次
 * 冒泡节点的处理会调用一次
 * @param {*} targetFiber 事件源的fiber
 * @param {*} reactName react的时间名称 onClick
 * @param {*} nativeEventType 原生的事件类型
 * @param {*} isCapturePhase 是否为捕获阶段
 * @returns listeners的数组 [{instance, listener, stateNode},....] 从事件源到root的所有onClick回调函数
 */
export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase,
) {
  const captureName = reactName + "Capture";
  const reactEventName = isCapturePhase ? captureName : reactName;
  const listeners = [];
  let instance = targetFiber;
  // 从事件源向上遍历，获取每个dom上绑定的事件
  while (instance !== null) {
    // stateNode 真实DOM节点
    const {stateNode, tag} = instance;
    // HostComponent 原生标签
    if (tag === HostComponent && stateNode !== null) {
      // 获取props中的事件名称对应的函数 <div onClick={() => 1}>
      const listener = getListener(instance, reactEventName);
      if (listener) {
        listeners.push(createDispatchListener(instance, listener, stateNode));
      }
    }
    instance = instance.return;
  }
  return listeners;
}
