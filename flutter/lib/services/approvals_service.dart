import 'dart:convert';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:devtodollars/models/approvals.dart';
import 'package:devtodollars/services/auth_notifier.dart';

part 'approvals_service.g.dart';

class ApprovalsData {
  final List<Document> sent;
  final List<Document> pending;
  final List<ApprovalStep> mySteps;
  final Map<String, Profile> profiles;
  final String userId;

  ApprovalsData({
    required this.sent,
    required this.pending,
    required this.mySteps,
    required this.profiles,
    required this.userId,
  });
}

@riverpod
class Approvals extends _$Approvals {
  SupabaseClient get client => Supabase.instance.client;

  Future<String> _appendComment({
    required String? currentComment,
    required String userId,
    required String action,
    required String commentText,
    required String defaultApproverId,
  }) async {
    final profileRes = await client.from('profiles').select('full_name').eq('id', userId).single();
    final String userName = profileRes['full_name'] as String? ?? 'مستخدم';

    List<dynamic> commentList = [];
    if (currentComment != null && currentComment.trim().isNotEmpty) {
      try {
        final parsed = jsonDecode(currentComment);
        if (parsed is List) {
          commentList = parsed;
        } else {
          commentList = [
            {
              'user_id': defaultApproverId,
              'user_name': 'معتمد',
              'action': 'تعليق سابق',
              'comment': currentComment,
              'created_at': DateTime.now().toUtc().toIso8601String(),
            }
          ];
        }
      } catch (_) {
        commentList = [
          {
            'user_id': defaultApproverId,
            'user_name': 'معتمد',
            'action': 'تعليق سابق',
            'comment': currentComment,
            'created_at': DateTime.now().toUtc().toIso8601String(),
          }
        ];
      }
    }

    String actionLabel = 'موافقة';
    if (action == 'reject') actionLabel = 'رفض';
    else if (action == 'request_changes') actionLabel = 'طلب تعديل';
    else if (action == 'resubmit') actionLabel = 'استكمال';

    commentList.add({
      'user_id': userId,
      'user_name': userName,
      'action': actionLabel,
      'comment': commentText,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });

    return jsonEncode(commentList);
  }

  @override
  Future<ApprovalsData?> build() async {
    final session = ref.watch(authProvider).value;
    if (session == null) return null;

    final userId = session.user.id;
    return await _fetchData(userId);
  }

  Future<ApprovalsData> _fetchData(String userId) async {
    // 1. Fetch documents created by the user (sent requests)
    final sentDocsRes = await client
        .from('documents')
        .select('*, approval_steps(*)')
        .eq('creator_id', userId)
        .eq('is_archived', false)
        .order('created_at', ascending: false);

    final List<Document> sent = (sentDocsRes as List)
        .map((json) => Document.fromJson(json as Map<String, dynamic>))
        .toList();

    // 2. Fetch approval steps assigned to the user
    final stepsRes = await client
        .from('approval_steps')
        .select('*')
        .eq('approver_id', userId)
        .order('created_at', ascending: false);

    final List<ApprovalStep> mySteps = (stepsRes as List)
        .map((json) => ApprovalStep.fromJson(json as Map<String, dynamic>))
        .toList();

    // 3. Fetch documents for steps assigned to the user (pending requests)
    List<Document> pending = [];
    if (mySteps.isNotEmpty) {
      final docIds = mySteps.map((s) => s.documentId).toSet().toList();
      final pendingDocsRes = await client
          .from('documents')
          .select('*, approval_steps(*)')
          .inFilter('id', docIds)
          .eq('is_archived', false);

      pending = (pendingDocsRes as List)
          .map((json) => Document.fromJson(json as Map<String, dynamic>))
          .toList();
    }

    // 4. Get all user profiles for approvers and creators in bulk
    final allUserIds = <String>{};
    for (var doc in sent) {
      allUserIds.add(doc.creatorId);
      for (var step in doc.approvalSteps) {
        allUserIds.add(step.approverId);
      }
    }
    for (var doc in pending) {
      allUserIds.add(doc.creatorId);
      for (var step in doc.approvalSteps) {
        allUserIds.add(step.approverId);
      }
    }

    final Map<String, Profile> profiles = {};
    if (allUserIds.isNotEmpty) {
      final profilesRes = await client
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .inFilter('id', allUserIds.toList());

      for (var p in profilesRes as List) {
        final profile = Profile.fromJson(p as Map<String, dynamic>);
        profiles[profile.id] = profile;
      }
    }

    return ApprovalsData(
      sent: sent,
      pending: pending,
      mySteps: mySteps,
      profiles: profiles,
      userId: userId,
    );
  }

