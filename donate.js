// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面元素
    initializePage();
    
    // 添加事件监听器
    addEventListeners();
});

// 初始化页面元素
function initializePage() {
    // 检查是否已经赞赏过
    chrome.storage.sync.get(['hasDonated'], function(result) {
        if (result.hasDonated) {
            showThankYouMessage();
        }
    });
}

// 添加事件监听器
function addEventListeners() {
    // 监听赞赏二维码点击事件
    const qrImages = document.querySelectorAll('.qr-item img');
    qrImages.forEach(img => {
        img.addEventListener('click', function() {
            // 放大显示二维码
            showEnlargedQR(this.src);
        });
    });
}

// 显示放大的二维码
function showEnlargedQR(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = `
        max-width: 80%;
        max-height: 80%;
        border-radius: 10px;
    `;
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
}

// 显示感谢信息
function showThankYouMessage() {
    const thankYouDiv = document.querySelector('.thank-you');
    if (thankYouDiv) {
        thankYouDiv.innerHTML = `
            <h3>感谢您的支持！</h3>
            <p>您已经赞赏过我们了，再次感谢您的支持！</p>
        `;
    }
}