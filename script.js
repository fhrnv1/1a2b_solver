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
        const previousCount = possibleNumbers.length;
        possibleNumbers = possibleNumbers.filter(num => {
            let a = 0; // A数量
            let b = 0; // B数量
            for (let i = 0; i < num.length; i++) {
                if (num[i] === currentGuessNumber[i]) {
                    a++; // 数字和位置都正确
                } else if (currentGuessNumber.includes(num[i])) {
                    b++; // 数字正确但位置不对
                }
            }
            return a === aCount && b === bCount;
        });
        return possibleNumbers.length; // 返回剩余可能数量
    }

    function addHistoryEntry(guess, a, b, remaining) {
        history.push({
            guess,
            a,
            b,
            remaining
        });
    }

    function getNextGuess() {
        return possibleNumbers.length > 0 ? possibleNumbers[0] : null;
    }

    function resetSolverState() {
        try {
            // 生成所有可能的数字组合
            generatePossibleNumbers();
            // 获取下一个猜测数字
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

    let gameHistory = [];
    let currentGameIndex = -1;

    function saveGameState() {
        return {
            settings: {...settings},
            possibleNumbers: [...possibleNumbers],
            currentGuessNumber,
            history: [...history]
        };
    }

    function restoreGameState(state) {
        settings = {...state.settings};
        possibleNumbers = [...state.possibleNumbers];
        currentGuessNumber = state.currentGuessNumber;
        history = [...state.history];
    }

    function addGameToHistory() {
        // 保存当前游戏状态
        const gameState = saveGameState();
        // 保留最多10轮历史记录，超出则移除最早的记录
        if (gameHistory.length >= 10) {
            gameHistory.shift();
        }
        // 添加新记录并更新当前索引
        gameHistory.push(gameState);
        currentGameIndex = gameHistory.length - 1;
        // 将历史记录保存到浏览器本地存储
        localStorage.setItem('1a2b_gameHistory', JSON.stringify(gameHistory));
    }

    function getHistoryGames() {
        // 从浏览器本地存储加载历史记录
        const savedHistory = localStorage.getItem('1a2b_gameHistory');
        if (savedHistory) {
            // 解析JSON格式的历史记录
            gameHistory = JSON.parse(savedHistory);
        }
        // 返回格式化后的历史记录数组
        return gameHistory.map((game, index) => ({
            index,                      // 记录索引
            guess: game.currentGuessNumber, // 猜测数字
            settings: game.settings     // 游戏设置
        }));
    }

    function clearLocalHistory() {
        // 清除浏览器本地存储中的历史记录
        localStorage.removeItem('1a2b_gameHistory');
    }

    function restoreFromHistory(index) {
        if (index >= 0 && index < gameHistory.length) {
            restoreGameState(gameHistory[index]);
            currentGameIndex = index;
            return true;
        }
        return false;
    }

    let history = [];

    function updateSettings(newSettings) {
        addGameToHistory();
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
        getHistory,
        addHistoryEntry,
        addGameToHistory,
        getHistoryGames,
        restoreFromHistory,
        clearLocalHistory
    };
})();

