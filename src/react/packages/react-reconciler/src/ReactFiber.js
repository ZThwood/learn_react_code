import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";
import {NoFlags} from "./ReactFiberFlags";

// 每种虚拟DOM都会有自己Fiber Tag类型
function FiberNode(tag, pendingProps, key) {
  this.tag = tag; // fiber的标签，根据ReactElement的type进行生成,共有25种tag：根元素 - 3，函数组件 - 0
  this.key = key; // 唯一标识，和ReactElement组件的key一致
  this.elementType; // 一般来讲和ReactElement的key一致
  // fiber类型，来自于虚拟DOM的type，一般和fiber.elementType一致(dev环境又特殊处理).
  // 原生组件：div、span...
  // 函数组件：函数本身
  this.type = null;
  // fiber对应的真实DOM节点，根节点fiber.stateNode指向的是FiberRoot; class 类型节点其stateNode指向的是 class 实例
  this.stateNode = null;

  this.return = null; // 指向父节点
  this.child = null; // 指向 第一个 子节点
  this.sibling = null; // 指向下一个兄弟节点
  this.index = 0; // fiber在兄弟节点中的索引，如果是单节点默认为0

  this.ref = null; // 指向在ReactElement组件上设置的ref

  // 等待生效的属性， 从ReactElement对象传入的 props，用于和fiber.memoizedProps比较可以得出属性是否变动.
  this.pendingProps = pendingProps;
  // 生成子节点时的属性, 生成子节点之后保持在内存中. 在生成子节点前叫做pendingProps, 生成子节点后会把pendingProps赋值给memoizedProps用于下一次比较.
  this.memoizedProps = null;
  // 存储update更新对象的队列, 每一次发起更新（比如三种触发更新的方法）, 都需要在该队列上创建一个update对象.
  this.updateQueue = null;
  // 每个fiber节点都有自己的状态，每种fiber 状态存的类型是不一样的
  // 类组件的fiber存的是类的实例状态，hostRoot存的是要渲染的元素
  this.memoizedState = null; // 上一次生成子节点之后保持在内存中的局部状态，不同类型的组件存的内容不同.
  this.dependencies = null; // 该 fiber 节点所依赖的(contexts, events)等
  // 二进制位 Bit field,继承自父节点,影响本 fiber 节点及其子树中所有节点. 与 react 应用的运行模式有关(有 ConcurrentMode, BlockingMode, NoMode 等选项).
  // this.mode = mode;

  // fiber自身副作用标识，在ReactFiberFlags.js中定义了所有的标志位.18.2以前会收集effects，18.2以后删除了这个机制
  this.flags = NoFlags;
  // 子节点的副作用标识，性能优化字段，如果这个字段是0，那么标识子节点没有副作用，就不需要处理子节点的副作用了
  this.subtreeFlags = NoFlags;
  this.deletions = null; // 存储将要被删除的子节点.
  // 本 fiber 节点所属的优先级, 创建 fiber 的时候设置.
  // this.lanes = NoLanes;
  // this.childLanes = NoLanes; // 子节点所属的优先级

  // 双缓存的替身，指向内存中的另一个 fiber, 每个被更新过 fiber 节点在内存中都是成对出现(current 和 workInProgress)
  this.alternate = null;
}

/**
 * 创建一个fiber节点
 * @param {*} tag 每种不同的虚拟DOM都会有不同的tag标记（函数组件 类组件 原生组件 根元素）
 * @param {*} pendingProps 新的属性，等待处理的属性
 * @param {*} key 唯一标识，比如写循环的时候我们传入的key
 * @returns 一个fiber节点
 */
function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}

/**
 * 创建根Fiber节点
 * @returns 返回根fiber节点
 */
export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}

/**
 * 基于当前fiber或新的属性创建新的fiber
 * 1、current和workingInProcess不是一个对象
 * 2、workingInProgress 有两种情况
 *  2.1、没有创建一个新的对象，通过alternate相互引用
 *  2.2、存在alternate，直接复用老的alternate
 * 3、复用的两侧含义
 *  3.1、复用老的fiber
 *  3.2、复用老的DOM
 * @param {*} current 当前fiber
 * @param {*} pendingProps 新属性
 * @returns
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate; // 获取轮替
  if (workInProgress === null) {
    // 创建新fiber
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 更新fiber
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;

  return workInProgress;
}

/**
 * 根据虚拟DOM创建Fiber节点
 * @param element 虚拟DOM
 * @returns fiber
 */
export function createFiberFromElement(element) {
  const {type, key, props: pendingProps} = element;
  return createFiberFromTypeAndProps(type, key, pendingProps);
}

/**
 * 根据虚拟DOM的Type和Props创建fiber
 * @param {*} type fiber的类型
 * @param {*} key 唯一属性
 * @param {*} pendingProps 新的props
 * @returns fiber
 */
function createFiberFromTypeAndProps(type, key, pendingProps) {
  // 初始为不确定的tag
  let tag = IndeterminateComponent;
  if (typeof type === "string") {
    // span div的fiber类型是原生组件（标签）
    tag = HostComponent;
  }
  // 创建fiber
  const fiber = createFiber(tag, pendingProps, key);
  fiber.type = type;
  return fiber;
}

export function createFiberFromText(content) {
  const fiber = createFiber(HostText, content, null);
  return fiber;
}
