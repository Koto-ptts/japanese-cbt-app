from django.contrib import admin
from .models import UserProfile, Text, Question, QuestionChoice, StudentResponse, StudentAnnotation, StudentActivityLog

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_teacher', 'created_at']
    list_filter = ['is_teacher', 'created_at']
    search_fields = ['user__username', 'user__email']

class QuestionChoiceInline(admin.TabularInline):
    model = QuestionChoice
    extra = 4

@admin.register(Text)
class TextAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'created_by']
    search_fields = ['title', 'author', 'content']
    readonly_fields = ['created_at']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'question_type', 'order', 'hide_text', 'show_in_answering_phase', 'created_at']
    list_filter = ['question_type', 'hide_text', 'show_in_answering_phase', 'created_at']
    search_fields = ['question_text', 'text__title']
    inlines = [QuestionChoiceInline]
    readonly_fields = ['created_at']

@admin.register(StudentResponse)
class StudentResponseAdmin(admin.ModelAdmin):
    list_display = ['student', 'question', 'is_submitted', 'created_at']
    list_filter = ['is_submitted', 'created_at', 'question__question_type']
    search_fields = ['student__username', 'question__question_text']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(StudentAnnotation)
class StudentAnnotationAdmin(admin.ModelAdmin):
    list_display = ['student', 'text', 'annotation_type', 'created_at']
    list_filter = ['annotation_type', 'created_at']
    search_fields = ['student__username', 'text__title', 'content']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(StudentActivityLog)
class StudentActivityLogAdmin(admin.ModelAdmin):
    list_display = ['student', 'activity_type', 'text', 'question', 'timestamp']
    list_filter = ['activity_type', 'timestamp']
    search_fields = ['student__username', 'activity_type']
    readonly_fields = ['timestamp']
