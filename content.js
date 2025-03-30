/**
 * 我来直聘 - BOSS直聘自动打招呼插件
 * @author 叶俊宇 <ye1026789747@Gmail.com>
 * @copyright 2025 叶俊宇
 * @license MIT
 */

// 全局变量
let greetCount = 0;
let MAX_GREETS = 500; // 默认值
let isRunning = false;
let visitedJobCards = new Set(); // 存储已访问的职位ID
let currentJobId = null; // 当前正在处理的职位ID

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 随机延迟，避免被检测
const randomDelay = async () => {
    const time = Math.random() * 1000 + 500; // 500-1500毫秒随机延迟
    await delay(time);
};

// 保存当前进度到存储
function saveProgress() {
    chrome.storage.local.set({
        greetCount: greetCount,
        isRunning: isRunning,
        visitedJobCards: Array.from(visitedJobCards),
        lastUpdateTime: new Date().getTime()
    }, () => {
        console.log('进度已保存，已完成:', greetCount);
    });
}

// 从存储加载进度
async function loadProgress() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['greetCount', 'isRunning', 'visitedJobCards', 'lastUpdateTime', 'maxGreets'], (result) => {
            if (result.maxGreets) {
                MAX_GREETS = result.maxGreets;
            }
            if (result.greetCount !== undefined) {
                greetCount = result.greetCount;
                isRunning = result.isRunning || false;
                visitedJobCards = new Set(result.visitedJobCards || []);
                
                console.log('已加载进度:', greetCount, '运行状态:', isRunning);
                resolve(true);
            } else {
                console.log('没有找到保存的进度');
                resolve(false);
            }
        });
    });
}

// 滚动到元素位置
async function scrollToElement(element) {
    if (!element) return;
    
    try {
        const rect = element.getBoundingClientRect();
        const scrollY = rect.top + window.scrollY - 200; // 向上偏移200px，使元素在视窗中间偏上位置
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
        await delay(500); // 等待滚动完成
    } catch (error) {
        console.error('滚动到元素位置时出错:', error);
    }
}

// 提取职位ID
function extractJobId(element) {
    try {
        // 尝试从卡片元素中提取职位ID
        const jobLink = element.querySelector('a.job-name');
        if (jobLink) {
            const href = jobLink.getAttribute('href');
            const match = href.match(/\/job_detail\/([^.]+)\.html/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // 如果上面的方法失败，尝试从元素的数据属性或其他特征提取
        const uniqueId = element.getAttribute('data-id') || 
                          element.getAttribute('data-jobid') ||
                          element.getAttribute('data-ka') || 
                          Math.random().toString(36).substring(2, 15);
        
        return uniqueId;
    } catch (error) {
        console.error('提取职位ID时出错:', error);
        return 'unknown-' + Math.random().toString(36).substring(2, 15);
    }
}

// 检查是否是打招呼按钮
function isChatButton(button) {
    if (!button) return false;
    
    const text = button.textContent.trim().toLowerCase();
    return text.includes('打招呼') || text.includes('立即沟通');
}

// 点击打招呼按钮
async function clickChatButton() {
    try {
        // 等待页面加载完成
        await delay(1000);
        
        // 查找打招呼按钮
        const buttons = document.querySelectorAll('button');
        let chatButton = null;
        
        for (const button of buttons) {
            if (isChatButton(button)) {
                chatButton = button;
                break;
            }
        }
        
        if (!chatButton) {
            console.log('没有找到打招呼按钮');
            return false;
        }
        
        // 检查按钮是否可点击
        if (chatButton.disabled || chatButton.classList.contains('disabled')) {
            console.log('打招呼按钮不可点击');
            return false;
        }
        
        // 滚动到按钮位置
        await scrollToElement(chatButton);
        await delay(300);
        
        // 点击按钮
        chatButton.click();
        console.log('已点击打招呼按钮');
        
        // 等待弹窗出现
        await delay(1000);
        
        // 增加计数并保存进度
        greetCount++;
        saveProgress();
        
        // 发送进度更新消息
        chrome.runtime.sendMessage({
            type: 'progress',
            count: greetCount
        });
        
        return true;
    } catch (error) {
        console.error('点击打招呼按钮时出错:', error);
        return false;
    }
}

// 点击留在当前页面按钮
async function clickStayButton() {
    try {
        // 等待弹窗出现
        await delay(1000);
        
        // 查找"留在当前页面"按钮
        const buttons = document.querySelectorAll('button');
        let stayButton = null;
        
        for (const button of buttons) {
            const text = button.textContent.trim();
            if (text.includes('留在当前页面')) {
                stayButton = button;
                break;
            }
        }
        
        if (!stayButton) {
            console.log('没有找到"留在当前页面"按钮');
            return false;
        }
        
        // 点击按钮
        stayButton.click();
        console.log('已点击"留在当前页面"按钮');
        
        return true;
    } catch (error) {
        console.error('点击"留在当前页面"按钮时出错:', error);
        return false;
    }
}

// 返回职位列表
async function backToJobList() {
    try {
        // 查找返回按钮
        const backButton = document.querySelector('.back');
        if (backButton) {
            backButton.click();
            console.log('已点击返回按钮');
            await delay(1000);
            return true;
        }
        
        // 如果没有返回按钮，尝试浏览器后退
        window.history.back();
        console.log('使用浏览器后退');
        await delay(1000);
        
        return true;
    } catch (error) {
        console.error('返回职位列表时出错:', error);
        return false;
    }
}

// 主要功能：自动打招呼
async function autoGreet() {
    try {
        // 加载进度
        await loadProgress();
        
        // 检查是否已达到最大次数
        if (greetCount >= MAX_GREETS) {
            console.log('已达到最大打招呼次数:', MAX_GREETS);
            isRunning = false;
            saveProgress();
            chrome.runtime.sendMessage({
                type: 'complete',
                message: '已完成所有打招呼任务'
            });
            return;
        }
        
        // 检查是否在职位列表页面
        if (!document.querySelector('.job-list-box')) {
            console.log('不在职位列表页面，尝试返回');
            await backToJobList();
        }
        
        // 点击职位卡片
        const clicked = await clickJobCard();
        if (!clicked) {
            console.log('没有找到可点击的职位卡片，可能需要加载下一页');
            chrome.runtime.sendMessage({
                type: 'needNextPage',
                message: '当前页面已处理完成，请手动加载下一页'
            });
            return;
        }
        
        // 点击打招呼按钮
        await clickChatButton();
        
        // 点击留在当前页面
        await clickStayButton();
        
        // 返回职位列表
        await backToJobList();
        
        // 如果还在运行，继续下一个
        if (isRunning) {
            await randomDelay();
            autoGreet();
        }
    } catch (error) {
        console.error('自动打招呼过程中出错:', error);
        isRunning = false;
        saveProgress();
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('收到消息:', request);
    
    if (request.action === 'start' || request.action === 'resume') {
        isRunning = true;
        saveProgress();
        autoGreet();
        sendResponse({status: 'started'});
    }
    else if (request.action === 'stop') {
        isRunning = false;
        saveProgress();
        sendResponse({status: 'stopped'});
    }
    else if (request.action === 'reset') {
        greetCount = 0;
        isRunning = false;
        visitedJobCards.clear();
        saveProgress();
        sendResponse({status: 'reset'});
    }
    else if (request.action === 'getProgress') {
        sendResponse({
            count: greetCount,
            isRunning: isRunning
        });
    }
    else if (request.action === 'updateMaxGreets') {
        MAX_GREETS = request.maxGreets;
        sendResponse({status: 'updated'});
    }
    
    return true;
});