  // Reload the data
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final session = ref.read(authProvider).value;
      if (session == null) return null;
      return await _fetchData(session.user.id);
    });
  }

  // Create a new document with sequential approval steps
  Future<void> createDocument({
    required String title,
    String? description,
    required List<String> approverIds,
  }) async {
    final session = ref.read(authProvider).value;
    if (session == null) throw Exception("Unauthorized");

    // Insert Document
    final docRes = await client.from('documents').insert({
      'title': title.trim(),
      'description': description?.trim(),
      'creator_id': session.user.id,
      'status': 'pending',
    }).select('id').single();

    final String docId = docRes['id'] as String;

    // Build steps
    final steps = List.generate(approverIds.length, (index) {
      return {
        'document_id': docId,
        'approver_id': approverIds[index],
        'sequence': index + 1,
        'status': index == 0 ? 'pending' : 'waiting',
      };
    });

    // Insert steps
    await client.from('approval_steps').insert(steps);

    // Update document status to in_progress
    await client.from('documents').update({'status': 'in_progress'}).eq('id', docId);

    // Notify first approver
    await client.from('notifications').insert({
      'user_id': approverIds[0],
      'type': 'approval_request',
      'title': 'طلب مراسلة جديد',
      'body': 'لديك طلب مراسلة جديد: ${title.trim()}',
      'link': '/approvals/$docId',
    });

    await refresh();
  }

  // Act on an approval step (Approve/Reject)
  Future<void> actOnStep({
    required String documentId,
    required String action, // 'approve' | 'reject'
    String? comment,
  }) async {
    final session = ref.read(authProvider).value;
    if (session == null) throw Exception("Unauthorized");

    final String userId = session.user.id;

    // Get current user's pending step
    final stepRes = await client
        .from('approval_steps')
        .select('id, sequence, comment')
        .eq('document_id', documentId)
        .eq('approver_id', userId)
        .eq('status', 'pending')
        .single();

    final String stepId = stepRes['id'] as String;
    final int sequence = stepRes['sequence'] as int;
    final String? currentComment = stepRes['comment'] as String?;

    if (action == 'request_changes') {
      final docRes = await client.from('documents').select('creator_id, title').eq('id', documentId).single();
      final String creatorId = docRes['creator_id'] as String;
      final String title = docRes['title'] as String;

      final String updatedCommentJson = await _appendComment(
        currentComment: currentComment,
        userId: userId,
        action: 'request_changes',
        commentText: comment?.trim() ?? 'مطلوب تعديل المراسلة',
        defaultApproverId: userId,
      );

      // Update step: keep pending status but update comment and acted_at
      await client.from('approval_steps').update({
        'comment': updatedCommentJson,
        'acted_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', stepId);

      await client.from('documents').update({'status': 'paused'}).eq('id', documentId);

      final profileRes = await client.from('profiles').select('full_name').eq('id', userId).single();
      final String approverName = profileRes['full_name'] as String? ?? session.user.email ?? '';

      await client.from('notifications').insert({
        'user_id': creatorId,
        'type': 'approval_request',
        'title': 'طلب تعديل على المراسلة',
        'body': 'طلب $approverName تعديل على المراسلة: $title. الملاحظة: ${comment?.trim() ?? 'يرجى مراجعة الطلب'}',
        'link': '/approvals/$documentId',
      });
      await refresh();
      return;
    }

    final String newStepStatus = action == 'approve' ? 'approved' : 'rejected';
    final String updatedCommentJson = await _appendComment(
      currentComment: currentComment,
      userId: userId,
      action: action,
      commentText: comment?.trim() ?? (action == 'approve' ? 'موافق' : 'مرفوض'),
      defaultApproverId: userId,
    );

    // Update step
    await client.from('approval_steps').update({
      'status': newStepStatus,
      'comment': updatedCommentJson,
      'acted_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', stepId);

    if (action == 'reject') {
      // Reject: cancel document
      final docRes = await client.from('documents').select('creator_id, title').eq('id', documentId).single();
      final String creatorId = docRes['creator_id'] as String;
      final String title = docRes['title'] as String;

      await client.from('documents').update({'status': 'cancelled'}).eq('id', documentId);

      // Notify creator
      await client.from('notifications').insert({
        'user_id': creatorId,
        'type': 'rejected',
        'title': 'تم رفض طلب المراسلة',
        'body': 'تم رفض طلبك: $title',
        'link': '/approvals/$documentId',
      });
    } else {
      // Approve: check next step
      final nextStepRes = await client
          .from('approval_steps')
          .select('id, approver_id')
          .eq('document_id', documentId)
          .eq('sequence', sequence + 1)
          .maybeSingle();

      if (nextStepRes != null) {
        final String nextStepId = nextStepRes['id'] as String;
        final String nextApproverId = nextStepRes['approver_id'] as String;

        // Activate next step
        await client.from('approval_steps').update({'status': 'pending'}).eq('id', nextStepId);

        // Notify next approver
        final docRes = await client.from('documents').select('title').eq('id', documentId).single();
        final String title = docRes['title'] as String;

        await client.from('notifications').insert({
          'user_id': nextApproverId,
          'type': 'approval_request',
          'title': 'طلب مراسلة يحتاج موافقتك',
          'body': 'يحتاج الطلب "$title" موافقتك',
          'link': '/approvals/$documentId',
        });
      } else {
        // Complete the document
        final docRes = await client.from('documents').select('creator_id, title').eq('id', documentId).single();
        final String creatorId = docRes['creator_id'] as String;
        final String title = docRes['title'] as String;

        await client.from('documents').update({'status': 'completed'}).eq('id', documentId);

        // Notify creator
        await client.from('notifications').insert({
          'user_id': creatorId,
          'type': 'completed',
          'title': 'اكتملت المراسلة',
          'body': 'تمت الموافقة على طلبك: $title',
          'link': '/approvals/$documentId',
        });
      }
    }

    // Mark all unread notifications for this user about this document as read
    await client
        .from('notifications')
        .update({'is_read': true})
        .eq('user_id', userId)
        .eq('is_read', false)
        .like('link', '%$documentId');

    await refresh();
  }

  Future<void> resubmitDocument({
    required String documentId,
    String? comment,
  }) async {
    final session = ref.read(authProvider).value;
    if (session == null) throw Exception("Unauthorized");

    final String userId = session.user.id;

    // Verify document is paused and user is creator
    final docRes = await client
        .from('documents')
        .select('creator_id, title, status')
        .eq('id', documentId)
        .single();

    final String creatorId = docRes['creator_id'] as String;
    final String title = docRes['title'] as String;
    final String status = docRes['status'] as String;

    if (creatorId != userId) throw Exception("Forbidden");
    if (status != 'paused') throw Exception("Document is not in paused state");

    // Update document status to in_progress
    await client.from('documents').update({
      'status': 'in_progress',
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', documentId);

    // Get current pending step to notify
    final stepRes = await client
        .from('approval_steps')
        .select('id, approver_id, comment')
        .eq('document_id', documentId)
        .eq('status', 'pending')
        .maybeSingle();

    if (stepRes != null) {
      final String stepId = stepRes['id'] as String;
      final String approverId = stepRes['approver_id'] as String;
      final String? currentComment = stepRes['comment'] as String?;

      final String updatedCommentJson = await _appendComment(
        currentComment: currentComment,
        userId: userId,
        action: 'resubmit',
        commentText: comment?.trim() ?? 'تم تعديل المطلوب واستكمال المراسلة',
        defaultApproverId: approverId,
      );

      // Reset step acted_at and update comment
      await client.from('approval_steps').update({
        'acted_at': null,
        'comment': updatedCommentJson,
      }).eq('id', stepId);

      // Fetch creator name
      final profileRes = await client.from('profiles').select('full_name').eq('id', userId).single();
      final String creatorName = profileRes['full_name'] as String? ?? session.user.email ?? '';

      await client.from('notifications').insert({
        'user_id': approverId,
        'type': 'approval_request',
        'title': 'تم تعديل واستكمال المراسلة',
        'body': 'قام $creatorName بتعديل المراسلة "$title" واستكمالها للمراجعة. التعليق: ${comment?.trim() ?? 'تم التعديل'}',
        'link': '/approvals/$documentId',
      });
    // Mark all unread notifications for this user about this document as read
    await client
        .from('notifications')
        .update({'is_read': true})
        .eq('user_id', userId)
        .eq('is_read', false)
        .like('link', '%$documentId');

    await refresh();
  }

  // Fetch all profiles for approvers list selection
  Future<List<Profile>> getAllProfiles() async {
    final res = await client.from('profiles').select('id, full_name, avatar_url, email');
    return (res as List).map((p) => Profile.fromJson(p as Map<String, dynamic>)).toList();
  }
}
