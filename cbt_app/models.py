from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_teacher = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "ユーザープロファイル"
        verbose_name_plural = "ユーザープロファイル"
    
    def __str__(self):
        return f"{self.user.username} - {'教員' if self.is_teacher else '生徒'}"

class Text(models.Model):
    title = models.CharField(max_length=200, verbose_name="タイトル")
    content = models.TextField(verbose_name="本文")
    author = models.CharField(max_length=100, blank=True, verbose_name="作者")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="作成者")
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name="有効")
    
    class Meta:
        verbose_name = "文章"
        verbose_name_plural = "文章"
    
    def __str__(self):
        return self.title

class Question(models.Model):
    QUESTION_TYPES = [
        ('choice', '選択問題'),
        ('essay', '記述問題'),
        ('table', '表作成問題'),
        ('highlight', 'ハイライト問題'),
    ]
    
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    question_text = models.TextField(verbose_name="問題文")
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, verbose_name="問題タイプ")
    order = models.IntegerField(default=1, verbose_name="順序")
    hide_text = models.BooleanField(default=False, verbose_name="文章を隠す")
    allow_notes_only = models.BooleanField(default=False, verbose_name="メモのみ参照可能")
    show_in_answering_phase = models.BooleanField(default=True, verbose_name="解答フェーズで表示")  # この行を追加
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "問題"
        verbose_name_plural = "問題"
        ordering = ['order']
    
    def __str__(self):
        return f"{self.text.title} - 問題{self.order}"

class QuestionChoice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=500, verbose_name="選択肢")
    is_correct = models.BooleanField(default=False, verbose_name="正解")
    order = models.IntegerField(default=1, verbose_name="順序")
    
    class Meta:
        verbose_name = "選択肢"
        verbose_name_plural = "選択肢"
        ordering = ['order']
    
    def __str__(self):
        return f"{self.question} - {self.choice_text[:50]}"

class StudentResponse(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, verbose_name="問題")
    response_text = models.TextField(blank=True, verbose_name="回答内容")
    selected_choice = models.ForeignKey(QuestionChoice, on_delete=models.CASCADE, null=True, blank=True, verbose_name="選択した選択肢")
    is_submitted = models.BooleanField(default=False, verbose_name="提出済み")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "生徒回答"
        verbose_name_plural = "生徒回答"
        unique_together = ['student', 'question']
    
    def __str__(self):
        return f"{self.student.username} - {self.question}"

