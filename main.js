import { invoke } from '@tauri-apps/api/core';

async function greet() {
  const input = document.getElementById('greet-input');
  const msg = document.getElementById('greet-msg');
  
  if (input.value.trim() === '') {
    alert('请输入您的名字');
    return;
  }
  
  try {
    const message = await invoke('greet', { name: input.value });
    msg.textContent = message;
    msg.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    alert('调用失败: ' + error);
  }
}

// 允许 Enter 键触发
document.getElementById('greet-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    greet();
  }
});

