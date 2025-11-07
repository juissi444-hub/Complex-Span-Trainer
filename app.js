// Working Memory Capacity Trainer - Main Application
// Based on research by Draheim et al., Conway et al., and Redick et al.

class WMCTrainer {
    constructor() {
        this.currentTask = null;
        this.currentTrial = 0;
        this.currentSetSize = 0;
        this.trials = [];
        this.responses = [];
        this.results = this.loadResults();
        this.demographics = {};

        // Practice phase tracking
        this.practicePhase = 0;
        this.practiceRTs = [];
        this.timeLimit = null;

        // Current trial data
        this.currentItems = [];
        this.currentRecall = [];
        this.processingErrors = 0;
        this.speedErrors = 0;

        // Task-specific data
        this.letters = ['F', 'H', 'J', 'K', 'L', 'N', 'P', 'Q', 'R', 'S', 'T', 'Y'];
        this.arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        this.rotationLetters = ['F', 'G', 'J', 'L', 'P', 'R'];

        // Navigation history for back button
        this.screenHistory = ['welcome-screen'];
        this.currentScreen = 'welcome-screen';

        // Initialize mobile features
        this.initMobileFeatures();
    }

    // Initialize mobile-specific features
    initMobileFeatures() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupMobileFeatures());
        } else {
            this.setupMobileFeatures();
        }
    }

    setupMobileFeatures() {
        // Prevent pull-to-refresh on mobile
        document.body.addEventListener('touchmove', (e) => {
            if (e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Update back button visibility
        this.updateBackButton();
    }

    // Screen Management
    showScreen(screenId, addToHistory = true) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');

        // Update navigation history
        if (addToHistory && screenId !== this.currentScreen) {
            this.screenHistory.push(screenId);
        }
        this.currentScreen = screenId;
        this.updateBackButton();

        // Scroll to top
        window.scrollTo(0, 0);
    }

    // Update back button visibility
    updateBackButton() {
        const backBtn = document.getElementById('back-btn');
        const homeBtn = document.getElementById('home-btn');

        if (!backBtn || !homeBtn) return; // DOM not ready yet

        // Show back button only if we have history and not on welcome or task-selection screen
        if (this.screenHistory.length > 1 &&
            this.currentScreen !== 'welcome-screen' &&
            this.currentScreen !== 'task-selection') {
            backBtn.style.display = 'block';
            homeBtn.style.display = 'none'; // Hide home when back is shown
        } else {
            backBtn.style.display = 'none';
            // Show home button if not on welcome or task-selection
            if (this.currentScreen !== 'welcome-screen' &&
                this.currentScreen !== 'task-selection') {
                homeBtn.style.display = 'flex';
            } else {
                homeBtn.style.display = 'none';
            }
        }
    }

    // Go back in navigation
    goBack() {
        if (this.screenHistory.length > 1) {
            // Remove current screen
            this.screenHistory.pop();
            // Get previous screen
            const previousScreen = this.screenHistory[this.screenHistory.length - 1];
            this.showScreen(previousScreen, false);
        } else {
            // Default to task selection or welcome
            this.selectTask();
        }
    }

    // Show help modal
    showHelp() {
        document.getElementById('help-modal').classList.add('active');
    }

    // Close help modal
    closeHelp() {
        document.getElementById('help-modal').classList.remove('active');
    }

    // Return to main menu (task selection)
    returnToMenu(confirm = true) {
        // If in middle of task, confirm first
        if (confirm && this.currentTask && this.currentTrial > 0 && this.currentTrial < this.trials.length) {
            if (!window.confirm('Are you sure? Your current progress will be lost.')) {
                return;
            }
        }

        // Reset task state
        this.currentTask = null;
        this.currentTrial = 0;
        this.trials = [];
        this.responses = [];
        this.processingErrors = 0;
        this.speedErrors = 0;
        this.practicePhase = 0;

        // Clear history and go to task selection
        this.screenHistory = ['task-selection'];
        this.showScreen('task-selection', false);
    }

    // Task Selection
    selectTask() {
        // Collect demographics if coming from welcome screen
        if (this.currentScreen === 'welcome-screen') {
            this.demographics = {
                age: document.getElementById('age')?.value || null,
                gender: document.getElementById('gender')?.value || null,
                education: document.getElementById('education')?.value || null,
                timestamp: new Date().toISOString()
            };
        }
        this.showScreen('task-selection');
    }

    // Add haptic feedback for mobile (if supported)
    hapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    // Start a specific task
    startTask(taskType) {
        this.currentTask = taskType;
        this.currentTrial = 0;
        this.responses = [];
        this.processingErrors = 0;
        this.speedErrors = 0;

        this.showInstructions(taskType);
    }

    // Show task instructions
    showInstructions(taskType) {
        this.showScreen('instructions');
        const title = document.getElementById('task-title');
        const content = document.getElementById('instructions-content');

        const instructions = {
            operation: {
                title: 'Operation Span Instructions',
                content: `
                    <div class="info-box">
                        <h3>Task Overview</h3>
                        <p>In this task, you will:</p>
                        <ol>
                            <li>Solve simple math problems (e.g., (2 × 3) + 1 = 7)</li>
                            <li>Judge whether the equation is correct or incorrect</li>
                            <li>Remember letters shown after each equation</li>
                            <li>Recall all letters in the correct order at the end</li>
                        </ol>
                        <p><strong>Important:</strong> You must maintain at least 85% accuracy on the math problems for your data to be valid.</p>
                        <p>First, you'll practice each component separately, then together.</p>
                    </div>
                `
            },
            symmetry: {
                title: 'Symmetry Span Instructions',
                content: `
                    <div class="info-box">
                        <h3>Task Overview</h3>
                        <p>In this task, you will:</p>
                        <ol>
                            <li>View 8×8 grids with filled squares</li>
                            <li>Judge whether the pattern is symmetrical around the vertical axis</li>
                            <li>Remember locations shown in a 4×4 grid after each judgment</li>
                            <li>Recall all locations in the correct order at the end</li>
                        </ol>
                        <p><strong>Important:</strong> You must maintain at least 85% accuracy on symmetry judgments for your data to be valid.</p>
                        <p>First, you'll practice each component separately, then together.</p>
                    </div>
                `
            },
            rotation: {
                title: 'Rotation Span Instructions',
                content: `
                    <div class="info-box">
                        <h3>Task Overview</h3>
                        <p>In this task, you will:</p>
                        <ol>
                            <li>View rotated letters (F, G, J, L, P, R)</li>
                            <li>Judge whether the letter is normal or mirror-reversed</li>
                            <li>Remember arrows pointing in different directions</li>
                            <li>Recall all arrows in the correct order at the end</li>
                        </ol>
                        <p><strong>Important:</strong> You must maintain at least 85% accuracy on letter judgments for your data to be valid.</p>
                        <p>First, you'll practice each component separately, then together.</p>
                    </div>
                `
            }
        };

        title.textContent = instructions[taskType].title;
        content.innerHTML = instructions[taskType].content;
    }

    // Start practice phase
    startPractice() {
        this.practicePhase = 1;
        this.practiceRTs = [];
        this.showPracticePhase();
    }

    // Show current practice phase
    showPracticePhase() {
        this.showScreen('practice');
        const phaseTitle = document.getElementById('practice-phase');
        const content = document.getElementById('practice-content');

        if (this.practicePhase === 1) {
            phaseTitle.textContent = 'Storage Only';
            this.practiceStorageOnly(content);
        } else if (this.practicePhase === 2) {
            phaseTitle.textContent = 'Processing Only';
            this.practiceProcessingOnly(content);
        } else if (this.practicePhase === 3) {
            phaseTitle.textContent = 'Combined Practice';
            this.startMainTask();
        }
    }

    // Practice storage only
    practiceStorageOnly(content) {
        content.innerHTML = `
            <div class="info-box">
                <p>Practice remembering items. You'll see 3 items to remember.</p>
                <button class="btn-primary" onclick="window.app.runStoragePractice()">Begin Storage Practice</button>
                <button class="btn-secondary" onclick="window.app.returnToMenu()">Return to Main Menu</button>
            </div>
        `;
    }

    // Run storage practice
    runStoragePractice() {
        // Generate 3 random items based on task
        this.currentItems = [];
        const setSize = 3;

        for (let i = 0; i < setSize; i++) {
            if (this.currentTask === 'operation' || this.currentTask === 'reading') {
                this.currentItems.push(this.getRandomLetter());
            } else if (this.currentTask === 'symmetry') {
                this.currentItems.push(this.getRandomGridPosition());
            } else if (this.currentTask === 'rotation') {
                this.currentItems.push(this.getRandomArrow());
            }
        }

        this.showStorageSequence(0);
    }

    // Show storage sequence
    showStorageSequence(index) {
        if (index >= this.currentItems.length) {
            this.showRecallScreen();
            return;
        }

        const content = document.getElementById('practice-content');
        const item = this.currentItems[index];

        if (this.currentTask === 'operation' || this.currentTask === 'reading') {
            content.innerHTML = `<div class="storage-item">${item}</div>`;
        } else if (this.currentTask === 'symmetry') {
            content.innerHTML = this.renderMemoryGrid(item);
        } else if (this.currentTask === 'rotation') {
            content.innerHTML = `<div class="arrow-display">${item}</div>`;
        }

        setTimeout(() => {
            content.innerHTML = '';
            setTimeout(() => this.showStorageSequence(index + 1), 250);
        }, 1000);
    }

    // Practice processing only
    practiceProcessingOnly(content) {
        content.innerHTML = `
            <div class="info-box">
                <p>Practice the processing task. Respond as quickly and accurately as possible.</p>
                <p>We'll use your speed to set a time limit for the main task.</p>
                <button class="btn-primary" onclick="window.app.runProcessingPractice()">Begin Processing Practice</button>
                <button class="btn-secondary" onclick="window.app.returnToMenu()">Return to Main Menu</button>
            </div>
        `;
    }

    // Run processing practice
    runProcessingPractice() {
        this.practiceRTs = [];
        this.practiceTrialCount = 0;
        this.maxPracticeTrials = 15;
        this.runProcessingTrial();
    }

    // Run a single processing practice trial
    runProcessingTrial() {
        if (this.practiceTrialCount >= this.maxPracticeTrials) {
            this.calculateTimeLimit();
            this.practicePhase = 3;
            this.showPracticePhase();
            return;
        }

        this.practiceTrialCount++;
        this.trialStartTime = Date.now();

        const content = document.getElementById('practice-content');

        if (this.currentTask === 'operation') {
            const problem = this.generateMathProblem();
            content.innerHTML = `
                <div class="processing-task">
                    <div class="equation">${problem.equation} = ${problem.answer}</div>
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.respondProcessing(true, ${problem.correct})">Correct</button>
                        <button class="response-button btn-danger" onclick="window.app.respondProcessing(false, ${problem.correct})">Incorrect</button>
                    </div>
                </div>
            `;
        } else if (this.currentTask === 'symmetry') {
            const pattern = this.generateSymmetryPattern();
            content.innerHTML = `
                <div class="processing-task">
                    <div>${this.renderSymmetryGrid(pattern.grid)}</div>
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.respondProcessing(true, ${pattern.symmetrical})">Symmetrical</button>
                        <button class="response-button btn-danger" onclick="window.app.respondProcessing(false, ${pattern.symmetrical})">Not Symmetrical</button>
                    </div>
                </div>
            `;
        } else if (this.currentTask === 'rotation') {
            const letter = this.generateRotatedLetter();
            content.innerHTML = `
                <div class="processing-task">
                    <div class="rotated-letter" style="transform: rotate(${letter.rotation}deg) scaleX(${letter.mirrored ? -1 : 1})">${letter.letter}</div>
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.respondProcessing(true, ${!letter.mirrored})">Normal</button>
                        <button class="response-button btn-danger" onclick="window.app.respondProcessing(false, ${!letter.mirrored})">Mirror</button>
                    </div>
                </div>
            `;
        }
    }

    // Respond to processing task
    respondProcessing(response, correct) {
        const rt = Date.now() - this.trialStartTime;
        this.practiceRTs.push(rt);

        setTimeout(() => this.runProcessingTrial(), 250);
    }

    // Calculate time limit based on practice
    calculateTimeLimit() {
        const mean = this.practiceRTs.reduce((a, b) => a + b, 0) / this.practiceRTs.length;
        const variance = this.practiceRTs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.practiceRTs.length;
        const sd = Math.sqrt(variance);

        // Mean + 2.5 SDs as per research
        this.timeLimit = mean + (2.5 * sd);
        console.log(`Time limit set to ${this.timeLimit.toFixed(0)}ms (Mean: ${mean.toFixed(0)}, SD: ${sd.toFixed(0)})`);
    }

    // Start main task
    startMainTask() {
        // Generate trials based on Redick et al. (2012) specifications
        // This matches the exact protocol used to collect normative data (N=6,274)

        this.trials = [];
        let setSizes;

        if (this.currentTask === 'operation' || this.currentTask === 'reading') {
            // Operation/Reading Span: Set sizes 3-7, three trials each
            // Total: 15 trials, 75 total items
            setSizes = [3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7];
        } else if (this.currentTask === 'symmetry') {
            // Symmetry Span: Set sizes 2-5, two trials each
            // Total: 8 trials, 28 total items
            setSizes = [2, 2, 3, 3, 4, 4, 5, 5];
        } else if (this.currentTask === 'rotation') {
            // Rotation Span: Set sizes 2-5, three trials each
            // Total: 12 trials, 42 total items
            setSizes = [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
        }

        // Shuffle set sizes for randomized presentation
        this.trials = this.shuffle(setSizes);
        this.currentTrial = 0;

        this.runTrial();
    }

    // Run a single trial
    runTrial() {
        if (this.currentTrial >= this.trials.length) {
            this.showResults();
            return;
        }

        this.currentSetSize = this.trials[this.currentTrial];
        this.currentItems = [];
        this.currentRecall = [];
        this.currentResponses = [];

        // Update progress
        document.getElementById('progress').style.width =
            `${((this.currentTrial / this.trials.length) * 100)}%`;
        document.getElementById('current-trial').textContent = this.currentTrial + 1;
        document.getElementById('total-trials').textContent = this.trials.length;
        document.getElementById('set-size').textContent = this.currentSetSize;

        this.showScreen('task');
        this.runTrialSequence(0);
    }

    // Run trial sequence (processing + storage pairs)
    runTrialSequence(index) {
        if (index >= this.currentSetSize) {
            this.showRecallScreen();
            return;
        }

        // Show processing task
        this.showProcessingTask(() => {
            // Show storage item
            this.showStorageItem(() => {
                this.runTrialSequence(index + 1);
            });
        });
    }

    // Show processing task
    showProcessingTask(callback) {
        const content = document.getElementById('task-content');
        this.trialStartTime = Date.now();
        let correctAnswer;

        if (this.currentTask === 'operation') {
            const problem = this.generateMathProblem();
            correctAnswer = problem.correct;

            content.innerHTML = `
                <div class="processing-task">
                    <div class="equation">${problem.equation} = ${problem.answer}</div>
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.processResponse(true, ${correctAnswer})">Correct</button>
                        <button class="response-button btn-danger" onclick="window.app.processResponse(false, ${correctAnswer})">Incorrect</button>
                    </div>
                </div>
            `;
        } else if (this.currentTask === 'symmetry') {
            const pattern = this.generateSymmetryPattern();
            correctAnswer = pattern.symmetrical;

            content.innerHTML = `
                <div class="processing-task">
                    ${this.renderSymmetryGrid(pattern.grid)}
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.processResponse(true, ${correctAnswer})">Symmetrical</button>
                        <button class="response-button btn-danger" onclick="window.app.processResponse(false, ${correctAnswer})">Not Symmetrical</button>
                    </div>
                </div>
            `;
        } else if (this.currentTask === 'rotation') {
            const letter = this.generateRotatedLetter();
            correctAnswer = !letter.mirrored;

            content.innerHTML = `
                <div class="processing-task">
                    <div class="rotated-letter" style="transform: rotate(${letter.rotation}deg) scaleX(${letter.mirrored ? -1 : 1})">${letter.letter}</div>
                    <div class="response-buttons">
                        <button class="response-button btn-success" onclick="window.app.processResponse(true, ${correctAnswer})">Normal</button>
                        <button class="response-button btn-danger" onclick="window.app.processResponse(false, ${correctAnswer})">Mirror</button>
                    </div>
                </div>
            `;
        }

        this.processingCallback = callback;
    }

    // Handle processing response
    processResponse(response, correct) {
        this.hapticFeedback();

        const rt = Date.now() - this.trialStartTime;
        const isCorrect = (response === correct);

        if (!isCorrect) {
            this.processingErrors++;
        }

        if (rt > this.timeLimit) {
            this.speedErrors++;
        }

        this.currentResponses.push({
            type: 'processing',
            correct: isCorrect,
            rt: rt
        });

        if (this.processingCallback) {
            this.processingCallback();
        }
    }

    // Show storage item
    showStorageItem(callback) {
        const content = document.getElementById('task-content');
        let item;

        if (this.currentTask === 'operation' || this.currentTask === 'reading') {
            item = this.getRandomLetter();
            content.innerHTML = `<div class="storage-item">${item}</div>`;
        } else if (this.currentTask === 'symmetry') {
            item = this.getRandomGridPosition();
            content.innerHTML = this.renderMemoryGrid(item);
        } else if (this.currentTask === 'rotation') {
            item = this.getRandomArrow();
            content.innerHTML = `<div class="arrow-display">${item}</div>`;
        }

        this.currentItems.push(item);

        setTimeout(() => {
            content.innerHTML = '';
            setTimeout(callback, 250);
        }, 1000);
    }

    // Show recall screen
    showRecallScreen() {
        this.currentRecall = [];
        this.showScreen('recall');
        const content = document.getElementById('recall-content');

        content.innerHTML = '<div class="recall-display" id="recall-display">Click items to recall...</div>';

        if (this.currentTask === 'operation' || this.currentTask === 'reading') {
            content.innerHTML += this.renderLetterGrid();
        } else if (this.currentTask === 'symmetry') {
            content.innerHTML += this.renderMemoryRecallGrid();
        } else if (this.currentTask === 'rotation') {
            content.innerHTML += this.renderArrowGrid();
        }
    }

    // Add item to recall
    addToRecall(item) {
        this.hapticFeedback();
        this.currentRecall.push(item);
        this.updateRecallDisplay();

        // Visual feedback - highlight selected button
        if (this.currentTask === 'operation' || this.currentTask === 'reading') {
            // Find and highlight the letter button
            const buttons = document.querySelectorAll('.letter-button');
            buttons.forEach(btn => {
                if (btn.textContent === item) {
                    btn.classList.add('selected');
                    setTimeout(() => btn.classList.remove('selected'), 200);
                }
            });
        } else if (this.currentTask === 'symmetry') {
            // Mark the memory cell as selected
            this.updateMemoryGridDisplay();
        } else if (this.currentTask === 'rotation') {
            // Find and highlight the arrow button
            const buttons = document.querySelectorAll('.arrow-button');
            buttons.forEach(btn => {
                if (btn.textContent === item) {
                    btn.classList.add('selected');
                    setTimeout(() => btn.classList.remove('selected'), 200);
                }
            });
        }
    }

    // Update memory grid display with selected cells
    updateMemoryGridDisplay() {
        const cells = document.querySelectorAll('.memory-cell');
        let cellIndex = 0;

        // Reset all cells first
        cells.forEach(cell => {
            cell.classList.remove('selected');
        });

        // Mark selected cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const isSelected = this.currentRecall.some(item =>
                    item.row === row && item.col === col
                );

                if (isSelected) {
                    cells[cellIndex].classList.add('selected');
                }
                cellIndex++;
            }
        }
    }

    // Update recall display
    updateRecallDisplay() {
        const display = document.getElementById('recall-display');

        if (this.currentRecall.length === 0) {
            display.innerHTML = 'Click items to recall...';
        } else {
            if (this.currentTask === 'operation' || this.currentTask === 'reading') {
                display.innerHTML = this.currentRecall.map(item =>
                    `<span class="recall-item">${item}</span>`
                ).join('');
            } else if (this.currentTask === 'symmetry') {
                display.innerHTML = this.currentRecall.map((item, idx) =>
                    `<span class="recall-item">${idx + 1}</span>`
                ).join('');
            } else if (this.currentTask === 'rotation') {
                display.innerHTML = this.currentRecall.map(item =>
                    `<span class="recall-item">${item}</span>`
                ).join('');
            }
        }
    }

    // Clear recall
    clearRecall() {
        this.hapticFeedback();
        this.currentRecall = [];
        this.updateRecallDisplay();

        // Reset selection highlights
        document.querySelectorAll('.letter-button, .memory-cell, .arrow-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Update memory grid if on symmetry task
        if (this.currentTask === 'symmetry') {
            this.updateMemoryGridDisplay();
        }
    }

    // Submit recall
    submitRecall() {
        this.hapticFeedback();

        // Ensure we have at least one item recalled
        if (this.currentRecall.length === 0) {
            if (confirm('You haven\'t selected any items. Submit empty response?')) {
                // Continue with empty response
            } else {
                return;
            }
        }

        // Calculate score for this trial
        const trialData = {
            setSize: this.currentSetSize,
            items: [...this.currentItems],
            recall: [...this.currentRecall],
            processingResponses: [...this.currentResponses],
            score: this.calculateTrialScore()
        };

        this.responses.push(trialData);
        this.showFeedback(trialData);
    }

    // Calculate trial score (partial credit)
    calculateTrialScore() {
        let correct = 0;

        for (let i = 0; i < this.currentItems.length; i++) {
            if (i < this.currentRecall.length) {
                if (this.currentTask === 'symmetry') {
                    // For symmetry, compare grid positions
                    if (this.currentItems[i].row === this.currentRecall[i].row &&
                        this.currentItems[i].col === this.currentRecall[i].col) {
                        correct++;
                    }
                } else {
                    // For others, direct comparison
                    if (this.currentItems[i] === this.currentRecall[i]) {
                        correct++;
                    }
                }
            }
        }

        return correct;
    }

    // Show feedback
    showFeedback(trialData) {
        this.showScreen('feedback');
        const content = document.getElementById('feedback-content');

        const processingAccuracy = trialData.processingResponses.filter(r => r.correct).length /
                                   trialData.processingResponses.length * 100;

        content.innerHTML = `
            <div class="feedback-stats">
                <div class="stat-card">
                    <div class="stat-value">${trialData.score}/${trialData.setSize}</div>
                    <div class="stat-label">Items Recalled Correctly</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${processingAccuracy.toFixed(0)}%</div>
                    <div class="stat-label">Processing Accuracy</div>
                </div>
            </div>
            <p style="text-align: center; color: var(--secondary-color); margin-top: 20px;">
                Trial ${this.currentTrial + 1} of ${this.trials.length}
            </p>
        `;
    }

    // Next trial
    nextTrial() {
        this.currentTrial++;
        this.runTrial();
    }

    // Show results
    showResults() {
        // Calculate final scores
        const totalItems = this.responses.reduce((sum, trial) => sum + trial.setSize, 0);
        const partialScore = this.responses.reduce((sum, trial) => sum + trial.score, 0);
        const absoluteScore = this.responses.filter(trial =>
            trial.score === trial.setSize
        ).reduce((sum, trial) => sum + trial.setSize, 0);

        const totalProcessing = this.responses.reduce((sum, trial) =>
            sum + trial.processingResponses.length, 0);
        const correctProcessing = this.responses.reduce((sum, trial) =>
            sum + trial.processingResponses.filter(r => r.correct).length, 0);
        const processingAccuracy = (correctProcessing / totalProcessing * 100).toFixed(1);

        // Save results
        const result = {
            task: this.currentTask,
            date: new Date().toISOString(),
            partialScore: partialScore,
            absoluteScore: absoluteScore,
            totalItems: totalItems,
            processingAccuracy: parseFloat(processingAccuracy),
            processingErrors: this.processingErrors,
            speedErrors: this.speedErrors,
            demographics: this.demographics,
            trials: this.responses
        };

        this.saveResult(result);
        this.displayResults(result);
    }

    // Display results
    displayResults(result) {
        this.showScreen('results');
        const content = document.getElementById('results-content');

        // Determine percentile based on normative data
        const percentile = this.calculatePercentile(result);
        const interpretation = this.getInterpretation(result, percentile);

        content.innerHTML = `
            <div class="results-summary">
                <div class="result-card">
                    <h3>Partial Score</h3>
                    <div class="score-display">${result.partialScore}</div>
                    <div class="percentile">${percentile.partial}th percentile</div>
                    <p style="margin-top: 10px; color: var(--secondary-color);">Total items recalled in correct position</p>
                </div>
                <div class="result-card">
                    <h3>Absolute Score</h3>
                    <div class="score-display">${result.absoluteScore}</div>
                    <div class="percentile">${percentile.absolute}th percentile</div>
                    <p style="margin-top: 10px; color: var(--secondary-color);">Perfectly recalled trials</p>
                </div>
                <div class="result-card">
                    <h3>Processing Accuracy</h3>
                    <div class="score-display">${result.processingAccuracy}%</div>
                    <div class="percentile ${result.processingAccuracy < 85 ? 'warning' : ''}">${result.processingAccuracy < 85 ? 'Below Threshold' : 'Valid'}</div>
                    <p style="margin-top: 10px; color: var(--secondary-color);">Must be ≥85% for valid data</p>
                </div>
            </div>

            <div class="interpretation">
                <h3>Performance Interpretation</h3>
                ${interpretation}
            </div>

            ${result.processingAccuracy < 85 ? `
                <div class="info-box" style="border-left-color: var(--warning-color);">
                    <h3>⚠️ Data Quality Warning</h3>
                    <p>Your processing accuracy (${result.processingAccuracy}%) is below the 85% threshold. This suggests you may not have been fully attending to the processing task, which could invalidate your working memory capacity score.</p>
                    <p>Consider retaking this task and ensuring you focus equally on both the processing and storage components.</p>
                </div>
            ` : ''}
        `;
    }

    // Calculate percentile based on normative data
    calculatePercentile(result) {
        // Normative data from Redick et al. (2012) - Table 3
        const norms = {
            operation: {
                partialMean: 57.36,
                partialSD: 13.65,
                absoluteMean: 42.04,
                absoluteSD: 17.67
            },
            symmetry: {
                partialMean: 27.87,
                partialSD: 8.26,
                absoluteMean: 18.76,
                absoluteSD: 9.62
            },
            rotation: {
                partialMean: 53.81,
                partialSD: 15.09,
                absoluteMean: 36.51,
                absoluteSD: 18.83
            }
        };

        const taskNorm = norms[this.currentTask];
        if (!taskNorm) {
            return { partial: 50, absolute: 50 };
        }

        // Calculate z-scores
        const partialZ = (result.partialScore - taskNorm.partialMean) / taskNorm.partialSD;
        const absoluteZ = (result.absoluteScore - taskNorm.absoluteMean) / taskNorm.absoluteSD;

        // Convert to percentiles
        const partial = Math.round(this.normalCDF(partialZ) * 100);
        const absolute = Math.round(this.normalCDF(absoluteZ) * 100);

        return { partial, absolute };
    }

    // Normal CDF approximation
    normalCDF(z) {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - prob : prob;
    }

    // Get interpretation text
    getInterpretation(result, percentile) {
        let level, description;

        if (percentile.partial >= 75) {
            level = 'High';
            description = 'Your working memory capacity is in the high range. This suggests strong abilities in maintaining information while processing distractions, which is associated with better performance in complex cognitive tasks, reading comprehension, and problem-solving.';
        } else if (percentile.partial >= 50) {
            level = 'Above Average';
            description = 'Your working memory capacity is above average. You demonstrate good ability to maintain and manipulate information in the face of interference, which supports effective performance in most cognitive tasks.';
        } else if (percentile.partial >= 25) {
            level = 'Average';
            description = 'Your working memory capacity is in the average range. This is typical performance for healthy young adults and supports adequate cognitive functioning in daily tasks.';
        } else {
            level = 'Below Average';
            description = 'Your working memory capacity is below average. This may reflect difficulty maintaining information while processing distractions. However, working memory can be improved through practice and targeted training.';
        }

        return `
            <p><strong>Overall Level: ${level} (${percentile.partial}th percentile)</strong></p>
            <p>${description}</p>
            <p style="margin-top: 15px;"><strong>Research Context:</strong></p>
            <p>Based on research by Draheim et al. (2017), Conway et al. (2005), and Redick et al. (2012), working memory capacity as measured by complex span tasks is strongly related to:</p>
            <ul>
                <li>Fluid intelligence and reasoning ability</li>
                <li>Reading comprehension and language processing</li>
                <li>Attention control and resistance to distraction</li>
                <li>Academic and professional performance</li>
            </ul>
        `;
    }

    // Save result to localStorage
    saveResult(result) {
        this.results.push(result);
        localStorage.setItem('wmcResults', JSON.stringify(this.results));
    }

    // Load results from localStorage
    loadResults() {
        const stored = localStorage.getItem('wmcResults');
        return stored ? JSON.parse(stored) : [];
    }

    // View all results
    viewResults() {
        if (this.results.length === 0) {
            alert('No results yet. Complete a task first!');
            return;
        }

        this.showScreen('results');
        const content = document.getElementById('results-content');

        const resultsByTask = {
            operation: this.results.filter(r => r.task === 'operation'),
            symmetry: this.results.filter(r => r.task === 'symmetry'),
            rotation: this.results.filter(r => r.task === 'rotation')
        };

        content.innerHTML = '<h2>Your Testing History</h2>';

        for (const [task, results] of Object.entries(resultsByTask)) {
            if (results.length > 0) {
                const taskName = task.charAt(0).toUpperCase() + task.slice(1) + ' Span';
                const latestResult = results[results.length - 1];
                const avgPartial = results.reduce((sum, r) => sum + r.partialScore, 0) / results.length;

                content.innerHTML += `
                    <div class="result-card" style="margin: 20px 0;">
                        <h3>${taskName}</h3>
                        <p>Sessions completed: ${results.length}</p>
                        <p>Latest score: ${latestResult.partialScore} (${new Date(latestResult.date).toLocaleDateString()})</p>
                        <p>Average score: ${avgPartial.toFixed(1)}</p>
                    </div>
                `;
            }
        }
    }

    // Export results as JSON
    exportResults() {
        const dataStr = JSON.stringify(this.results, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wmc-results-${new Date().toISOString()}.json`;
        link.click();
    }

    // Helper: Get random letter
    getRandomLetter() {
        return this.letters[Math.floor(Math.random() * this.letters.length)];
    }

    // Helper: Get random arrow
    getRandomArrow() {
        return this.arrows[Math.floor(Math.random() * this.arrows.length)];
    }

    // Helper: Get random grid position
    getRandomGridPosition() {
        return {
            row: Math.floor(Math.random() * 4),
            col: Math.floor(Math.random() * 4)
        };
    }

    // Helper: Generate math problem
    generateMathProblem() {
        const operations = [
            { op: '+', fn: (a, b) => a + b },
            { op: '-', fn: (a, b) => a - b },
            { op: '×', fn: (a, b) => a * b }
        ];

        // Generate two operations like (a op1 b) op2 c
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const c = Math.floor(Math.random() * 9) + 1;

        const op1 = operations[Math.floor(Math.random() * operations.length)];
        const op2 = operations[Math.floor(Math.random() * 2)]; // Only + and - for second op

        const step1 = op1.fn(a, b);
        const correctAnswer = op2.fn(step1, c);

        // 50% chance of showing correct answer
        const showCorrect = Math.random() < 0.5;
        const shownAnswer = showCorrect ? correctAnswer : correctAnswer + (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 3) + 1);

        return {
            equation: `(${a} ${op1.op} ${b}) ${op2.op} ${c}`,
            answer: shownAnswer,
            correct: showCorrect
        };
    }

    // Helper: Generate symmetry pattern
    generateSymmetryPattern() {
        const grid = Array(8).fill(null).map(() => Array(8).fill(false));
        const symmetrical = Math.random() < 0.5;

        // Fill half the grid
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 4; col++) {
                if (Math.random() < 0.4) {
                    grid[row][col] = true;
                    if (symmetrical) {
                        grid[row][7 - col] = true;
                    }
                }
            }
        }

        // If not symmetrical, randomly flip some cells on the right side
        if (!symmetrical) {
            for (let row = 0; row < 8; row++) {
                for (let col = 4; col < 8; col++) {
                    grid[row][col] = Math.random() < 0.4;
                }
            }
        }

        return { grid, symmetrical };
    }

    // Helper: Generate rotated letter
    generateRotatedLetter() {
        const letter = this.rotationLetters[Math.floor(Math.random() * this.rotationLetters.length)];
        const rotation = [0, 45, 90, 135, 180, 225, 270, 315][Math.floor(Math.random() * 8)];
        const mirrored = Math.random() < 0.5;

        return { letter, rotation, mirrored };
    }

    // Helper: Render symmetry grid
    renderSymmetryGrid(grid) {
        let html = '<div class="symmetry-grid">';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                html += `<div class="symmetry-cell ${grid[row][col] ? 'filled' : ''}"></div>`;
            }
        }
        html += '</div>';
        return html;
    }

    // Helper: Render memory grid (single highlighted cell)
    renderMemoryGrid(position) {
        let html = '<div class="memory-grid">';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const highlighted = (row === position.row && col === position.col);
                html += `<div class="memory-cell ${highlighted ? 'selected' : ''}"></div>`;
            }
        }
        html += '</div>';
        return html;
    }

    // Helper: Render memory recall grid
    renderMemoryRecallGrid() {
        let html = '<div class="memory-grid">';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                html += `<div class="memory-cell" onclick="window.app.addToRecall({row: ${row}, col: ${col}})"></div>`;
            }
        }
        html += '</div>';
        return html;
    }

    // Helper: Render letter grid
    renderLetterGrid() {
        let html = '<div class="letter-grid">';
        for (const letter of this.letters) {
            html += `<button class="letter-button" onclick="window.app && window.app.addToRecall('${letter}')">${letter}</button>`;
        }
        html += '</div>';
        return html;
    }

    // Helper: Render arrow grid
    renderArrowGrid() {
        let html = '<div class="arrow-grid">';
        for (const arrow of this.arrows) {
            html += `<button class="arrow-button" onclick="window.app && window.app.addToRecall('${arrow}')">${arrow}</button>`;
        }
        html += '</div>';
        return html;
    }

    // Helper: Shuffle array
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Initialize app when DOM is ready
let app = null;

function initializeApp() {
    if (!app) {
        console.log('Initializing WMC Trainer...');
        app = new WMCTrainer();
        // Make app globally accessible for onclick handlers
        window.app = app;
        console.log('App initialized and available globally:', window.app);
    }
}

if (document.readyState === 'loading') {
    console.log('Waiting for DOM...');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    console.log('DOM already loaded, initializing...');
    initializeApp();
}
