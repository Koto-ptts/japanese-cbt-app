from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import PermissionDenied
from django.utils import timezone
import json

from .models import (
    Text, Question, QuestionChoice, UserProfile, StudentResponse, StudentAnnotation,
    StudentActivityLog, ParagraphSummary, ConceptMap, ComparisonTable,
    ArgumentStructure, ActiveReadingContent, UserParagraphDefinition,
    ReadingSession
)

def home(request):
    """ホームページ"""
    if request.user.is_authenticated:
        return redirect('cbt_app:dashboard')
    return render(request, 'cbt_app/home.html')

def login_view(request):
    """ログインページ"""
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('cbt_app:dashboard')
        else:
            messages.error(request, 'ユーザー名またはパスワードが正しくありません。')
    
    return render(request, 'cbt_app/login.html')

def logout_view(request):
    """ログアウト"""
    logout(request)
    return redirect('cbt_app:home')

@login_required
def dashboard(request):
    """ダッシュボード"""
    try:
        user_profile = request.user.userprofile
    except UserProfile.DoesNotExist:
        # UserProfileが存在しない場合は作成（デフォルトは生徒）
        user_profile = UserProfile.objects.create(user=request.user, is_teacher=False)
    
    if user_profile.is_teacher:
        # 教員用ダッシュボード
        texts = Text.objects.filter(created_by=request.user, is_active=True)
        student_count = User.objects.filter(userprofile__is_teacher=False).count()
        return render(request, 'cbt_app/teacher_dashboard.html', {
            'texts': texts,
            'student_count': student_count
        })
    else:
        # 生徒用ダッシュボード
        texts = Text.objects.filter(is_active=True)
        return render(request, 'cbt_app/student_dashboard.html', {'texts': texts})

@login_required
def text_detail(request, text_id):
    """文章詳細ページ"""
    text = get_object_or_404(Text, id=text_id, is_active=True)
    
    # 読解セッションを取得または作成
    session, created = ReadingSession.objects.get_or_create(
        student=request.user,
        text=text
    )
    
    # フェーズに応じて問題を表示するかどうかを決定
    questions = []
    if session.current_phase == 'answering':
        # show_in_answering_phaseフィールドを使わずに全ての問題を表示
        questions = Question.objects.filter(text=text).order_by('order')
    
    # 生徒の注釈を取得
    try:
        annotations = StudentAnnotation.objects.filter(
            student=request.user, 
            text=text
        ) if not request.user.userprofile.is_teacher else []
    except:
        annotations = []
    
    context = {
        'text': text,
        'questions': questions,
        'annotations': annotations,
        'current_phase': session.current_phase,
        'session': session,
    }
    
    return render(request, 'cbt_app/text_detail.html', context)

@login_required
def question_detail(request, question_id):
    """問題詳細ページ"""
    question = get_object_or_404(Question, id=question_id)
    
    # 読解セッションの確認
    try:
        session = ReadingSession.objects.get(student=request.user, text=question.text)
        if session.current_phase != 'answering':
            messages.error(request, '解答フェーズに移行してから問題に回答してください。')
            return redirect('cbt_app:text_detail', text_id=question.text.id)
    except ReadingSession.DoesNotExist:
        messages.error(request, '読解セッションが見つかりません。')
        return redirect('cbt_app:text_detail', text_id=question.text.id)
    
    # 既存の回答を取得
    try:
        response = StudentResponse.objects.get(student=request.user, question=question)
    except StudentResponse.DoesNotExist:
        response = None
    
    if request.method == 'POST':
        try:
            # 回答を保存
            response_text = request.POST.get('response_text', '')
            selected_choice_id = request.POST.get('selected_choice')
            
            if response:
                response.response_text = response_text
                if selected_choice_id:
                    try:
                        selected_choice = get_object_or_404(QuestionChoice, id=selected_choice_id)
                        response.selected_choice = selected_choice
                    except:
                        pass  # 選択肢が無効な場合はスキップ
                response.save()
                messages.success(request, '回答を更新しました。')
            else:
                # 新しい回答を作成
                response_data = {
                    'student': request.user,
                    'question': question,
                    'response_text': response_text,
                }
                
                if selected_choice_id:
                    try:
                        selected_choice = get_object_or_404(QuestionChoice, id=selected_choice_id)
                        response_data['selected_choice'] = selected_choice
                    except:
                        pass  # 選択肢が無効な場合はスキップ
                
                response = StudentResponse.objects.create(**response_data)
                messages.success(request, '回答を保存しました。')
            
            return redirect('cbt_app:question_detail', question_id=question_id)
            
        except Exception as e:
            messages.error(request, f'回答の保存中にエラーが発生しました: {str(e)}')
    
    context = {
        'question': question,
        'response': response,
        'session': session,
    }
    
    return render(request, 'cbt_app/question_detail.html', context)

# 教員専用機能
def teacher_required(view_func):
    """教員権限が必要なビューのデコレータ"""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('cbt_app:login')
        
        try:
            if not request.user.userprofile.is_teacher:
                raise PermissionDenied("教員権限が必要です。")
        except UserProfile.DoesNotExist:
            raise PermissionDenied("ユーザープロファイルが存在しません。")
        
        return view_func(request, *args, **kwargs)
    return wrapper

