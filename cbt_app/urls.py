from django.urls import path
from . import views

app_name = 'cbt_app'

urlpatterns = [
    # 基本ページ
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('text/<int:text_id>/', views.text_detail, name='text_detail'),
    path('question/<int:question_id>/', views.question_detail, name='question_detail'),
    
    # 教員専用機能
    path('teacher/students/', views.manage_students, name='manage_students'),
    path('teacher/students/add/', views.add_student, name='add_student'),
    path('teacher/students/edit/<int:student_id>/', views.edit_student, name='edit_student'),
    
    # 注釈関連API
    path('api/save-annotation/', views.save_annotation, name='save_annotation'),
    path('api/get-annotations/<int:text_id>/', views.get_annotations, name='get_annotations'),
    path('api/update-annotation/<int:annotation_id>/', views.update_annotation, name='update_annotation'),
    path('api/delete-annotation/<int:annotation_id>/', views.delete_annotation, name='delete_annotation'),
    
    # 積極的読み分析API
    path('api/save-active-reading-content/', views.save_active_reading_content, name='save_active_reading_content'),
    path('api/get-active-reading-content/<int:text_id>/', views.get_active_reading_content, name='get_active_reading_content'),
    path('api/update-active-reading-content/<int:content_id>/', views.update_active_reading_content, name='update_active_reading_content'),
    path('api/delete-active-reading-content/<int:content_id>/', views.delete_active_reading_content, name='delete_active_reading_content'),
    
    # 段落定義API
    path('api/save-paragraph-definition/', views.save_paragraph_definition, name='save_paragraph_definition'),
    path('api/get-paragraph-definitions/<int:text_id>/', views.get_paragraph_definitions, name='get_paragraph_definitions'),
    path('api/delete-paragraph-definition/<int:text_id>/<int:paragraph_number>/', views.delete_paragraph_definition, name='delete_paragraph_definition'),
    path('api/save-all-paragraphs/', views.save_all_paragraphs, name='save_all_paragraphs'),
    
    # フェーズ制御API
    path('api/get-reading-session/<int:text_id>/', views.get_reading_session, name='get_reading_session'),
    path('api/transition-to-answering/', views.transition_to_answering, name='transition_to_answering'),
    path('api/transition-to-reading/', views.transition_to_reading, name='transition_to_reading'),
    path('api/get-all-memos/<int:text_id>/', views.get_all_memos, name='get_all_memos'),
    
    # 活動ログAPI
    path('api/log-activity/', views.log_activity, name='log_activity'),

# 一時的な管理者作成用（使用後は削除）
path('create-admin-temp/', views.create_initial_admin, name='create_initial_admin'),

]
