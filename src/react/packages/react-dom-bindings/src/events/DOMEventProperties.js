import {registerTwoPhaseEvent} from "./EventRegistry";

const simpleEventPluginEvents = ["click"];
// {'click': 'onClick'}
export const topLevelEventsToReactNames = new Map();

/**
 * 注册单个事件
 * @param domEventName 原生事件名 click
 * @param reactName react事件名 onClick
 */
function registerSimpleEvent(domEventName, reactName) {
  topLevelEventsToReactNames.set(domEventName, reactName);
  //   {
  //     onBlur: ['blur'],
  //     onClick: ['click'],
  //     onClickCapture: ['click'],
  //     onChange: ['blur', 'change', 'click', 'focus', 'input', 'keydown', 'keyup', 'selectionchange'],
  //     onMouseEnter: ['mouseout', 'mouseover'],
  //     onMouseLeave: ['mouseout', 'mouseover'],
  // }
  //  因为部分事件的映射有多个，所以用数组
  registerTwoPhaseEvent(reactName, [domEventName]);
}

/**
 * 遍历每个定义的事件
 */
export function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    const domEventName = eventName.toLowerCase();
    // 将事件首字母大写
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1);
    // 拼接事件 on + Click = onClick
    registerSimpleEvent(domEventName, `on${capitalizeEvent}`);
  }
}