@teacher_required
def manage_students(request):
    """生徒管理ページ"""
    students = User.objects.filter(userprofile__is_teacher=False).order_by('username')
    return render(request, 'cbt_app/manage_students.html', {'students': students})

@teacher_required
def add_student(request):
    """生徒追加ページ"""
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        first_name = request.POST.get('first_name', '')
        last_name = request.POST.get('last_name', '')
        
        # ユーザー名の重複チェック
        if User.objects.filter(username=username).exists():
            messages.error(request, 'このユーザー名は既に使用されています。')
        else:
            # 新しい生徒アカウントを作成
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # UserProfileを作成（生徒として）
            UserProfile.objects.create(user=user, is_teacher=False)
            
            messages.success(request, f'生徒アカウント「{username}」を作成しました。')
            return redirect('cbt_app:manage_students')
    
    return render(request, 'cbt_app/add_student.html')

@teacher_required
def edit_student(request, student_id):
    """生徒編集ページ"""
    student = get_object_or_404(User, id=student_id, userprofile__is_teacher=False)
    
    if request.method == 'POST':
        student.first_name = request.POST.get('first_name', '')
        student.last_name = request.POST.get('last_name', '')
        
        # パスワード変更（入力された場合のみ）
        new_password = request.POST.get('new_password')
        if new_password:
            student.set_password(new_password)
        
        student.save()
        messages.success(request, f'生徒「{student.username}」の情報を更新しました。')
        return redirect('cbt_app:manage_students')
    
    return render(request, 'cbt_app/edit_student.html', {'student': student})

# API関数群

