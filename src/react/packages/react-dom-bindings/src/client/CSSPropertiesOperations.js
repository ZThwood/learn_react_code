export function setValueForStyles(node, styles) {
  /** dom节点上的style属性 */
  const {style} = node;
  for (const styleName in styles) {
    if (styles.hasOwnProperty(styleName)) {
      const styleValue = styles[styleName];
      style[styleName] = styleValue;
    }
  }
}
