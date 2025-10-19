import { createContainer, updateContainer } from '../../../react-reconciler/src/ReactFiberReconciler';
import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';

/**
 * 定义react的根节点对象
 * @param {FiberRootNode} {_internalRoot = {containerInfo: div#root}} 一个真实的dom节点
 */
function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
}

/**
 * 定义react的render方法
 * @param {*} children
 */
ReactDOMRoot.prototype.render = function (children) {
    const root = this._internalRoot;
    root.containerInfo.innerHTML = ''; // 更新容器前清空根节点下的内容
    updateContainer(children, root); // 更新容器
};

/**
 * 创建跟容器
 * @param {*} container 根节点真实DOM div#root
 * @returns FiberRootNode
 */
export function createRoot(container) {
    const root = createContainer(container); // FiberRootNode root = {containerInfo: div#root} 一个真实的dom节点
    // 创建完真实的Root节点后，开始代理事件
    // eslint-disable-next-line no-debugger
    debugger;
    listenToAllSupportedEvents(container);
    return new ReactDOMRoot(root);
}
