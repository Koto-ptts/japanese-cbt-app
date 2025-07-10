class TextInteraction {
    constructor() {
        this.selectedText = null;
        this.userParagraphs = [];
        this.paragraphMode = false;
        this.nextParagraphNumber = 1;
        this.textId = document.querySelector('[data-text-id]')?.getAttribute('data-text-id');
        this.paragraphColors = [
            'rgba(255, 99, 132, 0.1)',   // 薄いピンク
            'rgba(54, 162, 235, 0.1)',   // 薄い青
            'rgba(255, 205, 86, 0.1)',   // 薄い黄色
            'rgba(75, 192, 192, 0.1)',   // 薄い緑
            'rgba(153, 102, 255, 0.1)',  // 薄い紫
            'rgba(255, 159, 64, 0.1)',   // 薄いオレンジ
            'rgba(199, 199, 199, 0.1)',  // 薄いグレー
            'rgba(83, 102, 255, 0.1)',   // 薄いインディゴ
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserParagraphs();
        this.preventCopyPaste();
        this.setupParagraphDisplay();
    }

    setupEventListeners() {
        const textContent = document.querySelector('.text-content');
        if (!textContent) return;

        // テキスト選択イベント
        textContent.addEventListener('mouseup', (e) => {
            this.handleTextSelection(e);
        });

        // ボタンクリックイベント（delegated event handling）
        document.addEventListener('click', (e) => {
            // 段落番号付与モードの切り替え
            if (e.target.classList.contains('toggle-paragraph-mode-btn')) {
                e.preventDefault();
                this.toggleParagraphMode();
            }
            // 段落番号追加
            if (e.target.classList.contains('add-paragraph-btn')) {
                e.preventDefault();
                this.addParagraphNumber();
            }
            // 段落削除
            if (e.target.classList.contains('delete-paragraph-btn')) {
                e.preventDefault();
                const paragraphNumber = parseInt(e.target.dataset.paragraphNumber);
                this.deleteParagraph(paragraphNumber);
            }
            // 段落編集
            if (e.target.classList.contains('edit-paragraph-btn')) {
                e.preventDefault();
                const paragraphNumber = parseInt(e.target.dataset.paragraphNumber);
                this.editParagraph(paragraphNumber);
            }
        });
    }

    handleTextSelection(e) {
        const selection = window.getSelection();
        if (selection.toString().length > 0 && this.paragraphMode) {
            this.selectedText = {
                text: selection.toString(),
                range: selection.getRangeAt(0),
                startOffset: this.getTextOffset(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset),
                endOffset: this.getTextOffset(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset)
            };
            
            this.showParagraphSelectionMenu(e.pageX, e.pageY);
            this.logActivity('text_selection_for_paragraph', {
                text: this.selectedText.text,
                startOffset: this.selectedText.startOffset,
                endOffset: this.selectedText.endOffset
            });
        }
    }

    showParagraphSelectionMenu(x, y) {
        this.hideSelectionMenu();
        
        const menu = document.createElement('div');
        menu.className = 'selection-menu';
        menu.style.position = 'absolute';
        menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 100) + 'px';
        menu.style.zIndex = '1000';
        menu.style.backgroundColor = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.padding = '8px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

        menu.innerHTML = `
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-primary add-paragraph-btn">
                    📝 段落${this.nextParagraphNumber}として追加
                </button>
            </div>
            <div class="mt-1">
                <small class="text-muted">選択: "${this.selectedText.text.substring(0, 30)}${this.selectedText.text.length > 30 ? '...' : ''}"</small>
            </div>
        `;

        document.body.appendChild(menu);
        
        setTimeout(() => {
            this.hideSelectionMenu();
        }, 5000);
    }

    hideSelectionMenu() {
        const existingMenu = document.querySelector('.selection-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    toggleParagraphMode() {
        this.paragraphMode = !this.paragraphMode;
        const textContent = document.querySelector('.text-content');
        
        if (this.paragraphMode) {
            textContent.classList.add('paragraph-selection-mode');
            this.showParagraphModeInstructions();
        } else {
            textContent.classList.remove('paragraph-selection-mode');
            this.hideParagraphModeInstructions();
        }
        
        // ボタンの表示を更新
        this.updateParagraphDisplay();
    }

    showParagraphModeInstructions() {
        const existingInstructions = document.querySelector('.paragraph-instructions');
        if (existingInstructions) return;

        const instructions = document.createElement('div');
        instructions.className = 'paragraph-instructions alert alert-warning mt-2';
        instructions.innerHTML = `
            <strong>段落番号付与モード</strong><br>
            文章の一部を選択すると段落として登録できます。<br>
            <small>次の段落番号: ${this.nextParagraphNumber}</small>
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

    addParagraphNumber() {
        if (!this.selectedText) {
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                alert('段落として登録したい文章を選択してください。');
                return;
            }
            
            this.selectedText = {
                text: selection.toString(),
                range: selection.getRangeAt(0),
                startOffset: this.getTextOffset(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset),
                endOffset: this.getTextOffset(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset)
            };
        }

        const selectedText = this.selectedText.text.trim();
        const startOffset = this.selectedText.startOffset;
        const endOffset = this.selectedText.endOffset;

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

        // 段落を番号順にソート
        this.userParagraphs.sort((a, b) => a.startOffset - b.startOffset);
        
        // 段落番号を再割り当て
        this.reassignParagraphNumbers();

        // 視覚的に段落を表示
        this.refreshAllParagraphVisuals();

        // サーバーに保存
        this.saveAllParagraphs();

        // 選択をクリア
        window.getSelection().removeAllRanges();
        this.selectedText = null;

        // メニューを閉じる
        this.hideSelectionMenu();

        // 段落リストを更新
        this.updateParagraphDisplay();

        alert(`段落${paragraph.number}を追加しました。`);
    }

    editParagraph(paragraphNumber) {
        const paragraph = this.userParagraphs.find(p => p.number === paragraphNumber);
        if (!paragraph) return;

        const newContent = prompt('段落の内容を編集してください:', paragraph.content);
        if (newContent && newContent.trim() !== paragraph.content) {
            paragraph.content = newContent.trim();
            this.saveAllParagraphs();
            this.updateParagraphDisplay();
            alert(`段落${paragraphNumber}を更新しました。`);
        }
    }

    deleteParagraph(paragraphNumber) {
        if (!confirm(`段落${paragraphNumber}を削除しますか？`)) return;

        // 視覚的表示を削除
        const paragraphElement = document.querySelector(`[data-paragraph-number="${paragraphNumber}"]`);
        if (paragraphElement) {
            const parent = paragraphElement.parentNode;
            while (paragraphElement.firstChild) {
                if (paragraphElement.firstChild.classList && paragraphElement.firstChild.classList.contains('paragraph-badge')) {
                    paragraphElement.removeChild(paragraphElement.firstChild);
                } else {
                    parent.insertBefore(paragraphElement.firstChild, paragraphElement);
                }
            }
            parent.removeChild(paragraphElement);
            parent.normalize();
        }

        // データから削除
        this.userParagraphs = this.userParagraphs.filter(p => p.number !== paragraphNumber);

        // 段落番号を再割り当て
        this.reassignParagraphNumbers();

        // 全ての段落の視覚表示を更新
        this.refreshAllParagraphVisuals();

        // 表示を更新
        this.updateParagraphDisplay();

        // サーバーに保存
        this.saveAllParagraphs();

        alert(`段落${paragraphNumber}を削除しました。`);
    }

    reassignParagraphNumbers() {
        // 位置順（startOffset順）に段落番号を再割り当て
        this.userParagraphs.sort((a, b) => a.startOffset - b.startOffset);
        this.userParagraphs.forEach((paragraph, index) => {
            paragraph.number = index + 1;
        });
        
        // 次の段落番号を更新
        this.nextParagraphNumber = this.userParagraphs.length + 1;
    }

    refreshAllParagraphVisuals() {
        // 既存の全ての段落視覚表示を削除
        const existingParagraphs = document.querySelectorAll('.user-defined-paragraph');
        existingParagraphs.forEach(element => {
            const parent = element.parentNode;
            while (element.firstChild) {
                if (element.firstChild.classList && element.firstChild.classList.contains('paragraph-badge')) {
                    element.removeChild(element.firstChild);
                } else {
                    parent.insertBefore(element.firstChild, element);
                }
            }
            parent.removeChild(element);
        });

        // 文章を正規化
        const textContent = document.querySelector('.text-content');
        textContent.normalize();

        // 全ての段落を再描画
        this.userParagraphs.forEach(paragraph => {
            this.visualizeParagraphByOffset(paragraph.startOffset, paragraph.endOffset, paragraph.number);
        });
    }

    visualizeParagraphByOffset(startOffset, endOffset, paragraphNumber) {
        const textContent = document.querySelector('.text-content');
        if (!textContent) return;

        try {
            const range = this.createRangeFromOffsets(startOffset, endOffset);
            if (range) {
                this.visualizeParagraph(range, paragraphNumber);
            }
        } catch (e) {
            console.error('段落の視覚化エラー:', e);
        }
    }

    createRangeFromOffsets(startOffset, endOffset) {
        const textContent = document.querySelector('.text-content');
        const walker = document.createTreeWalker(
            textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentOffset = 0;
        let startNode = null;
        let endNode = null;
        let startNodeOffset = 0;
        let endNodeOffset = 0;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent.length;
            
            if (currentOffset <= startOffset && currentOffset + nodeLength > startOffset) {
                startNode = node;
                startNodeOffset = startOffset - currentOffset;
            }
            
            if (currentOffset <= endOffset && currentOffset + nodeLength >= endOffset) {
                endNode = node;
                endNodeOffset = endOffset - currentOffset;
                break;
            }
            
            currentOffset += nodeLength;
        }

        if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startNodeOffset);
            range.setEnd(endNode, endNodeOffset);
            return range;
        }

        return null;
    }

    visualizeParagraph(range, paragraphNumber) {
        try {
            const span = document.createElement('span');
            span.className = 'user-defined-paragraph';
            span.dataset.paragraphNumber = paragraphNumber;
            
            // 段落ごとに異なる色を適用
            const colorIndex = (paragraphNumber - 1) % this.paragraphColors.length;
            const backgroundColor = this.paragraphColors[colorIndex];
            const borderColor = backgroundColor.replace('0.1', '0.4'); // ボーダーは少し濃く
            
            span.style.cssText = `
                border-left: 3px solid ${borderColor};
                padding-left: 5px;
                background-color: ${backgroundColor};
                position: relative;
                display: inline-block;
            `;
            
            // 段落番号を表示するバッジ
            const badge = document.createElement('span');
            badge.className = 'paragraph-badge';
            badge.textContent = paragraphNumber;
            badge.style.cssText = `
                position: absolute;
                left: -15px;
                top: 0;
                background-color: ${borderColor.replace('0.4', '0.8')};
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                z-index: 10;
            `;

            range.surroundContents(span);
            span.appendChild(badge);
        } catch (e) {
            console.error('段落の視覚化エラー:', e);
        }
    }

    setupParagraphDisplay() {
        this.updateParagraphDisplay();
    }

    updateParagraphDisplay() {
        const rightColumn = document.querySelector('.col-md-4');
        if (!rightColumn) return;

        // 既存の表示エリアを削除
        const existingDisplay = rightColumn.querySelector('#paragraph-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        const displayArea = document.createElement('div');
        displayArea.id = 'paragraph-display';
        displayArea.className = 'mt-3';
        displayArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h6>段落番号付与</h6>
                </div>
                <div class="card-body">
                    <button class="btn ${this.paragraphMode ? 'btn-warning' : 'btn-outline-secondary'} w-100 toggle-paragraph-mode-btn mb-2">
                        📝 段落番号付与モード（${this.paragraphMode ? 'ON' : 'OFF'}）
                    </button>
                    <small class="text-muted d-block mt-1">
                        モードをONにして文章を選択すると段落番号を付与できます
                    </small>
                </div>
            </div>
            
            ${this.userParagraphs.length > 0 ? `
                <div class="card mt-3">
                    <div class="card-header">
                        <h6>定義した段落（${this.userParagraphs.length}個）</h6>
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${this.userParagraphs.map(p => {
                            const colorIndex = (p.number - 1) % this.paragraphColors.length;
                            const backgroundColor = this.paragraphColors[colorIndex];
                            return `
                                <div class="paragraph-item-small mb-2 p-2 border rounded" style="background-color: ${backgroundColor};">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <strong>段落${p.number}</strong>
                                            <div class="small text-muted">${p.content.substring(0, 50)}${p.content.length > 50 ? '...' : ''}</div>
                                        </div>
                                        <div class="btn-group-vertical">
                                            <button class="btn btn-sm btn-outline-primary edit-paragraph-btn" data-paragraph-number="${p.number}">編集</button>
                                            <button class="btn btn-sm btn-outline-danger delete-paragraph-btn" data-paragraph-number="${p.number}">削除</button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        rightColumn.appendChild(displayArea);
    }

    loadUserParagraphs() {
        if (!this.textId) return;

        fetch(`/api/get-paragraph-definitions/${this.textId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.userParagraphs = data.paragraphs;
                    this.reassignParagraphNumbers();
                    this.updateParagraphDisplay();
                    this.refreshAllParagraphVisuals();
                }
            })
            .catch(error => {
                console.error('段落定義読み込みエラー:', error);
            });
    }

    saveAllParagraphs() {
        // 全ての段落を一括保存
        fetch('/api/save-all-paragraphs/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId,
                paragraphs: this.userParagraphs
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('段落定義保存エラー:', data.error);
            }
        })
        .catch(error => {
            console.error('段落定義保存エラー:', error);
        });
    }

    // 既存のメソッドは省略（preventCopyPaste, logActivity, getTextOffset, getCsrfTokenなど）
    preventCopyPaste() {
        const textContent = document.querySelector('.text-content');
        if (!textContent) return;

        textContent.addEventListener('copy', (e) => {
            e.preventDefault();
            alert('この文章のコピーは禁止されています。');
            this.logActivity('copy_attempt', {});
        });

        textContent.addEventListener('cut', (e) => {
            e.preventDefault();
            alert('この文章の切り取りは禁止されています。');
            this.logActivity('cut_attempt', {});
        });

        textContent.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            alert('右クリックメニューは無効化されています。');
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && ['c', 'v', 'x', 'a', 's'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                alert(`キーボードショートカット Ctrl+${e.key.toUpperCase()} は無効化されています。`);
                this.logActivity('keyboard_shortcut_attempt', { key: e.key });
            }
            
            if (e.key === 'F12') {
                e.preventDefault();
                alert('開発者ツールの使用は禁止されています。');
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                alert('開発者ツールの使用は禁止されています。');
            }
        });

        textContent.addEventListener('dragstart', (e) => {
            e.preventDefault();
            this.logActivity('drag_attempt', {});
        });

        window.addEventListener('beforeprint', (e) => {
            e.preventDefault();
            alert('この文章の印刷は禁止されています。');
            this.logActivity('print_attempt', {});
        });
    }

    logActivity(activityType, details) {
        if (!this.textId) return;
        
        fetch('/api/log-activity/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            body: JSON.stringify({
                text_id: this.textId,
                activity_type: activityType,
                details: details
            })
        })
        .catch(error => {
            console.error('ログ送信エラー:', error);
        });
    }

    getTextOffset(node, offset) {
        const textContent = document.querySelector('.text-content');
        if (!textContent) return 0;

        const walker = document.createTreeWalker(
            textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentOffset = 0;
        let currentNode;

        while (currentNode = walker.nextNode()) {
            if (currentNode === node) {
                return currentOffset + offset;
            }
            currentOffset += currentNode.textContent.length;
        }

        return currentOffset;
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new TextInteraction();
});