// 获取DOM元素
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const saveSettingsBtn = document.getElementById('saveSettings');
const maxGreetsInput = document.getElementById('maxGreets');
const maxGreetsDisplay = document.getElementById('maxGreetsDisplay');
const progressBar = document.querySelector('.progress-bar-inner');
const progressCount = document.getElementById('progressCount');
const progressSection = document.querySelector('.progress');

// 默认设置
const DEFAULT_MAX_GREETS = 100;

// 保存设置到chrome.storage
function saveSettings() {
  const maxGreets = parseInt(maxGreetsInput.value) || DEFAULT_MAX_GREETS;
  if (maxGreets < 1 || maxGreets > 500) {
    alert('请输入1-500之间的数字！');
    maxGreetsInput.value = DEFAULT_MAX_GREETS;
    return;
  }
  
  chrome.storage.sync.set({
    maxGreets: maxGreets
  }, () => {
    maxGreetsDisplay.textContent = maxGreets;
    alert('设置已保存！');
  });
}

// 加载设置
function loadSettings() {
  chrome.storage.sync.get({
    maxGreets: DEFAULT_MAX_GREETS
  }, (items) => {
    maxGreetsInput.value = items.maxGreets;
    maxGreetsDisplay.textContent = items.maxGreets;
  });
}

// 更新进度显示
function updateProgress(count, total) {
  const percent = (count / total) * 100;
  progressBar.style.width = `${percent}%`;
  progressCount.textContent = count;
  progressSection.classList.add('active');
}

// 重置进度
function resetProgress() {
  if (confirm('确定要重置进度吗？这将清除所有已打招呼的记录。')) {
    chrome.storage.sync.remove(['greetedIds', 'currentCount'], () => {
      progressBar.style.width = '0%';
      progressCount.textContent = '0';
      progressSection.classList.remove('active');
      startBtn.textContent = '开始自动打招呼';
      startBtn.dataset.action = 'start';
      alert('进度已重置！');
    });
  }
}

// 开始或停止自动打招呼
function toggleAutoGreet() {
  const action = startBtn.dataset.action;
  
  if (action === 'start') {
    // 开始自动打招呼
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab.url.includes('zhipin.com')) {
        alert('请先打开BOSS直聘网站！');
        return;
      }
      
      chrome.storage.sync.get(['maxGreets'], (items) => {
        const maxGreets = items.maxGreets || DEFAULT_MAX_GREETS;
        
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'startAutoGreet',
          maxGreets: maxGreets
        });
        
        startBtn.textContent = '停止自动打招呼';
        startBtn.dataset.action = 'stop';
        progressSection.classList.add('active');
      });
    });
  } else {
    // 停止自动打招呼
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopAutoGreet'});
      startBtn.textContent = '开始自动打招呼';
      startBtn.dataset.action = 'start';
    });
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateProgress') {
    updateProgress(request.count, request.total);
  } else if (request.action === 'greetingComplete') {
    startBtn.textContent = '开始自动打招呼';
    startBtn.dataset.action = 'start';
    alert('打招呼任务已完成！');
  }
});

// 绑定事件监听器
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  startBtn.addEventListener('click', toggleAutoGreet);
  resetBtn.addEventListener('click', resetProgress);
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // 加载当前进度
  chrome.storage.sync.get(['currentCount', 'maxGreets'], (items) => {
    if (items.currentCount > 0) {
      updateProgress(items.currentCount, items.maxGreets || DEFAULT_MAX_GREETS);
    }
  });
});

// 错误处理
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Popup Error:', {message, source, lineno, colno, error});
  alert('发生错误，请刷新页面重试！');
  return true;
};