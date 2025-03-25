// 模块：求解器核心逻辑
const Solver = (() => {
    let settings = {
        digitLength: 4,
        digitMin: 1,
        digitMax: 9,
        allowDuplicates: false
    };

    let possibleNumbers = [];
    let currentGuessNumber = '';

    function generatePossibleNumbers() {
        possibleNumbers = [];
        const digits = [];
        for (let i = settings.digitMin; i <= settings.digitMax; i++) {
            digits.push(i);
        }
        generateNumbers(digits, '', settings.digitLength);
    }

    function generateNumbers(digits, current, length) {
        if (current.length === length) {
            possibleNumbers.push(current);
            return;
        }
        for (let i = 0; i < digits.length; i++) {
            if (!settings.allowDuplicates && current.includes(digits[i])) {
                continue;
            }
            generateNumbers(digits, current + digits[i], length);
        }
    }

    function filterPossibleNumbers(aCount, bCount) {
        possibleNumbers = possibleNumbers.filter(num => {
            let a = 0;
            let b = 0;
            for (let i = 0; i < num.length; i++) {
                if (num[i] === currentGuessNumber[i]) {
                    a++;
                } else if (currentGuessNumber.includes(num[i])) {
                    b++;
                }
            }
            return a === aCount && b === bCount;
        });
    }

    function getNextGuess() {
        return possibleNumbers.length > 0 ? possibleNumbers[0] : null;
    }

    function resetSolverState() {
        try {
            generatePossibleNumbers();
            currentGuessNumber = getNextGuess();
            if (!currentGuessNumber) {
                throw new Error('无法生成有效的猜测数字');
            }
            return currentGuessNumber;
        } catch (error) {
            console.error('重置求解器状态时发生错误:', error);
            throw error; // 重新抛出错误以便上层处理
        }
    }

    let history = [];

    function updateSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        resetSolverState();
    }

    function clearHistory() {
        history = [];
    }

    function getHistory() {
        return history;
    }

    return {
        resetSolverState,
        filterPossibleNumbers,
        getNextGuess,
        updateSettings,
        getCurrentGuess: () => currentGuessNumber,
        getSettings: () => settings,
        clearHistory,
        getHistory
    };
})();

// 模块：UI交互
const UI = (() => {
    let currentSection = 'solver';

    function initNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        const sections = document.querySelectorAll('section[data-page]');

        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const targetPage = this.getAttribute('href').substring(1);
                showSection(targetPage);
            });
        });
    }

    function showSection(sectionId) {
        document.querySelector(`section[data-page="${currentSection}"]`).classList.remove('active');
        document.querySelector(`section[data-page="${sectionId}"]`).classList.add('active');
        currentSection = sectionId;
    }

    function bindSolverEvents() {
        const feedbackForm = document.getElementById('feedback-form');
        const settingsForm = document.getElementById('settings-form');
        const resetSolver = document.getElementById('reset-solver');

        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
        settingsForm.addEventListener('submit', handleSettingsSubmit);
        resetSolver.addEventListener('click', handleResetSolver);
    }

    function handleFeedbackSubmit(e) {
        e.preventDefault();
        const aCount = parseInt(document.getElementById('a-count').value);
        const bCount = parseInt(document.getElementById('b-count').value);
        Solver.filterPossibleNumbers(aCount, bCount);
        updateGuessDisplay();
        if (aCount === 4 && bCount === 0) {
            alert('求解完毕！');
        }
    }

    function handleSettingsSubmit(e) {
        e.preventDefault();
        const newSettings = {
            digitLength: parseInt(document.getElementById('digit-length').value),
            digitMin: parseInt(document.getElementById('digit-min').value),
            digitMax: parseInt(document.getElementById('digit-max').value),
            allowDuplicates: document.getElementById('allow-duplicates').checked
        };
        Solver.updateSettings(newSettings);
        alert('设置已保存！');
    }

    function handleResetSolver() {
        try {
            const initialGuess = Solver.resetSolverState();
            // 清除历史记录
            Solver.clearHistory();
            // 更新当前猜测
            document.getElementById('current-guess').textContent = initialGuess;
            // 清空输入框
            document.getElementById('a-count').value = '';
            document.getElementById('b-count').value = '';
            // 刷新历史记录
            updateHistoryDisplay();
            alert('求解器已重置！');
        } catch (error) {
            console.error('重置求解器时发生错误:', error);
            alert('重置求解器时发生错误，请重试！');
        }
    }

    function updateGuessDisplay() {
        const nextGuess = Solver.getNextGuess();
        document.getElementById('current-guess').textContent = nextGuess || '无可用猜测';
    }

    function updateHistoryDisplay() {
        const historyContainer = document.getElementById('history');
        historyContainer.innerHTML = '';
        const history = Solver.getHistory();
        history.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'history-entry';
            entryElement.innerHTML = `
                <span>${index + 1}. 猜测: ${entry.guess}</span>
                <span>A: ${entry.a}</span>
                <span>B: ${entry.b}</span>
                <span>剩余可能: ${entry.remaining}</span>
            `;
            historyContainer.appendChild(entryElement);
        });
    }

    return {
        init: function () {
            initNavigation();
            bindSolverEvents();
            showSection('solver');
            document.getElementById('current-guess').textContent = Solver.resetSolverState();
            updateHistoryDisplay();
        }
    };
})();

// 初始化
document.addEventListener('DOMContentLoaded', UI.init);