class StudentAnnotation(models.Model):
    ANNOTATION_TYPES = [
        ('highlight', 'ハイライト'),
        ('note', '注釈'),
        ('memo', 'メモ'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    start_position = models.IntegerField(verbose_name="開始位置")
    end_position = models.IntegerField(verbose_name="終了位置")
    annotation_type = models.CharField(max_length=20, choices=ANNOTATION_TYPES, verbose_name="注釈タイプ")
    content = models.TextField(blank=True, verbose_name="内容")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "生徒注釈"
        verbose_name_plural = "生徒注釈"
    
    def __str__(self):
        return f"{self.student.username} - {self.annotation_type} - {self.text.title}"

class StudentActivityLog(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, null=True, blank=True, verbose_name="対象文章")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, null=True, blank=True, verbose_name="対象問題")
    activity_type = models.CharField(max_length=50, verbose_name="活動タイプ")
    details = models.JSONField(default=dict, verbose_name="詳細情報")
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "生徒活動ログ"
        verbose_name_plural = "生徒活動ログ"
    
    def __str__(self):
        return f"{self.student.username} - {self.activity_type} - {self.timestamp}"

class ParagraphSummary(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    paragraph_number = models.IntegerField(verbose_name="段落番号")
    original_content = models.TextField(verbose_name="元の段落内容")
    summary = models.TextField(verbose_name="要旨", blank=True)
    keywords = models.JSONField(default=list, verbose_name="キーワード")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "段落要旨"
        verbose_name_plural = "段落要旨"
        unique_together = ['student', 'text', 'paragraph_number']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - 段落{self.paragraph_number}"

class ConceptMap(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    map_data = models.JSONField(default=dict, verbose_name="マップデータ")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "概念マップ"
        verbose_name_plural = "概念マップ"
        unique_together = ['student', 'text']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - 概念マップ"

class ComparisonTable(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    table_data = models.JSONField(default=dict, verbose_name="表データ")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "比較表"
        verbose_name_plural = "比較表"
        unique_together = ['student', 'text']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - 比較表"

class ArgumentStructure(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    claims = models.JSONField(default=list, verbose_name="主張")
    evidence = models.JSONField(default=list, verbose_name="根拠")
    conclusions = models.JSONField(default=list, verbose_name="結論")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "論証構造"
        verbose_name_plural = "論証構造"
        unique_together = ['student', 'text']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - 論証構造"

class ActiveReadingContent(models.Model):
    CONTENT_TYPES = [
        ('logic-structure', '論理構造分析'),
        ('causal-map', '因果関係マップ'),
        ('concept-map', '概念マップ'),
        ('argument-analysis', '論証構造分析'),
        ('perspective-analysis', '多角的視点分析'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    content_type = models.CharField(max_length=30, choices=CONTENT_TYPES, verbose_name="コンテンツタイプ")
    title = models.CharField(max_length=200, verbose_name="タイトル")
    data = models.JSONField(default=dict, verbose_name="分析データ")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "積極的読み分析"
        verbose_name_plural = "積極的読み分析"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.title}"

class UserParagraphDefinition(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    paragraph_number = models.IntegerField(verbose_name="段落番号")
    content = models.TextField(verbose_name="段落内容")
    start_offset = models.IntegerField(verbose_name="開始位置")
    end_offset = models.IntegerField(verbose_name="終了位置")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "ユーザー定義段落"
        verbose_name_plural = "ユーザー定義段落"
        unique_together = ['student', 'text', 'paragraph_number']
        ordering = ['paragraph_number']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - 段落{self.paragraph_number}"

class ReadingSession(models.Model):
    PHASE_CHOICES = [
        ('reading', '読解フェーズ'),
        ('answering', '解答フェーズ'),
        ('completed', '完了'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="生徒")
    text = models.ForeignKey(Text, on_delete=models.CASCADE, verbose_name="対象文章")
    current_phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='reading', verbose_name="現在のフェーズ")
    reading_start_time = models.DateTimeField(auto_now_add=True, verbose_name="読解開始時刻")
    reading_end_time = models.DateTimeField(null=True, blank=True, verbose_name="読解終了時刻")
    answering_start_time = models.DateTimeField(null=True, blank=True, verbose_name="解答開始時刻")
    answering_end_time = models.DateTimeField(null=True, blank=True, verbose_name="解答終了時刻")
    
    class Meta:
        verbose_name = "読解セッション"
        verbose_name_plural = "読解セッション"
        unique_together = ['student', 'text']
    
    def __str__(self):
        return f"{self.student.username} - {self.text.title} - {self.get_current_phase_display()}"

class QuestionResponse(models.Model):
    session = models.ForeignKey(ReadingSession, on_delete=models.CASCADE, verbose_name="セッション")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, verbose_name="問題")
    response_text = models.TextField(blank=True, verbose_name="回答内容")
    selected_choice = models.ForeignKey(QuestionChoice, on_delete=models.CASCADE, null=True, blank=True, verbose_name="選択した選択肢")
    confidence_level = models.IntegerField(default=3, verbose_name="確信度（1-5）")
    response_time = models.DurationField(null=True, blank=True, verbose_name="回答時間")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "問題回答"
        verbose_name_plural = "問題回答"
        unique_together = ['session', 'question']
    
    def __str__(self):
        return f"{self.session.student.username} - {self.question} - {self.created_at}"
