// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';

// 调试组件
function DebugApp() {
    const [count, setCount] = React.useState(0);
    const [text, setText] = React.useState('hello');

    React.useEffect(() => {
        console.log('🎯 useEffect 执行，count:', count);
        return () => {
            console.log('🧹 useEffect 清理，count:', count);
        };
    }, [count]);

    const handleClick = () => {
        console.log('🖱️ 按钮点击，准备更新状态');
        setCount(prev => {
            const newCount = prev + 1;
            console.log('🔄 状态更新:', prev, '→', newCount);
            return newCount;
        });
    };

    console.log('🎨 组件渲染，count:', count);

    return (
        <div style={{ padding: '20px' }}>
            <h1>React 源码调试</h1>
            <p>Count: {count}</p>
            <p>Text: {text}</p>
            <button onClick={handleClick}>增加 Count</button>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="输入文本..." />
        </div>
    );
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DebugApp />);

console.log('🚀 React 应用已启动');
