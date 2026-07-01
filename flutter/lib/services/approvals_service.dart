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
      'title': 'طلب اعتماد جديد',
      'body': 'لديك طلب اعتماد جديد: ${title.trim()}',
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
        .select('id, sequence')
        .eq('document_id', documentId)
        .eq('approver_id', userId)
        .eq('status', 'pending')
        .single();

    final String stepId = stepRes['id'] as String;
    final int sequence = stepRes['sequence'] as int;

    final String newStepStatus = action == 'approve' ? 'approved' : 'rejected';

    // Update step
    await client.from('approval_steps').update({
      'status': newStepStatus,
      'comment': comment?.trim(),
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
        'title': 'تم رفض طلب الاعتماد',
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
          'title': 'طلب اعتماد يحتاج موافقتك',
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
          'title': 'اكتمل الاعتماد',
          'body': 'تمت الموافقة على طلبك: $title',
          'link': '/approvals/$documentId',
        });
      }
    }

    await refresh();
  }

  // Fetch all profiles for approvers list selection
  Future<List<Profile>> getAllProfiles() async {
    final res = await client.from('profiles').select('id, full_name, avatar_url, email');
    return (res as List).map((p) => Profile.fromJson(p as Map<String, dynamic>)).toList();
  }
}
