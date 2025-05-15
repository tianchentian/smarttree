// ==UserScript==
// @name         智慧树问答详情页与主页操作及粘贴解锁
// @namespace    https://github.com/tianchentian/smarttree
// @version      0.4
// @description  自动填充“我来回答”内容（仅详情页），并解锁“我来回答”和“提问”输入框的粘贴功能
// @author       tianchentian
// @match        https://qah5.zhihuishu.com/qa.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log("智慧树问答脚本已启动！ - v0.4");
    console.log("当前页面 URL (Current Page URL):", window.location.href);

    const answerButtonSelector = '.my-answer-btn.ZHIHUISHU_QZMD';
    const answerListSelector = 'ul.answer-list';
    const answerItemSelector = 'li.answer-li';
    const answerContentSelector = 'div.answer-content p';
    const answerDialogTextareaSelector = '.el-dialog__wrapper.dialog-question .el-dialog__body textarea.el-textarea__inner';
    const answerDialogWrapperSelector = '.el-dialog__wrapper.dialog-question';

    const askQuestionButtonSelector = 'div.ask-btn.ZHIHUISHU_QZMD';
    const askQuestionDialogTextareaSelector = '.questionDialog .el-dialog__body textarea.el-textarea__inner';
    const askQuestionDialogWrapperSelector = '.questionDialog .el-dialog__wrapper';

    const initialDialogAppearDelay = 250; // 对话框出现的初始延迟
    const pollInterval = 300;             // 轮询检查间隔
    const maxPollAttempts = 30;           // 最大轮询次数

    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function enablePasteOnTextarea(textareaElement) {
        if (!textareaElement) return;
        if (textareaElement.dataset.pasteUnlocked === 'true') {
            // console.log('Textarea 粘贴功能已解锁过:', textareaElement);
            return;
        }
        textareaElement.addEventListener('paste', function(event) {
            event.stopImmediatePropagation(); // 阻止其他粘贴事件处理程序运行
            console.log('粘贴事件已拦截，允许粘贴！(Paste event intercepted, allowing paste!) on:', event.target);
        }, true);
        textareaElement.dataset.pasteUnlocked = 'true';
        console.log('Textarea 粘贴功能已尝试解锁。(Paste functionality unlock attempted for):', textareaElement);
    }

    // 自动填充“我来回答”对话框的函数
    function fillAnswerInDialog() {
        const answerList = document.querySelector(answerListSelector);
        if (!answerList) {
            console.warn('未能找到答案列表 (answerListSelector)，可能不在问题详情页或列表未加载。自动填充取消。');
            return;
        }

        const answerItems = answerList.querySelectorAll(answerItemSelector);
        if (answerItems.length === 0) {
            console.warn('答案列表中没有找到可供选择的答案。');
            return;
        }

        const allAnswerTexts = Array.from(answerItems)
            .map(item => item.querySelector(answerContentSelector)?.textContent?.trim())
            .filter(Boolean);

        if (allAnswerTexts.length === 0) {
            console.warn('未能提取到有效的答案文本。');
            return;
        }

        const randomAnswerText = getRandomElement(allAnswerTexts);
        if (!randomAnswerText) {
            console.warn('无法选择随机答案。');
            return;
        }
        console.log('已选择随机答案:', randomAnswerText);

        const textarea = document.querySelector(answerDialogTextareaSelector);
        if (!textarea) {
            console.error('在填充答案时未能找到 "我来回答" Textarea。');
            return;
        }

        enablePasteOnTextarea(textarea);

        textarea.value = randomAnswerText;
        // 模拟 input 事件，以确保 Vue/React 等框架能检测到变化并更新UI（如字数统计）
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        textarea.dispatchEvent(inputEvent);
        console.log('"我来回答" Textarea 已填充。');

        const charCountElement = document.querySelector(`${answerDialogWrapperSelector} .area-num`);
        if (charCountElement) {
            charCountElement.textContent = `${randomAnswerText.length}/1000`;
        }
    }

    // 通用函数：等待指定的对话框和输入框出现，然后执行回调
    function waitForDialogTextarea(textareaSelector, dialogWrapperSelector, callback, attemptsLeft) {
        if (attemptsLeft <= 0) {
            console.error(`多次尝试后未找到对话框 Textarea。选择器: ${textareaSelector}, Wrapper: ${dialogWrapperSelector}`);
            return;
        }

        const textarea = document.querySelector(textareaSelector);
        const dialogWrapper = document.querySelector(dialogWrapperSelector);

        // 检查元素是否存在、可见 (offsetHeight > 0) 且对话框包装器也可见
        if (textarea && textarea.offsetHeight > 0 && dialogWrapper && dialogWrapper.style.display !== 'none') {
            console.log(`对话框 Textarea 已找到且可见: ${textareaSelector}`);
            callback(textarea); // 执行回调，传入找到的 textarea
        } else {
            setTimeout(() => waitForDialogTextarea(textareaSelector, dialogWrapperSelector, callback, attemptsLeft - 1), pollInterval);
        }
    }

    setTimeout(() => {
        console.log("脚本主逻辑开始执行...");

        const answerButton = document.querySelector(answerButtonSelector);
        if (answerButton) {
            console.log('"我来回答" 按钮已找到。');
            answerButton.addEventListener('click', function() {
                console.log('"我来回答" 按钮被点击。开始轮询等待 Textarea...');
                setTimeout(() => {
                    waitForDialogTextarea(answerDialogTextareaSelector, answerDialogWrapperSelector, (textarea) => {
                        enablePasteOnTextarea(textarea); // 先解锁粘贴
                        // 只有在问题详情页（能找到答案列表）才尝试填充
                        if (document.querySelector(answerListSelector) || window.location.href.includes('/questionDetail/')) {
                            fillAnswerInDialog();
                        } else {
                            console.log('非问题详情页，"我来回答" 仅解锁粘贴。');
                        }
                    }, maxPollAttempts);
                }, initialDialogAppearDelay);
            });
        } else {
            console.log('未能找到 "我来回答" 按钮 (这在 home 等非详情页是正常的)。');
        }

        const askBtn = document.querySelector(askQuestionButtonSelector);
        if (askBtn) {
            console.log('"提问" 按钮已找到。');
            askBtn.addEventListener('click', function() {
                console.log('"提问" 按钮被点击。开始轮询等待 "提问" Textarea...');
                setTimeout(() => {
                    waitForDialogTextarea(askQuestionDialogTextareaSelector, askQuestionDialogWrapperSelector, (textarea) => {
                        enablePasteOnTextarea(textarea);
                    }, maxPollAttempts);
                }, initialDialogAppearDelay);
            });
        } else {
            console.log('未能找到 "提问" 按钮。');
        }

        const observer = new MutationObserver((mutationsList, observerInstance) => {
            const checkAndUnlock = (textareaSelector, wrapperSelector) => {
                const textarea = document.querySelector(textareaSelector);
                const dialogWrapper = document.querySelector(wrapperSelector);
                if (textarea && dialogWrapper && dialogWrapper.style.display !== 'none' && textarea.offsetHeight > 0) {
                    enablePasteOnTextarea(textarea);
                }
            };

            // 检查 "我来回答" 对话框
            checkAndUnlock(answerDialogTextareaSelector, answerDialogWrapperSelector);

            // 检查 "提问" 对话框
            checkAndUnlock(askQuestionDialogTextareaSelector, askQuestionDialogWrapperSelector);
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log("已启动 MutationObserver 来监控对话框 Textarea 出现并解锁粘贴。");

    }, 2500);
})();