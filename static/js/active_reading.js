class ActiveReadingTools {
    // constructor内に追加
    constructor() {
        this.textId = document.querySelector('[data-text-id]')?.getAttribute('data-text-id');
        this.paragraphs = [];
        this.currentTool = null;
        this.conceptMapData = { nodes: [], links: [] };
        this.argumentData = { claims: [], evidence: [], conclusions: [] };
        this.activeReadingContent = [];
        this.userParagraphs = []; // 新機能: ユーザー定義段落
        this.paragraphMode = false; // 新機能: 段落番号付与モード
        this.nextParagraphNumber = 1; // 新機能: 次の段落番号
        this.init();
    }

    // 段落番号付与モードの切り替え
    toggleParagraphMode() {
        this.paragraphMode = !this.paragraphMode;
        const textContent = document.querySelector('.text-content');
        const toggleBtn = document.querySelector('.toggle-paragraph-mode-btn');

        if (this.paragraphMode) {
            textContent.classList.add('paragraph-selection-mode');
            toggleBtn.textContent = '📝 段落番号付与モード（ON）';
            toggleBtn.classList.remove('btn-outline-secondary');
            toggleBtn.classList.add('btn-warning');
            this.showParagraphModeInstructions();
        } else {
            textContent.classList.remove('paragraph-selection-mode');
            toggleBtn.textContent = '📝 段落番号付与モード（OFF）';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-outline-secondary');
            this.hideParagraphModeInstructions();
        }
    }

    showParagraphModeInstructions() {
        const existingInstructions = document.querySelector('.paragraph-instructions');
        if (existingInstructions) return;

        const instructions = document.createElement('div');
        instructions.className = 'paragraph-instructions alert alert-warning mt-2';
        instructions.innerHTML = `
        <strong>段落番号付与モード</strong><br>
        文章の一部を選択して「段落番号を追加」ボタンをクリックしてください。<br>
        <small>選択した範囲が段落${this.nextParagraphNumber}として登録されます。</small>
    `;

        const rightColumn = document.querySelector('.col-md-4');
        if (rightColumn) {
            rightColumn.insertBefore(instructions, rightColumn.firstChild);
        }
    }

    hideParagraphModeInstructions() {
        const instructions = document.querySelector('.paragraph-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    // 段落番号追加機能
    addParagraphNumber() {
        const selection = window.getSelection();
        if (selection.toString().length === 0) {
            alert('段落として登録したい文章を選択してください。');
            return;
        }

        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const startOffset = this.getTextOffset(range.startContainer, range.startOffset);
        const endOffset = this.getTextOffset(range.endContainer, range.endOffset);

        // 重複チェック
        const isOverlapping = this.userParagraphs.some(p =>
            (startOffset >= p.startOffset && startOffset < p.endOffset) ||
            (endOffset > p.startOffset && endOffset <= p.endOffset) ||
            (startOffset <= p.startOffset && endOffset >= p.endOffset)
        );

        if (isOverlapping) {
            alert('選択した範囲は既に他の段落と重複しています。');
            return;
        }

        // 段落を追加
        const paragraph = {
            number: this.nextParagraphNumber,
            content: selectedText,
            startOffset: startOffset,
            endOffset: endOffset,
            createdAt: new Date()
        };

        this.userParagraphs.push(paragraph);
        this.nextParagraphNumber++;

        // 視覚的に段落を表示
        this.visualizeParagraph(range, paragraph.number);

        // サーバーに保存
        this.saveParagraphDefinition(paragraph);

        // 選択をクリア
        selection.removeAllRanges();

        // 段落リストを更新
        this.updateParagraphList();

        alert(`段落${paragraph.number}を追加しました。`);
    }

    visualizeParagraph(range, paragraphNumber) {
        try {
            const span = document.createElement('span');
            span.className = 'user-defined-paragraph';
            span.dataset.paragraphNumber = paragraphNumber;
            span.style.cssText = `
            border-left: 3px solid #007bff;
            padding-left: 5px;
            background-color: rgba(0, 123, 255, 0.1);
            position: relative;
        `;

            // 段落番号を表示するバッジ
            const badge = document.createElement('span');
            badge.className = 'paragraph-badge';
            badge.textContent = paragraphNumber;
            badge.style.cssText = `
            position: absolute;
            left: -15px;
            top: 0;
            background-color: #007bff;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        `;

            range.surroundContents(span);
            span.appendChild(badge);
        } catch (e) {
            console.error('段落の視覚化エラー:', e);
        }
    }

    updateParagraphList() {
        const existingList = document.querySelector('.user-paragraphs-list');
        if (existingList) {
            existingList.remove();
        }

        if (this.userParagraphs.length === 0) return;

        const paragraphList = document.createElement('div');
        paragraphList.className = 'user-paragraphs-list card mt-3';
        paragraphList.innerHTML = `
        <div class="card-header">
            <h6>定義した段落</h6>
        </div>
        <div class="card-body" style="max-height: 200px; overflow-y: auto;">
            ${this.userParagraphs.map(p => `
                <div class="paragraph-item-small mb-2 p-2 border rounded">
                    <strong>段落${p.number}</strong>
                    <div class="small text-muted">${p.content.substring(0, 50)}...</div>
                    <button class="btn btn-sm btn-outline-danger delete-paragraph-btn" data-paragraph-number="${p.number}">削除</button>
                </div>
            `).join('')}
        </div>
    `;

        const rightColumn = document.querySelector('.col-md-4');
        if (rightColumn) {
            rightColumn.appendChild(paragraphList);
        }

        // 削除ボタンのイベントリスナー
        paragraphList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-paragraph-btn')) {
                const paragraphNumber = parseInt(e.target.dataset.paragraphNumber);
                this.deleteParagraph(paragraphNumber);
            }
        });
    }

    deleteParagraph(paragraphNumber) {
        if (!confirm(`段落${paragraphNumber}を削除しますか？`)) return;

        // 視覚的表示を削除
        const paragraphElement = document.querySelector(`[data-paragraph-number="${paragraphNumber}"]`);
        if (paragraphElement) {
            const parent = paragraphElement.parentNode;
            while (paragraphElement.firstChild) {
                parent.insertBefore(paragraphElement.firstChild, paragraphElement);
            }
            parent.removeChild(paragraphElement);
            parent.normalize();
        }

        // データから削除
        this.userParagraphs = this.userParagraphs.filter(p => p.number !== paragraphNumber);

        // リストを更新
        this.updateParagraphList();

        // サーバーからも削除
        this.deleteParagraphDefinition(paragraphNumber);
    }

    saveParagraphDefinition(paragraph) {
        fetch('/api/save-paragraph-definition/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId,
                paragraph_number: paragraph.number,
                content: paragraph.content,
                start_offset: paragraph.startOffset,
                end_offset: paragraph.endOffset
            })
        })
            .catch(error => {
                console.error('段落定義保存エラー:', error);
            });
    }

    deleteParagraphDefinition(paragraphNumber) {
        fetch(`/api/delete-paragraph-definition/${this.textId}/${paragraphNumber}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': this.getCsrfToken()
            }
        })
            .catch(error => {
                console.error('段落定義削除エラー:', error);
            });
    }

    loadUserParagraphs() {
        fetch(`/api/get-paragraph-definitions/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.userParagraphs = data.paragraphs;
                    this.nextParagraphNumber = Math.max(...this.userParagraphs.map(p => p.number), 0) + 1;
                    this.updateParagraphList();
                    // 視覚的表示の復元は複雑なため、ページリロード時のみ対応
                }
            })
            .catch(error => {
                console.error('段落定義読み込みエラー:', error);
            });
    }


    init() {
        this.setupParagraphs();
        this.setupToolbar();
        this.setupEventListeners();
        this.loadActiveReadingContent();
        // updateRightSidebarDisplay() は loadActiveReadingContent() の完了後に呼ばれる
    }


    setupParagraphs() {
        const textContent = document.querySelector('.text-content');
        if (!textContent) return;

        const paragraphElements = textContent.querySelectorAll('p');
        paragraphElements.forEach((p, index) => {
            if (p.textContent.trim().length > 0) {
                p.dataset.paragraphNumber = index + 1;
                p.classList.add('paragraph-item');
                this.paragraphs.push({
                    number: index + 1,
                    element: p,
                    content: p.textContent.trim()
                });
            }
        });
    }

    setupToolbar() {
        // ページ下部にワイドなツールバーを配置
        const toolbar = document.createElement('div');
        toolbar.className = 'active-reading-toolbar-bottom';
        toolbar.innerHTML = `
        <div class="container-fluid">
            <div class="card">
                <div class="card-header">
                    <h5>ブックスカンク🦨文章分析ツール</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <button class="btn btn-outline-info w-100 tool-btn mb-2" data-tool="logic-structure">
                                🔗 論理構造分析
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-danger w-100 tool-btn mb-2" data-tool="causal-map">
                                ⚡ 因果関係マップ
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-secondary w-100 tool-btn mb-2" data-tool="concept-map">
                                🗺️ 概念マップ
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-primary w-100 tool-btn mb-2" data-tool="argument-analysis">
                                ⚖️ 論証構造分析
                            </button>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <button class="btn btn-outline-success w-100 tool-btn" data-tool="perspective-analysis">
                                👁️ 多角的視点分析
                            </button>
                        </div>
                        <div class="col-md-6">
                            <button class="btn btn-outline-warning w-100" id="clear-current-tool">
                                🗑️ 現在のツールを閉じる
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="active-tool-workspace" class="mt-3" style="display: none;">
                <!-- ツールのワークスペースがここに表示される -->
            </div>
        </div>
    `;

        // ページの最下部に追加
        document.body.appendChild(toolbar);
    }


    // setupEventListeners() メソッド内に以下を追加
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tool-btn')) {
                const tool = e.target.dataset.tool;
                this.activateTool(tool);
            }
            if (e.target.id === 'clear-current-tool') {
                this.clearCurrentTool();
            }
            if (e.target.classList.contains('edit-content-btn')) {
                this.editActiveReadingContent(e.target.dataset.contentId);
            }
            if (e.target.classList.contains('delete-content-btn')) {
                this.deleteActiveReadingContent(e.target.dataset.contentId);
            }
            // 新機能: コンテンツブロックのクリック
            if (e.target.closest('.content-clickable')) {
                const contentId = e.target.closest('.content-clickable').dataset.contentId;
                this.showContentDetailModal(contentId);
            }
            // 段落番号付与機能
            if (e.target.classList.contains('add-paragraph-btn')) {
                this.addParagraphNumber();
            }
            if (e.target.classList.contains('toggle-paragraph-mode-btn')) {
                this.toggleParagraphMode();
            }
        });
    }

    // コンテンツ詳細モーダル表示
    showContentDetailModal(contentId) {
        const content = this.activeReadingContent.find(c => c.id == contentId);
        if (!content) return;

        const iconMap = {
            'logic-structure': '🔗',
            'causal-map': '⚡',
            'concept-map': '🗺️',
            'argument-analysis': '⚖️',
            'perspective-analysis': '👁️'
        };

        const modal = document.createElement('div');
        modal.className = 'content-detail-modal';
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
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
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            margin: 20px;
        ">
            <div class="modal-header d-flex justify-content-between align-items-center mb-4">
                <h4>${iconMap[content.content_type]} ${content.title}</h4>
                <button class="btn btn-outline-secondary close-modal-btn">✕ 閉じる</button>
            </div>
            <div class="modal-body">
                ${this.generateDetailedContentModal(content)}
            </div>
            <div class="modal-footer mt-4">
                <div class="d-flex justify-content-between">
                    <small class="text-muted">作成日時: ${new Date(content.created_at).toLocaleString('ja-JP')}</small>
                    <div>
                        <button class="btn btn-primary edit-content-btn" data-content-id="${content.id}">編集</button>
                        <button class="btn btn-danger delete-content-btn" data-content-id="${content.id}">削除</button>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        // モーダルを閉じるイベント
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal-btn')) {
                modal.remove();
            }
        });

        // ESCキーでモーダルを閉じる
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    generateDetailedContentModal(content) {
        const data = content.data;
        switch (content.content_type) {
            case 'logic-structure':
                return `
                <div class="row">
                    <div class="col-md-6">
                        <h6>論理関係の種類</h6>
                        <p class="alert alert-info">${this.getLogicTypeLabel(data.logicType)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>関係する段落</h6>
                        <p class="alert alert-secondary">段落${data.fromParagraph} → 段落${data.toParagraph}</p>
                    </div>
                </div>
                <h6>詳細分析</h6>
                <div class="alert alert-light">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.description}</p>
                </div>
            `;
            case 'causal-map':
                return `
                <div class="row">
                    <div class="col-md-6">
                        <h6>原因</h6>
                        <div class="alert alert-warning">
                            <p style="white-space: pre-wrap; line-height: 1.6;">${data.cause}</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>結果</h6>
                        <div class="alert alert-danger">
                            <p style="white-space: pre-wrap; line-height: 1.6;">${data.effect}</p>
                        </div>
                    </div>
                </div>
                <h6>因果関係の分析</h6>
                <div class="alert alert-light">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.analysis}</p>
                </div>
            `;
            case 'concept-map':
                return `
                <div class="row">
                    <div class="col-md-6">
                        <h6>中心概念</h6>
                        <p class="alert alert-primary">${data.centralConcept}</p>
                        <h6>関連概念</h6>
                        <p class="alert alert-success">${data.relatedConcept}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>概念間の関係</h6>
                        <p class="alert alert-info">${data.relationship}</p>
                    </div>
                </div>
                <h6>関係の詳細説明</h6>
                <div class="alert alert-light">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.explanation}</p>
                </div>
            `;
            case 'argument-analysis':
                return `
                <div class="row">
                    <div class="col-md-12">
                        <h6>論証要素</h6>
                        <p class="alert alert-primary">${this.getArgumentElementLabel(data.elementType)}</p>
                    </div>
                </div>
                <h6>内容</h6>
                <div class="alert alert-light">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.content}</p>
                </div>
                <h6>分析・評価</h6>
                <div class="alert alert-warning">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.evaluation}</p>
                </div>
            `;
            case 'perspective-analysis':
                return `
                <div class="row">
                    <div class="col-md-12">
                        <h6>視点・立場</h6>
                        <p class="alert alert-primary">${data.viewpoint}</p>
                    </div>
                </div>
                <h6>その視点からの解釈</h6>
                <div class="alert alert-light">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.interpretation}</p>
                </div>
                <h6>他の視点との比較</h6>
                <div class="alert alert-info">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${data.comparison}</p>
                </div>
            `;
            default:
                return '<p>詳細情報を表示できません。</p>';
        }
    }

    activateTool(toolName) {
        this.currentTool = toolName;

        const workspace = document.getElementById('active-tool-workspace');
        workspace.style.display = 'block';
        workspace.innerHTML = '';

        switch (toolName) {
            case 'logic-structure':
                this.showLogicStructureTool();
                break;
            case 'causal-map':
                this.showCausalMapTool();
                break;
            case 'concept-map':
                this.showConceptMapTool();
                break;
            case 'argument-analysis':
                this.showArgumentAnalysisTool();
                break;
            case 'perspective-analysis':
                this.showPerspectiveAnalysisTool();
                break;
        }

        // ツールエリアまでスクロール
        workspace.scrollIntoView({ behavior: 'smooth' });
    }

    clearCurrentTool() {
        const workspace = document.getElementById('active-tool-workspace');
        workspace.style.display = 'none';
        workspace.innerHTML = '';
        this.currentTool = null;
    }

    // 論理構造分析ツール
    showLogicStructureTool() {
        const workspace = document.getElementById('active-tool-workspace');

        // ユーザー定義段落と元の段落を統合
        const allParagraphs = [
            ...this.paragraphs.map(p => ({ number: `元${p.number}`, label: `元の段落${p.number}` })),
            ...this.userParagraphs.map(p => ({ number: p.number, label: `段落${p.number}（あなたが定義）` }))
        ];

        workspace.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5>🔗 論理構造分析</h5>
                <small class="text-muted">文章の論理的つながりを深く分析してください</small>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        ${this.userParagraphs.length === 0 ?
                '<div class="alert alert-info">段落番号を定義すると、より詳細な分析ができます。右側の「段落番号付与」機能をお試しください。</div>' :
                ''
            }
                        <div class="mb-3">
                            <label class="form-label">論理関係の種類</label>
                            <select class="form-select" id="logic-type">
                                <option value="sequence">順序・時系列</option>
                                <option value="cause-effect">原因・結果</option>
                                <option value="comparison">比較・対照</option>
                                <option value="problem-solution">問題・解決</option>
                                <option value="general-specific">一般・具体</option>
                                <option value="premise-conclusion">前提・結論</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">関係する段落</label>
                            <div class="row">
                                <div class="col-6">
                                    <select class="form-select" id="logic-from">
                                        <option value="">段落を選択</option>
                                        ${allParagraphs.map(p => `<option value="${p.number}">${p.label}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-6">
                                    <select class="form-select" id="logic-to">
                                        <option value="">段落を選択</option>
                                        ${allParagraphs.map(p => `<option value="${p.number}">${p.label}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">関係の詳細分析</label>
                            <textarea class="form-control" id="logic-description" rows="4" placeholder="この論理関係について詳しく分析してください。なぜこの関係があるのか、どのような根拠があるのかを記述してください..."></textarea>
                        </div>
                        <button class="btn btn-primary" id="save-logic-analysis">分析を保存</button>
                    </div>
                    <div class="col-md-6">
                        <h6>保存された論理構造分析</h6>
                        <div id="logic-content-display" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                            <!-- 保存された内容がここに表示される -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.getElementById('save-logic-analysis').addEventListener('click', () => {
            this.saveLogicAnalysis();
        });

        this.displayToolContent('logic-structure');
    }


    // 因果関係マップツール
    showCausalMapTool() {
        const workspace = document.getElementById('active-tool-workspace');
        workspace.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>⚡ 因果関係マップ</h5>
                    <small class="text-muted">原因と結果の複雑な関係を整理・分析してください</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">原因</label>
                                <textarea class="form-control" id="cause-input" rows="3" placeholder="原因となる事象や状況を詳しく記述してください..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">結果</label>
                                <textarea class="form-control" id="effect-input" rows="3" placeholder="結果として生じる事象や状況を詳しく記述してください..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">因果関係の分析</label>
                                <textarea class="form-control" id="causal-analysis" rows="3" placeholder="なぜこの因果関係が成り立つのか、どのような条件や背景があるのかを分析してください..."></textarea>
                            </div>
                            <button class="btn btn-primary" id="save-causal-analysis">因果関係を保存</button>
                        </div>
                        <div class="col-md-6">
                            <h6>保存された因果関係分析</h6>
                            <div id="causal-content-display" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                <!-- 保存された内容がここに表示される -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('save-causal-analysis').addEventListener('click', () => {
            this.saveCausalAnalysis();
        });

        this.displayToolContent('causal-map');
    }

    // 概念マップツール
    showConceptMapTool() {
        const workspace = document.getElementById('active-tool-workspace');
        workspace.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>🗺️ 概念マップ</h5>
                    <small class="text-muted">文章中の概念間の複雑な関係を視覚化してください</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">中心概念</label>
                                <input type="text" class="form-control" id="central-concept" placeholder="文章の中心となる概念">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">関連概念</label>
                                <input type="text" class="form-control" id="related-concept" placeholder="関連する概念">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">概念間の関係</label>
                                <input type="text" class="form-control" id="concept-relationship" placeholder="どのような関係があるか（例：〜の原因、〜の結果、〜の一部）">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">関係の詳細説明</label>
                                <textarea class="form-control" id="concept-explanation" rows="3" placeholder="この概念間の関係について詳しく説明してください..."></textarea>
                            </div>
                            <button class="btn btn-primary" id="save-concept-analysis">概念関係を保存</button>
                        </div>
                        <div class="col-md-6">
                            <h6>保存された概念マップ</h6>
                            <div id="concept-content-display" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                <!-- 保存された内容がここに表示される -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('save-concept-analysis').addEventListener('click', () => {
            this.saveConceptAnalysis();
        });

        this.displayToolContent('concept-map');
    }

    // 論証構造分析ツール
    showArgumentAnalysisTool() {
        const workspace = document.getElementById('active-tool-workspace');
        workspace.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>⚖️ 論証構造分析</h5>
                    <small class="text-muted">文章の論証構造を詳細に分析してください</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">論証の要素</label>
                                <select class="form-select" id="argument-element-type">
                                    <option value="main-claim">主要な主張</option>
                                    <option value="sub-claim">副次的主張</option>
                                    <option value="evidence">根拠・証拠</option>
                                    <option value="warrant">論拠（根拠と主張を結ぶ理由）</option>
                                    <option value="backing">裏付け（論拠の根拠）</option>
                                    <option value="qualifier">限定詞</option>
                                    <option value="rebuttal">反駁・反証</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">内容</label>
                                <textarea class="form-control" id="argument-content" rows="4" placeholder="選択した論証要素の内容を詳しく記述してください..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">分析・評価</label>
                                <textarea class="form-control" id="argument-evaluation" rows="3" placeholder="この論証要素の妥当性や効果について分析してください..."></textarea>
                            </div>
                            <button class="btn btn-primary" id="save-argument-analysis">論証分析を保存</button>
                        </div>
                        <div class="col-md-6">
                            <h6>保存された論証構造分析</h6>
                            <div id="argument-content-display" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                <!-- 保存された内容がここに表示される -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('save-argument-analysis').addEventListener('click', () => {
            this.saveArgumentAnalysis();
        });

        this.displayToolContent('argument-analysis');
    }

    // 多角的視点分析ツール
    showPerspectiveAnalysisTool() {
        const workspace = document.getElementById('active-tool-workspace');
        workspace.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>👁️ 多角的視点分析</h5>
                    <small class="text-muted">異なる立場や視点から文章を深く分析してください</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">視点・立場</label>
                                <input type="text" class="form-control" id="perspective-viewpoint" placeholder="分析する視点や立場（例：作者、登場人物、読者、社会的背景）">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">その視点からの解釈</label>
                                <textarea class="form-control" id="perspective-interpretation" rows="4" placeholder="その視点から文章をどのように解釈できるかを詳しく記述してください..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">他の視点との比較</label>
                                <textarea class="form-control" id="perspective-comparison" rows="3" placeholder="他の視点と比較して、この視点の特徴や意義について分析してください..."></textarea>
                            </div>
                            <button class="btn btn-primary" id="save-perspective-analysis">視点分析を保存</button>
                        </div>
                        <div class="col-md-6">
                            <h6>保存された多角的視点分析</h6>
                            <div id="perspective-content-display" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                <!-- 保存された内容がここに表示される -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('save-perspective-analysis').addEventListener('click', () => {
            this.savePerspectiveAnalysis();
        });

        this.displayToolContent('perspective-analysis');
    }

    // 各分析の保存メソッド
    saveLogicAnalysis() {
        const type = document.getElementById('logic-type').value;
        const from = document.getElementById('logic-from').value;
        const to = document.getElementById('logic-to').value;
        const description = document.getElementById('logic-description').value.trim();

        if (!from || !to || !description) {
            alert('すべての項目を入力してください。');
            return;
        }

        const content = {
            type: 'logic-structure',
            title: `論理構造: ${this.getLogicTypeLabel(type)}`,
            data: {
                logicType: type,
                fromParagraph: from,
                toParagraph: to,
                description: description
            }
        };

        this.saveActiveReadingContent(content);
    }

    saveCausalAnalysis() {
        const cause = document.getElementById('cause-input').value.trim();
        const effect = document.getElementById('effect-input').value.trim();
        const analysis = document.getElementById('causal-analysis').value.trim();

        if (!cause || !effect || !analysis) {
            alert('すべての項目を入力してください。');
            return;
        }

        const content = {
            type: 'causal-map',
            title: '因果関係分析',
            data: {
                cause: cause,
                effect: effect,
                analysis: analysis
            }
        };

        this.saveActiveReadingContent(content);
    }

    saveConceptAnalysis() {
        const central = document.getElementById('central-concept').value.trim();
        const related = document.getElementById('related-concept').value.trim();
        const relationship = document.getElementById('concept-relationship').value.trim();
        const explanation = document.getElementById('concept-explanation').value.trim();

        if (!central || !related || !relationship || !explanation) {
            alert('すべての項目を入力してください。');
            return;
        }

        const content = {
            type: 'concept-map',
            title: `概念関係: ${central} ↔ ${related}`,
            data: {
                centralConcept: central,
                relatedConcept: related,
                relationship: relationship,
                explanation: explanation
            }
        };

        this.saveActiveReadingContent(content);
    }

    saveArgumentAnalysis() {
        const elementType = document.getElementById('argument-element-type').value;
        const content = document.getElementById('argument-content').value.trim();
        const evaluation = document.getElementById('argument-evaluation').value.trim();

        if (!content || !evaluation) {
            alert('内容と分析の両方を入力してください。');
            return;
        }

        const contentObj = {
            type: 'argument-analysis',
            title: `論証分析: ${this.getArgumentElementLabel(elementType)}`,
            data: {
                elementType: elementType,
                content: content,
                evaluation: evaluation
            }
        };

        this.saveActiveReadingContent(contentObj);
    }

    savePerspectiveAnalysis() {
        const viewpoint = document.getElementById('perspective-viewpoint').value.trim();
        const interpretation = document.getElementById('perspective-interpretation').value.trim();
        const comparison = document.getElementById('perspective-comparison').value.trim();

        if (!viewpoint || !interpretation || !comparison) {
            alert('すべての項目を入力してください。');
            return;
        }

        const content = {
            type: 'perspective-analysis',
            title: `視点分析: ${viewpoint}`,
            data: {
                viewpoint: viewpoint,
                interpretation: interpretation,
                comparison: comparison
            }
        };

        this.saveActiveReadingContent(content);
    }

    // 共通の保存・表示メソッド
    saveActiveReadingContent(content) {
        fetch('/api/save-active-reading-content/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId,
                content_type: content.type,
                title: content.title,
                data: content.data
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('分析を保存しました。');
                    this.loadActiveReadingContent();
                    this.displayToolContent(content.type);
                    this.clearCurrentToolInputs();
                } else {
                    alert('保存に失敗しました: ' + data.error);
                }
            })
            .catch(error => {
                console.error('エラー:', error);
                alert('通信エラーが発生しました。');
            });
    }

    loadActiveReadingContent() {
        fetch(`/api/get-active-reading-content/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.activeReadingContent = data.content;
                    this.updateRightSidebarDisplay(); // ここで1回だけ呼び出し
                }
            })
            .catch(error => {
                console.error('コンテンツ読み込みエラー:', error);
            });
    }


    updateRightSidebarDisplay() {
        const rightColumn = document.querySelector('.col-md-4');
        if (!rightColumn) return;

        // 既存の積極的読みコンテンツ表示エリアを削除
        const existingDisplay = rightColumn.querySelector('#active-reading-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        const displayArea = document.createElement('div');
        displayArea.id = 'active-reading-display';
        displayArea.className = 'mt-3';
        displayArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6>積極的読み分析</h6>
            </div>
            <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                ${this.activeReadingContent.length === 0 ?
                '<p class="text-muted">まだ分析がありません。下部のツールを使って分析を始めてください。</p>' :
                this.activeReadingContent.map(content => this.renderContentBlock(content)).join('')
            }
            </div>
        </div>
    `;

        rightColumn.appendChild(displayArea);
    }

    renderContentBlock(content) {
        const iconMap = {
            'logic-structure': '🔗',
            'causal-map': '⚡',
            'concept-map': '🗺️',
            'argument-analysis': '⚖️',
            'perspective-analysis': '👁️'
        };

        return `
        <div class="content-block mb-3 p-3 border rounded content-clickable" 
             style="background-color: #f8f9fa; cursor: pointer;" 
             data-content-id="${content.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1" onclick="event.stopPropagation();">
                    <h6 class="mb-1">${iconMap[content.content_type]} ${content.title}</h6>
                    <div class="content-preview small text-muted">
                        ${this.generateContentPreview(content)}
                    </div>
                    <small class="text-muted">${new Date(content.created_at).toLocaleString('ja-JP')}</small>
                </div>
                <div class="btn-group-vertical" onclick="event.stopPropagation();">
                    <button class="btn btn-sm btn-outline-primary edit-content-btn" data-content-id="${content.id}">編集</button>
                    <button class="btn btn-sm btn-outline-danger delete-content-btn" data-content-id="${content.id}">削除</button>
                </div>
            </div>
            <div class="mt-2">
                <small class="text-primary">👆 クリックして詳細を表示</small>
            </div>
        </div>
    `;
    }

    generateContentPreview(content) {
        const data = content.data;
        switch (content.content_type) {
            case 'logic-structure':
                return `段落${data.fromParagraph} → 段落${data.toParagraph}: ${data.description.substring(0, 50)}...`;
            case 'causal-map':
                return `原因: ${data.cause.substring(0, 30)}... → 結果: ${data.effect.substring(0, 30)}...`;
            case 'concept-map':
                return `${data.centralConcept} ${data.relationship} ${data.relatedConcept}`;
            case 'argument-analysis':
                return `${this.getArgumentElementLabel(data.elementType)}: ${data.content.substring(0, 50)}...`;
            case 'perspective-analysis':
                return `${data.viewpoint}: ${data.interpretation.substring(0, 50)}...`;
            default:
                return '詳細を確認してください';
        }
    }

    displayToolContent(toolType) {
        const displayElement = document.getElementById(`${toolType.replace('-', '-content-')}-display`);
        if (!displayElement) return;

        const relevantContent = this.activeReadingContent.filter(content => content.content_type === toolType);

        if (relevantContent.length === 0) {
            displayElement.innerHTML = '<p class="text-muted">まだ分析がありません。</p>';
            return;
        }

        displayElement.innerHTML = relevantContent.map(content => `
            <div class="saved-content-item mb-2 p-2 border rounded">
                <strong>${content.title}</strong>
                <div class="small mt-1">${this.generateDetailedContentDisplay(content)}</div>
                <div class="mt-1">
                    <button class="btn btn-sm btn-outline-primary edit-content-btn" data-content-id="${content.id}">編集</button>
                    <button class="btn btn-sm btn-outline-danger delete-content-btn" data-content-id="${content.id}">削除</button>
                </div>
            </div>
        `).join('');
    }

    generateDetailedContentDisplay(content) {
        const data = content.data;
        switch (content.content_type) {
            case 'logic-structure':
                return `<strong>関係:</strong> ${this.getLogicTypeLabel(data.logicType)}<br>
                        <strong>段落:</strong> ${data.fromParagraph} → ${data.toParagraph}<br>
                        <strong>分析:</strong> ${data.description}`;
            case 'causal-map':
                return `<strong>原因:</strong> ${data.cause}<br>
                        <strong>結果:</strong> ${data.effect}<br>
                        <strong>分析:</strong> ${data.analysis}`;
            case 'concept-map':
                return `<strong>中心概念:</strong> ${data.centralConcept}<br>
                        <strong>関連概念:</strong> ${data.relatedConcept}<br>
                        <strong>関係:</strong> ${data.relationship}<br>
                        <strong>説明:</strong> ${data.explanation}`;
            case 'argument-analysis':
                return `<strong>要素:</strong> ${this.getArgumentElementLabel(data.elementType)}<br>
                        <strong>内容:</strong> ${data.content}<br>
                        <strong>評価:</strong> ${data.evaluation}`;
            case 'perspective-analysis':
                return `<strong>視点:</strong> ${data.viewpoint}<br>
                        <strong>解釈:</strong> ${data.interpretation}<br>
                        <strong>比較:</strong> ${data.comparison}`;
            default:
                return '詳細情報';
        }
    }

    clearCurrentToolInputs() {
        // 現在のツールの入力フィールドをクリア
        const workspace = document.getElementById('active-tool-workspace');
        const inputs = workspace.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type !== 'submit' && input.type !== 'button') {
                input.value = '';
            }
        });
    }

    editActiveReadingContent(contentId) {
        // 編集機能の実装（簡易版）
        const content = this.activeReadingContent.find(c => c.id == contentId);
        if (!content) return;

        const newTitle = prompt('タイトルを編集:', content.title);
        if (newTitle && newTitle !== content.title) {
            fetch(`/api/update-active-reading-content/${contentId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    title: newTitle
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.loadActiveReadingContent();
                    }
                });
        }
    }

    deleteActiveReadingContent(contentId) {
        if (!confirm('この分析を削除しますか？')) return;

        fetch(`/api/delete-active-reading-content/${contentId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': this.getCsrfToken()
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.loadActiveReadingContent();
                    if (this.currentTool) {
                        this.displayToolContent(this.currentTool);
                    }
                }
            });
    }

    // ヘルパーメソッド
    getLogicTypeLabel(type) {
        const labels = {
            'sequence': '順序・時系列',
            'cause-effect': '原因・結果',
            'comparison': '比較・対照',
            'problem-solution': '問題・解決',
            'general-specific': '一般・具体',
            'premise-conclusion': '前提・結論'
        };
        return labels[type] || type;
    }

    getArgumentElementLabel(type) {
        const labels = {
            'main-claim': '主要な主張',
            'sub-claim': '副次的主張',
            'evidence': '根拠・証拠',
            'warrant': '論拠',
            'backing': '裏付け',
            'qualifier': '限定詞',
            'rebuttal': '反駁・反証'
        };
        return labels[type] || type;
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new ActiveReadingTools();
});
