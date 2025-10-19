import hasOwnProperty from "shared/hasOwnProperty";
import {REACT_ELEMENT_TYPE} from "shared/ReactSymbols";

/** 保留属性 */
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

/** 校验key属性是否合法,不为undefined即合法 */
function hasValidateKey(config) {
  return config.key !== undefined;
}

/** 校验ref属性是否合法,不为undefined即合法 */
function hasValidateRef(config) {
  return config.ref !== undefined;
}

// 生成react元素，也就是虚拟DOM
function ReactElement(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type, // div span
    key, // 唯一标识
    ref, // 获取真实元素
    props, // id children style 等
  };
}

/**
 * react17之前为createReactElement()
 * 在react17以前key放在config中，第三个参数放children
 * 在react17以后key放在第三个参数中，children放在config中
 * @param type 标签类型 - div span等
 * @param config 配置项
 * @returns {{ref, $$typeof: symbol, type, key, props}}
 */
export function jsxDEV(type, config, maybeKey) {
  let propName; // 属性名 - style class 等
  const props = {}; // 属性对象 - style class children等
  let key = null; // 每个虚拟DOM都一个可选的key属性，用来区分同一个父节点下的不同子节点
  let ref = null; // 可以获取真实DOM

  // Currently, key can be spread in as a prop. This causes a potential
  // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
  // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
  // but as an intermediary step, we will use jsxDEV for everything except
  // <div {...props} key="Hi" />, because we aren't currently able to tell if
  // key is explicitly declared to be undefined or not.
  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  // props中的key优先级比显示的使用key优先级高
  // if (hasValidateKey(config)) {
  //   key = "" + config.key;
  // }

  // 校验ref,获取ref
  if (hasValidateRef(config)) {
    ref = config.ref;
  }

  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  return ReactElement(type, key, ref, props);
}
