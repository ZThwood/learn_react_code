# 单节点diff

# 多节点diff

## DOM DIFF的规则

- 支队同级元素进行比较，不统计不对比
- 不同的类型对应不同的元素
- 可以通过key来标识同一个节点

1. 第一轮遍历

   - 如果key不通则直接结束本轮循环
   - new Children 或oldFiber 遍历完，结束本次循环
   - key相同而type不同，标记老的oldFiber为删除，继续循环
   - key相同，type也相同，则可以复用老oldFiber节点，继续循环

2. 第二轮遍历

   - 遍历完newChildren而oldFiber还有，剩下所有的oldFiber标记为删除，DIFF结束
   - oldFiber遍历完，而newChildren还有，将剩下的newChildren标记为插入，DIFF结束
   - newChildren和oldFiber都同时遍历完成，diff结束
   - newChildren和oldFiber都没有完成，则进行节点移动的逻辑

3. 第三轮遍历
   - 处理节点移动的情况
