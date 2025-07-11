class PhaseController {
    constructor() {
        this.textId = document.querySelector('[data-text-id]')?.getAttribute('data-text-id');
        this.currentPhase = 'reading';
        this.sessionId = null;
        this.init();
    }

    init() {
        this.loadCurrentSession();
        this.setupPhaseControls();
        this.hideQuestionsInReadingPhase(); // 初期状態で問題を非表示
    }

    loadCurrentSession() {
        fetch(`/api/get-reading-session/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentPhase = data.session.current_phase;
                    this.sessionId = data.session.id;
                    this.updatePhaseDisplay();
                    this.controlQuestionsVisibility();
                }
            })
            .catch(error => {
                console.error('セッション読み込みエラー:', error);
            });
    }

    setupPhaseControls() {
        // 読解完了ボタンの追加
        const phaseControl = document.createElement('div');
        phaseControl.className = 'phase-control-area';
        phaseControl.innerHTML = `
            <div class="card mt-4 border-primary">
                <div class="card-header bg-primary text-white">
                    <h5 id="phase-title">📖 読解フェーズ</h5>
                </div>
                <div class="card-body">
                    <div id="reading-phase-content">
                        <p>文章をじっくり読み、分析ツールを使って理解を深めてください。</p>
                        <div class="alert alert-info">
                            <strong>📚 読解フェーズ</strong><br>
                            このフェーズでは問題は表示されません。文章の理解に集中してください。
                        </div>
                        <button class="btn btn-success btn-lg w-100" id="complete-reading-btn">
                            ✅ 読解を完了して解答フェーズへ進む
                        </button>
                        <small class="text-muted d-block mt-2">
                            ※ 解答フェーズでは文章の表示が制限されます
                        </small>
                    </div>
                    <div id="answering-phase-content" style="display: none;">
                        <div class="alert alert-warning">
                            <strong>✏️ 解答フェーズ</strong><br>
                            問題に答えてください。文章の表示は問題設定により制限されます。
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary flex-fill" id="view-memos-btn">
                                📝 作成したメモを確認
                            </button>
                            <button class="btn btn-warning flex-fill" id="back-to-reading-btn">
                                ↩️ 読解フェーズに戻る
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 文章表示エリアの後に挿入
        const textCard = document.querySelector('.text-content').closest('.card');
        textCard.parentNode.insertBefore(phaseControl, textCard.nextSibling);

        // イベントリスナー
        document.getElementById('complete-reading-btn').addEventListener('click', () => {
            this.transitionToAnsweringPhase();
        });

        document.getElementById('back-to-reading-btn').addEventListener('click', () => {
            this.transitionToReadingPhase();
        });

        document.getElementById('view-memos-btn').addEventListener('click', () => {
            this.showMemosModal();
        });
    }

    transitionToAnsweringPhase() {
        if (!confirm('読解フェーズを完了して解答フェーズに進みますか？\n解答フェーズでは文章の表示が制限されます。')) {
            return;
        }

        fetch('/api/transition-to-answering/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.currentPhase = 'answering';
                this.sessionId = data.session_id;
                this.updatePhaseDisplay();
                this.controlQuestionsVisibility();
                this.controlTextVisibility();
            }
        })
        .catch(error => {
            console.error('フェーズ移行エラー:', error);
            alert('フェーズの移行に失敗しました。');
        });
    }

    transitionToReadingPhase() {
        if (!confirm('読解フェーズに戻りますか？')) return;

        fetch('/api/transition-to-reading/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.currentPhase = 'reading';
                this.updatePhaseDisplay();
                this.controlQuestionsVisibility();
                this.showTextContent();
            }
        })
        .catch(error => {
            console.error('フェーズ移行エラー:', error);
            alert('フェーズの移行に失敗しました。');
        });
    }

    updatePhaseDisplay() {
        const phaseTitle = document.getElementById('phase-title');
        const readingContent = document.getElementById('reading-phase-content');
        const answeringContent = document.getElementById('answering-phase-content');

        if (this.currentPhase === 'reading') {
            phaseTitle.textContent = '📖 読解フェーズ';
            readingContent.style.display = 'block';
            answeringContent.style.display = 'none';
        } else if (this.currentPhase === 'answering') {
            phaseTitle.textContent = '✏️ 解答フェーズ';
            readingContent.style.display = 'none';
            answeringContent.style.display = 'block';
        }
    }

    controlQuestionsVisibility() {
        const questionsCard = this.findQuestionsCard();
        if (!questionsCard) return;

        if (this.currentPhase === 'reading') {
            // 読解フェーズでは問題を非表示
            questionsCard.style.display = 'none';
        } else if (this.currentPhase === 'answering') {
            // 解答フェーズでは問題を表示
            questionsCard.style.display = 'block';
            this.setupQuestionTextVisibility();
        }
    }

    hideQuestionsInReadingPhase() {
        const questionsCard = this.findQuestionsCard();
        if (questionsCard) {
            questionsCard.style.display = 'none';
        }
    }

    findQuestionsCard() {
        // 問題カードを探す（複数の方法で試行）
        let questionsCard = document.querySelector('.card h4');
        if (questionsCard && questionsCard.textContent.includes('問題')) {
            return questionsCard.closest('.card');
        }

        // 代替方法：問題を含むカードを探す
        const cards = document.querySelectorAll('.card');
        for (let card of cards) {
            const header = card.querySelector('.card-header h4');
            if (header && header.textContent.includes('問題')) {
                return card;
            }
        }

        return null;
    }

    setupQuestionTextVisibility() {
        // 各問題の文章表示制御を設定
        const questionItems = document.querySelectorAll('[data-question-id]');
        questionItems.forEach(item => {
            const hideText = item.dataset.hideText === 'true';
            const allowNotesOnly = item.dataset.allowNotesOnly === 'true';
            
            if (hideText) {
                this.addTextHiddenWarning(item);
            }
        });
    }

    addTextHiddenWarning(questionElement) {
        const warning = document.createElement('div');
        warning.className = 'alert alert-warning mt-2';
        warning.innerHTML = `
            <strong>📵 文章非表示問題</strong><br>
            この問題では元の文章を参照できません。作成したメモのみを参考に回答してください。
        `;
        questionElement.appendChild(warning);
    }

    controlTextVisibility() {
        // 解答フェーズでの文章表示制御（将来の拡張用）
        if (this.currentPhase === 'answering') {
            // 必要に応じて文章の表示/非表示を制御
        }
    }

    showTextContent() {
        const textCard = document.querySelector('.text-content').closest('.card');
        textCard.style.display = 'block';
        
        // 警告メッセージを削除
        const warnings = document.querySelectorAll('.alert-warning');
        warnings.forEach(warning => {
            if (warning.textContent.includes('文章は非表示')) {
                warning.remove();
            }
        });
    }

    showMemosModal() {
        fetch(`/api/get-all-memos/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.displayMemosModal(data.memos);
                }
            })
            .catch(error => {
                console.error('メモ読み込みエラー:', error);
            });
    }

    displayMemosModal(memos) {
        const modal = document.createElement('div');
        modal.className = 'memos-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="
                background-color: white;
                border-radius: 8px;
                padding: 30px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <div class="modal-header d-flex justify-content-between align-items-center mb-4">
                    <h3>📝 あなたが作成したメモ</h3>
                    <button class="btn btn-outline-secondary close-modal-btn">✕ 閉じる</button>
                </div>
                <div class="modal-body">
                    ${this.generateMemosDisplay(memos)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal-btn')) {
                modal.remove();
            }
        });
    }

    generateMemosDisplay(memos) {
        if (memos.length === 0) {
            return '<p class="text-muted">まだメモが作成されていません。</p>';
        }

        const groupedMemos = this.groupMemosByType(memos);
        let html = '';

        Object.keys(groupedMemos).forEach(type => {
            const typeLabel = this.getTypeLabel(type);
            const typeMemos = groupedMemos[type];
            
            html += `
                <div class="memo-section mb-4">
                    <h5>${typeLabel}</h5>
                    ${typeMemos.map(memo => `
                        <div class="memo-item p-3 border rounded mb-2">
                            <h6>${memo.title}</h6>
                            ${this.formatMemoContent(memo)}
                            <small class="text-muted">${new Date(memo.created_at).toLocaleString('ja-JP')}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        return html;
    }

    groupMemosByType(memos) {
        const grouped = {};
        memos.forEach(memo => {
            if (!grouped[memo.type]) {
                grouped[memo.type] = [];
            }
            grouped[memo.type].push(memo);
        });
        return grouped;
    }

    getTypeLabel(type) {
        const labels = {
            'paragraph': '📝 段落定義',
            'logic-structure': '🔗 論理構造分析',
            'causal-map': '⚡ 因果関係マップ',
            'concept-map': '🗺️ 概念マップ',
            'argument-analysis': '⚖️ 論証構造分析',
            'perspective-analysis': '👁️ 多角的視点分析'
        };
        return labels[type] || type;
    }

    formatMemoContent(memo) {
        const data = memo.data;
        switch (memo.type) {
            case 'logic-structure':
                return `<p><strong>関係:</strong> ${data.logicType}<br><strong>分析:</strong> ${data.description}</p>`;
            case 'causal-map':
                return `<p><strong>原因:</strong> ${data.cause}<br><strong>結果:</strong> ${data.effect}<br><strong>分析:</strong> ${data.analysis}</p>`;
            case 'concept-map':
                return `<p><strong>中心概念:</strong> ${data.centralConcept}<br><strong>関連概念:</strong> ${data.relatedConcept}<br><strong>関係:</strong> ${data.relationship}</p>`;
            case 'argument-analysis':
                return `<p><strong>要素:</strong> ${data.elementType}<br><strong>内容:</strong> ${data.content}</p>`;
            case 'perspective-analysis':
                return `<p><strong>視点:</strong> ${data.viewpoint}<br><strong>解釈:</strong> ${data.interpretation}</p>`;
            case 'paragraph':
                return `<p>${memo.content}</p>`;
            default:
                return `<p>${memo.content || JSON.stringify(data)}</p>`;
        }
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new PhaseController();
});
