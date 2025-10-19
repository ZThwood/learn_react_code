import {getFiberCurrentPropsFromNode} from "react-dom-bindings/src/client/ReactDOMComponentTree";

export default function getListener(inst, registrationName) {
  const {stateNode} = inst;
  if (stateNode === null) return null;
  // 获取真实dom上缓存的props信息，因为react事件存在props中， 比如onClick属性
  const props = getFiberCurrentPropsFromNode(stateNode);
  if (props === null) return null;
  const listener = props[registrationName];
  return listener;
}
