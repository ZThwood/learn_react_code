import * as ReactWorkTags from 'react-reconcile/src/ReactWorkTags';
const ReactWorkTagMap = new Map();
for (let tag in ReactWorkTags) {
  ReactWorkTagMap.set(ReactWorkTags[tag], tag);
}
export default function (prefix, workInProgress) {
  let tagValue = workInProgress.tag;
  let tagName = ReactWorkTagMap.get(tagValue);
  let str = `${tagName}`;
  if (tagName === 'HostComponent') {
    str += ` ${workInProgress.type}`;
  } else if (tagName === 'HostText') {
    str += ` ${workInProgress.pendingProps}`;
  }
  console.log(`${prefix} ${str}`);
}

let indent = {number: 0};
export {indent};