@login_required
@csrf_exempt
def save_annotation(request):
    """注釈を保存するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        annotation_type = data.get('annotation_type')
        start_position = data.get('start_position')
        end_position = data.get('end_position')
        content = data.get('content', '')
        
        # 文章の存在確認
        text = get_object_or_404(Text, id=text_id, is_active=True)
        
        # 注釈を保存
        annotation = StudentAnnotation.objects.create(
            student=request.user,
            text=text,
            start_position=start_position,
            end_position=end_position,
            annotation_type=annotation_type,
            content=content
        )
        
        return JsonResponse({
            'success': True,
            'annotation_id': annotation.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def get_annotations(request, text_id):
    """注釈を取得するAPI"""
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        annotations = StudentAnnotation.objects.filter(
            student=request.user,
            text=text
        ).order_by('start_position')
        
        annotation_data = []
        for annotation in annotations:
            annotation_data.append({
                'id': annotation.id,
                'type': annotation.annotation_type,
                'start_position': annotation.start_position,
                'end_position': annotation.end_position,
                'content': annotation.content,
                'created_at': annotation.created_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'annotations': annotation_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def log_activity(request):
    """学習活動をログに記録するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        activity_type = data.get('activity_type')
        details = data.get('details', {})
        
        # ログを保存
        log_entry = StudentActivityLog.objects.create(
            student=request.user,
            text_id=text_id if text_id else None,
            activity_type=activity_type,
            details=details
        )
        
        return JsonResponse({
            'success': True,
            'log_id': log_entry.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def update_annotation(request, annotation_id):
    """注釈を更新するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        content = data.get('content', '')
        
        # 注釈の存在確認と権限チェック
        annotation = get_object_or_404(StudentAnnotation, id=annotation_id, student=request.user)
        
        # 注釈を更新
        annotation.content = content
        annotation.save()
        
        return JsonResponse({
            'success': True,
            'annotation_id': annotation.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def delete_annotation(request, annotation_id):
    """注釈を削除するAPI"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'DELETE method required'})
    
    try:
        # 注釈の存在確認と権限チェック
        annotation = get_object_or_404(StudentAnnotation, id=annotation_id, student=request.user)
        
        # 注釈を削除
        annotation.delete()
        
        return JsonResponse({
            'success': True
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def save_active_reading_content(request):
    """積極的読み分析コンテンツを保存するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        content_type = data.get('content_type')
        title = data.get('title')
        content_data = data.get('data')
        
        text = get_object_or_404(Text, id=text_id, is_active=True)
        
        content = ActiveReadingContent.objects.create(
            student=request.user,
            text=text,
            content_type=content_type,
            title=title,
            data=content_data
        )
        
        return JsonResponse({
            'success': True,
            'content_id': content.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def get_active_reading_content(request, text_id):
    """積極的読み分析コンテンツを取得するAPI"""
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        content = ActiveReadingContent.objects.filter(
            student=request.user,
            text=text
        ).order_by('-created_at')
        
        content_data = []
        for item in content:
            content_data.append({
                'id': item.id,
                'content_type': item.content_type,
                'title': item.title,
                'data': item.data,
                'created_at': item.created_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'content': content_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def update_active_reading_content(request, content_id):
    """積極的読み分析コンテンツを更新するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        content = get_object_or_404(ActiveReadingContent, id=content_id, student=request.user)
        
        if 'title' in data:
            content.title = data['title']
        if 'data' in data:
            content.data = data['data']
        
        content.save()
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_exempt
def delete_active_reading_content(request, content_id):
    """積極的読み分析コンテンツを削除するAPI"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'DELETE method required'})
    
    try:
        content = get_object_or_404(ActiveReadingContent, id=content_id, student=request.user)
        content.delete()
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_exempt
def save_paragraph_definition(request):
    """ユーザー定義段落を保存するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        paragraph_number = data.get('paragraph_number')
        content = data.get('content')
        start_offset = data.get('start_offset')
        end_offset = data.get('end_offset')
        
        text = get_object_or_404(Text, id=text_id, is_active=True)
        
        paragraph_def = UserParagraphDefinition.objects.create(
            student=request.user,
            text=text,
            paragraph_number=paragraph_number,
            content=content,
            start_offset=start_offset,
            end_offset=end_offset
        )
        
        return JsonResponse({
            'success': True,
            'paragraph_id': paragraph_def.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def get_paragraph_definitions(request, text_id):
    """ユーザー定義段落を取得するAPI"""
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        paragraphs = UserParagraphDefinition.objects.filter(
            student=request.user,
            text=text
        ).order_by('paragraph_number')
        
        paragraph_data = []
        for paragraph in paragraphs:
            paragraph_data.append({
                'number': paragraph.paragraph_number,
                'content': paragraph.content,
                'startOffset': paragraph.start_offset,
                'endOffset': paragraph.end_offset,
                'createdAt': paragraph.created_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'paragraphs': paragraph_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
def delete_paragraph_definition(request, text_id, paragraph_number):
    """ユーザー定義段落を削除するAPI"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'DELETE method required'})
    
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        paragraph = get_object_or_404(
            UserParagraphDefinition,
            student=request.user,
            text=text,
            paragraph_number=paragraph_number
        )
        
        paragraph.delete()
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({
            'success': False, 'error': str(e)
        })

@login_required
@csrf_exempt
def save_all_paragraphs(request):
    """全ての段落を一括保存するAPI"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        paragraphs = data.get('paragraphs', [])
        
        text = get_object_or_404(Text, id=text_id, is_active=True)
        
        # 既存の段落定義を全て削除
        UserParagraphDefinition.objects.filter(
            student=request.user,
            text=text
        ).delete()
        
        # 新しい段落定義を一括作成
        paragraph_objects = []
        for paragraph in paragraphs:
            paragraph_objects.append(
                UserParagraphDefinition(
                    student=request.user,
                    text=text,
                    paragraph_number=paragraph['number'],
                    content=paragraph['content'],
                    start_offset=paragraph['startOffset'],
                    end_offset=paragraph['endOffset']
                )
            )
        
        UserParagraphDefinition.objects.bulk_create(paragraph_objects)
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_reading_session(request, text_id):
    """読解セッション情報を取得"""
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        session, created = ReadingSession.objects.get_or_create(
            student=request.user,
            text=text
        )
        
        return JsonResponse({
            'success': True,
            'session': {
                'id': session.id,
                'current_phase': session.current_phase,
                'reading_start_time': session.reading_start_time.isoformat() if session.reading_start_time else None,
                'reading_end_time': session.reading_end_time.isoformat() if session.reading_end_time else None,
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_exempt
def transition_to_answering(request):
    """解答フェーズへの移行"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        
        text = get_object_or_404(Text, id=text_id, is_active=True)
        session = get_object_or_404(ReadingSession, student=request.user, text=text)
        
        session.current_phase = 'answering'
        session.reading_end_time = timezone.now()
        session.answering_start_time = timezone.now()
        session.save()
        
        return JsonResponse({
            'success': True,
            'session_id': session.id
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_exempt
def transition_to_reading(request):
    """読解フェーズへの移行"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        text_id = data.get('text_id')
        
        text = get_object_or_404(Text, id=text_id, is_active=True)
        session = get_object_or_404(ReadingSession, student=request.user, text=text)
        
        session.current_phase = 'reading'
        session.answering_end_time = timezone.now()
        session.save()
        
        return JsonResponse({
            'success': True,
            'session_id': session.id
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_all_memos(request, text_id):
    """全てのメモ（段落定義＋分析コンテンツ）を取得"""
    try:
        text = get_object_or_404(Text, id=text_id, is_active=True)
        
        # 段落定義を取得
        paragraphs = UserParagraphDefinition.objects.filter(
            student=request.user,
            text=text
        )
        
        # 積極的読み分析コンテンツを取得
        analysis_content = ActiveReadingContent.objects.filter(
            student=request.user,
            text=text
        )
        
        memos = []
        
        # 段落定義をメモ形式に変換
        for paragraph in paragraphs:
            memos.append({
                'type': 'paragraph',
                'title': f'段落{paragraph.paragraph_number}',
                'content': paragraph.content,
                'data': {},
                'created_at': paragraph.created_at.isoformat()
            })
        
        # 分析コンテンツをメモ形式に変換
        for content in analysis_content:
            memos.append({
                'type': content.content_type,
                'title': content.title,
                'content': '',
                'data': content.data,
                'created_at': content.created_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'memos': memos
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