// 模块：UI交互
const UI = (() => {
    let currentSection = 'solver';

    // 自定义弹窗函数
    function showAlert(message, type = 'info') {
        const alertBox = document.createElement('div');
        alertBox.className = `custom-alert ${type}`;
        alertBox.innerHTML = `
            <div class="alert-content">
                <p>${message}</p>
                <button class="alert-close">确定</button>
            </div>
        `;
        document.body.appendChild(alertBox);

        const closeBtn = alertBox.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertBox.remove();
        });
    }

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
        e.preventDefault(); // 阻止表单默认提交行为
        
        // 获取用户输入的A和B数量
        const aCount = parseInt(document.getElementById('a-count').value);
        const bCount = parseInt(document.getElementById('b-count').value);
        
        // 记录当前回合历史：当前猜测数字、A/B数量和剩余可能性
        const currentGuess = Solver.getCurrentGuess();
        const remaining = Solver.filterPossibleNumbers(aCount, bCount);
        Solver.addHistoryEntry(currentGuess, aCount, bCount, remaining);
        
        // 更新界面显示
        updateGuessDisplay();
        
        // 如果4A0B则表示求解完成
        if (aCount === 4 && bCount === 0) {
            showAlert('求解完毕！', 'success');
            // 重置求解器状态
            const initialGuess = Solver.resetSolverState();
            Solver.clearHistory();
            // 更新界面显示
            document.getElementById('current-guess').textContent = initialGuess;
            document.getElementById('a-count').value = '';
            document.getElementById('b-count').value = '';
            updateHistoryDisplay();
        }
        
        // 保存当前游戏状态到历史记录
        Solver.addGameToHistory();
    }

    function handleSettingsSubmit(e) {
        e.preventDefault(); // 阻止表单默认提交行为
        
        // 获取用户设置的新参数
        const newSettings = {
            digitLength: parseInt(document.getElementById('digit-length').value), // 数字位数
            digitMin: parseInt(document.getElementById('digit-min').value),       // 最小数字
            digitMax: parseInt(document.getElementById('digit-max').value),       // 最大数字
            allowDuplicates: document.getElementById('allow-duplicates').checked // 是否允许重复数字
        };
        
        // 更新求解器设置
        Solver.updateSettings(newSettings);
        // 显示成功提示
        showAlert('设置已保存！', 'success');
        // 跳转回求解器界面
        showSection('solver');
    }

    function handleResetSolver() {
        try {
            // 重置求解器状态并获取初始猜测
            const initialGuess = Solver.resetSolverState();
            
            // 清除当前回合的历史记录
            Solver.clearHistory();
            
            // 更新界面显示
            document.getElementById('current-guess').textContent = initialGuess;
            document.getElementById('a-count').value = '';
            document.getElementById('b-count').value = '';
            
            // 刷新历史记录显示
            updateHistoryDisplay();
            
            // 显示重置成功提示
            showAlert('求解器已重置！', 'success');
            
        } catch (error) {
            // 捕获并处理重置过程中的错误
            console.error('重置求解器时发生错误:', error);
            showAlert('重置求解器时发生错误，请重试！', 'error');
        }
    }

    function updateGuessDisplay() {
        const nextGuess = Solver.getNextGuess();
        document.getElementById('current-guess').textContent = nextGuess || '无可用猜测';
    }

    function updateHistoryDisplay() {
        const historyContainer = document.getElementById('history');
        const gameHistoryContainer = document.getElementById('game-history');
        
        // 更新当前轮次历史
        historyContainer.innerHTML = '';
        const history = Solver.getHistory();
        history.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'history-entry';
            entryElement.innerHTML = `
                <div class="history-header" data-index="${index}">
                    <span>${index + 1}. 猜测: ${entry.guess} → A:${entry.a} B:${entry.b}</span>
                    <button class="btn btn-toggle">展开</button>
                    <button class="btn btn-restore" data-index="${index}">回退</button>
                </div>
                <div class="history-details" style="display:none;">
                    <p>详细操作:</p>
                    <p>猜测数字: ${entry.guess}</p>
                    <p>A数量: ${entry.a}</p>
                    <p>B数量: ${entry.b}</p>
                    <p>剩余可能性: ${entry.remaining}</p>
                </div>
            `;
            historyContainer.appendChild(entryElement);
        });

        // 添加折叠/展开事件
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const details = this.closest('.history-header').nextElementSibling;
                const isHidden = details.style.display === 'none';
                details.style.display = isHidden ? 'block' : 'none';
                this.textContent = isHidden ? '折叠' : '展开';
            });
        });

        // 添加回退按钮事件
        document.querySelectorAll('.btn-restore').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                if (Solver.restoreFromHistory(index)) {
                    updateGuessDisplay();
                    updateHistoryDisplay();
                    showAlert(`已回退到第 ${index + 1} 步`, 'success');
                }
            });
        });

        // 更新游戏历史记录
        gameHistoryContainer.innerHTML = '';
        const games = Solver.getHistoryGames();
        games.forEach((game, index) => {
            const gameElement = document.createElement('div');
            gameElement.className = 'game-history-entry';
            gameElement.innerHTML = `
                <span>游戏 ${index + 1}: ${game.guess}</span>
                <button class="btn btn-restore-game" data-index="${index}">回退</button>
            `;
            gameHistoryContainer.appendChild(gameElement);
        });

        // 添加游戏回退按钮事件
        document.querySelectorAll('.btn-restore-game').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                if (Solver.restoreFromHistory(index)) {
                    updateGuessDisplay();
                    updateHistoryDisplay();
                    showAlert(`已回退到游戏 ${index + 1}`, 'success');
                }
            });
        });
    }

    return {
        init: function () {
            initNavigation();
            bindSolverEvents();
            showSection('solver');
            // 初始化时加载本地历史记录
            Solver.getHistoryGames();
            document.getElementById('current-guess').textContent = Solver.resetSolverState();
            updateHistoryDisplay();
            
            // 添加清除历史记录按钮事件
            document.getElementById('clear-history').addEventListener('click', function() {
                try {
                    // 清除本地存储
                    Solver.clearLocalHistory();
                    
                    // 清除内存中的历史记录
                    Solver.clearHistory();
                    
                    // 重置游戏历史数组
                    Solver.gameHistory = [];
                    
                    // 更新UI显示
                    updateHistoryDisplay();
                    
                    showAlert('历史记录已清除', 'success');
                } catch (error) {
                    showAlert('清除历史记录失败', 'error');
                }
            });
        }
    };
})();

// 初始化
document.addEventListener('DOMContentLoaded', UI.init);
