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
    }

    loadCurrentSession() {
        fetch(`/api/get-reading-session/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentPhase = data.session.current_phase;
                    this.sessionId = data.session.id;
                    this.updatePhaseDisplay();
                }
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
                        <button class="btn btn-success btn-lg w-100" id="complete-reading-btn">
                            ✅ 読解を完了して解答フェーズへ進む
                        </button>
                        <small class="text-muted d-block mt-2">
                            ※ 解答フェーズでは文章を見ることができません
                        </small>
                    </div>
                    <div id="answering-phase-content" style="display: none;">
                        <p>あなたが作成したメモを参考に問題に答えてください。</p>
                        <button class="btn btn-primary" id="view-memos-btn">
                            📝 作成したメモを確認
                        </button>
                        <button class="btn btn-warning" id="back-to-reading-btn">
                            ↩️ 読解フェーズに戻る
                        </button>
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
        if (!confirm('読解フェーズを完了して解答フェーズに進みますか？\n解答フェーズでは文章を見ることができません。')) {
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
                this.hideTextContent();
                this.showQuestions();
            }
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
                this.showTextContent();
                this.hideQuestions();
            }
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

    hideTextContent() {
        const textContent = document.querySelector('.text-content');
        const textCard = textContent.closest('.card');
        textCard.style.display = 'none';

        // 文章非表示の警告を表示
        const warning = document.createElement('div');
        warning.className = 'alert alert-warning text-center';
        warning.innerHTML = `
            <h4>📵 解答フェーズ</h4>
            <p>文章は非表示になっています。<br>あなたが作成したメモのみを参考に問題に答えてください。</p>
        `;
        textCard.parentNode.insertBefore(warning, textCard);
    }

    showTextContent() {
        const textCard = document.querySelector('.text-content').closest('.card');
        textCard.style.display = 'block';
        
        // 警告メッセージを削除
        const warning = document.querySelector('.alert-warning');
        if (warning) warning.remove();
    }

    showMemosModal() {
        fetch(`/api/get-all-memos/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.displayMemosModal(data.memos);
                }
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
        // メモの内容を読みやすく整形
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

    showQuestions() {
        // 問題セクションを表示
        const questionsCard = document.querySelector('.card h4');
        if (questionsCard) {
            const card = questionsCard.closest('.card');
            card.style.display = 'block';
        }
    }

    hideQuestions() {
        // 問題セクションを非表示
        const questionsCard = document.querySelector('.card h4');
        if (questionsCard) {
            const card = questionsCard.closest('.card');
            card.style.display = 'none';
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
