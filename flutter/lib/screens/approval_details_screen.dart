import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:devtodollars/services/approvals_service.dart';
import 'package:devtodollars/models/approvals.dart';

class ApprovalDetailsScreen extends ConsumerStatefulWidget {
  final String documentId;

  const ApprovalDetailsScreen({super.key, required this.documentId});

  @override
  ConsumerState<ApprovalDetailsScreen> createState() => _ApprovalDetailsScreenState();
}

class _ApprovalDetailsScreenState extends ConsumerState<ApprovalDetailsScreen> {
  final TextEditingController _commentController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleAction(String action) async {
    setState(() {
      _submitting = true;
    });

    try {
      await ref.read(approvalsProvider.notifier).actOnStep(
            documentId: widget.documentId,
            action: action,
            comment: _commentController.text,
          );
      _commentController.clear();
      if (mounted) {
        String msg = 'تمت العملية بنجاح';
        if (action == 'approve') {
          msg = 'تمت الموافقة بنجاح';
        } else if (action == 'reject') {
          msg = 'تم الرفض بنجاح';
        } else if (action == 'request_changes') {
          msg = 'تم إرسال طلب التعديل بنجاح';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: action == 'approve' ? Colors.green : action == 'reject' ? Colors.red : Colors.amber[800],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('حدث خطأ: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Future<void> _handleResubmit() async {
    setState(() {
      _submitting = true;
    });

    try {
      await ref.read(approvalsProvider.notifier).resubmitDocument(
            documentId: widget.documentId,
            comment: _commentController.text,
          );
      _commentController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم استكمال المراسلة بنجاح'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('حدث خطأ: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final approvalsAsync = ref.watch(approvalsProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: const Text('تفاصيل طلب المراسلة', style: TextStyle(fontWeight: FontWeight.bold)),
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/approvals');
              }
            },
          ),
        ),
        body: approvalsAsync.when(
          data: (data) {
            if (data == null) {
              return const Center(child: Text('يرجى تسجيل الدخول'));
            }

            // Find current document
            Document? doc;
            try {
              doc = data.sent.firstWhere((d) => d.id == widget.documentId);
            } catch (_) {
              try {
                doc = data.pending.firstWhere((d) => d.id == widget.documentId);
              } catch (_) {}
            }

            if (doc == null) {
              return const Center(child: Text('لم يتم العثور على الوثيقة المطلوبة'));
            }

            final creator = data.profiles[doc.creatorId];
            final myStep = doc.approvalSteps.firstWhere(
              (step) => step.approverId == data.userId && step.status == 'pending',
              orElse: () => ApprovalStep(
                id: '',
                documentId: '',
                approverId: '',
                sequence: 0,
                status: 'none',
              ),
            );

            final bool canAct = myStep.id.isNotEmpty && doc.status == 'in_progress';
            final bool isCreator = doc.creatorId == data.userId;
            final bool canResubmit = isCreator && doc.status == 'paused';

            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Document Meta Card
                        _buildDocMetaCard(doc, creator),
                        const SizedBox(height: 20),

                        // Steps Timeline Card
                        _buildTimelineCard(doc.approvalSteps, data.profiles),
                        _buildUnifiedCommentsCard(doc.approvalSteps),
                      ],
                    ),
                  ),
                ),

                // Bottom Action Box (if user is the pending approver)
                if (canAct) _buildActionPanel(),
                // Bottom Resubmit Box (if user is the creator and changes are requested)
                if (canResubmit) _buildResubmitPanel(),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('حدث خطأ: $err')),
        ),
      ),
    );
  }

  Widget _buildDocMetaCard(Document doc, Profile? creator) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'طلب رقم #${doc.requestNumber}',
                style: TextStyle(fontFamily: 'monospace', color: Colors.grey[500], fontWeight: FontWeight.bold),
              ),
              _buildStatusBadge(doc.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            doc.title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          if (doc.description != null && doc.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              doc.description!,
              style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
            ),
          ],
          const Divider(height: 28),
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                child: Text(
                  creator?.fullName?.isNotEmpty == true ? creator!.fullName![0] : '؟',
                  style: TextStyle(fontSize: 12, color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    creator?.fullName ?? 'غير معروف',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'أنشئ في ${_formatDateTime(doc.createdAt)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              )
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard(List<ApprovalStep> steps, Map<String, Profile> profiles) {
    final sortedSteps = [...steps]..sort((a, b) => a.sequence - b.sequence);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'سلسلة الموافقات والمراسلة',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sortedSteps.length,
            itemBuilder: (context, index) {
              final step = sortedSteps[index];
              final profile = profiles[step.approverId];
              final isLast = index == sortedSteps.length - 1;

              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Timeline line and indicator
                    Column(
                      children: [
                        _buildStepIndicator(step.status),
                        if (!isLast)
                          Expanded(
                            child: Container(
                              width: 2,
                              color: _getStepLineColor(step.status),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    // Step details
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  profile?.fullName ?? 'معتمد خطوة ${step.sequence}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                _buildStepStatusBadge(step.status),
                              ],
                            ),
                            if (step.comment != null && step.comment!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              _buildCommentThread(step.comment!),
                            ],
                            if (step.actedAt != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                _formatDateTime(step.actedAt!),
                                style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(String status) {
    IconData icon;
    Color color;

    switch (status) {
      case 'approved':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'rejected':
        icon = Icons.cancel;
        color = Colors.red;
        break;
      case 'pending':
        icon = Icons.radio_button_checked;
        color = Colors.orange;
        break;
      default:
        icon = Icons.radio_button_off;
        color = Colors.grey;
    }

    return Icon(icon, color: color, size: 22);
  }

  Color _getStepLineColor(String status) {
    if (status == 'approved') return Colors.green[300]!;
    return Colors.grey[300]!;
  }

  Widget _buildActionPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          )
        ],
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _commentController,
              decoration: InputDecoration(
                hintText: 'اكتب تعليقك هنا (اختياري، أو إجباري عند طلب التعديل)...',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submitting ? null : () => _handleAction('approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('موافقة', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submitting ? null : () {
                      if (_commentController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('يرجى كتابة التعديل المطلوب في التعليق أولاً'), backgroundColor: Colors.amber),
                        );
                        return;
                      }
                      _handleAction('request_changes');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber[800],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('طلب تعديل', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => _handleAction('reject'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      foregroundColor: Colors.red,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.red, strokeWidth: 2))
                        : const Text('رفض', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResubmitPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          )
        ],
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.edit, color: Colors.amber[800]),
                const SizedBox(width: 8),
                Text(
                  'طلب تعديل على المراسلة',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber[800]),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'طلب المعتمد تعديلاً على المراسلة. يرجى تعديل المطلوب في الملفات أو التفاصيل ثم كتابة توضيح والضغط على زر استكمال المراسلة لإعادة الإرسال.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              decoration: InputDecoration(
                hintText: 'أضف تعليق استكمال (اختياري)...',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _submitting ? null : _handleResubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber[800],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('استكمال المراسلة (تم التعديل)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    Color bgColor;
    String label;

    switch (status) {
      case 'completed':
        color = Colors.green[700]!;
        bgColor = Colors.green[50]!;
        label = 'مكتمل';
        break;
      case 'pending':
        color = Colors.orange[700]!;
        bgColor = Colors.orange[50]!;
        label = 'معلق';
        break;
      case 'paused':
        color = Colors.amber[800]!;
        bgColor = Colors.amber[50]!;
        label = 'تحتاج تعديل';
        break;
      case 'in_progress':
        color = Colors.blue[700]!;
        bgColor = Colors.blue[50]!;
        label = 'قيد المراجعة';
        break;
      case 'cancelled':
        color = Colors.red[700]!;
        bgColor = Colors.red[50]!;
        label = 'مرفوض';
        break;
      default:
        color = Colors.grey[700]!;
        bgColor = Colors.grey[100]!;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  Widget _buildStepStatusBadge(String status) {
    Color color;
    String label;

    switch (status) {
      case 'approved':
        color = Colors.green;
        label = 'تمت الموافقة';
        break;
      case 'rejected':
        color = Colors.red;
        label = 'تم الرفض';
        break;
      case 'pending':
        color = Colors.orange;
        label = 'قيد المراجعة';
        break;
      case 'waiting':
        color = Colors.grey;
        label = 'بانتظار وصول الدور';
        break;
      default:
        color = Colors.grey;
        label = status;
    }

    return Text(
      label,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
    );
  }

  String _formatDateTime(String dateStr) {
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return '${date.year}/${date.month}/${date.day} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr;
    }
  }

  Widget _buildCommentThread(String commentString) {
    try {
      final List<dynamic> list = jsonDecode(commentString);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: list.map<Widget>((c) {
          final String userName = c['user_name'] ?? 'معتمد';
          final String action = c['action'] ?? 'تعليق';
          final String text = c['comment'] ?? '';
          final String? time = c['created_at'];

          return Container(
            width: double.infinity,
            margin: const EdgeInsets.only(top: 6),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$userName ($action)',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black85),
                    ),
                    if (time != null)
                      Text(
                        _formatDateTime(time),
                        style: TextStyle(fontSize: 9, color: Colors.grey[400]),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  text,
                  style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                ),
              ],
            ),
          );
        }).toList(),
      );
    } catch (_) {}

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Text(
        commentString,
        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
      ),
    );
  }

  Widget _buildUnifiedCommentsCard(List<ApprovalStep> steps) {
    final List<Map<String, dynamic>> allComments = [];

    for (final step in steps) {
      if (step.comment == null || step.comment!.isEmpty) continue;
      try {
        final List<dynamic> parsed = jsonDecode(step.comment!);
        for (final c in parsed) {
          allComments.add(Map<String, dynamic>.from(c as Map));
        }
      } catch (_) {
        allComments.add({
          'user_name': 'معتمد',
          'action': step.status == 'approved' ? 'موافقة' : step.status == 'rejected' ? 'رفض' : 'تعليق سابق',
          'comment': step.comment!,
          'created_at': step.actedAt ?? DateTime.now().toUtc().toIso8601String(),
        });
      }
    }

    allComments.sort((a, b) {
      final aTime = DateTime.parse(a['created_at'] as String);
      final bTime = DateTime.parse(b['created_at'] as String);
      return aTime.compareTo(bTime);
    });

    if (allComments.isEmpty) return const SizedBox.shrink();

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(top: 20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.comment, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'سلسلة التعليقات والملاحظات',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...allComments.map((c) {
              final String userName = c['user_name'] ?? 'معتمد';
              final String action = c['action'] ?? 'تعليق';
              final String text = c['comment'] ?? '';
              final String? time = c['created_at'];

              Color labelColor = Colors.grey;
              Color labelBg = Colors.grey[100]!;
              if (action == 'موافقة') {
                labelColor = Colors.green[700]!;
                labelBg = Colors.green[50]!;
              } else if (action == 'طلب تعديل') {
                labelColor = Colors.amber[800]!;
                labelBg = Colors.amber[50]!;
              } else if (action == 'استكمال' || action.contains('استكمال')) {
                labelColor = Colors.blue[700]!;
                labelBg = Colors.blue[50]!;
              } else if (action == 'رفض') {
                labelColor = Colors.red[700]!;
                labelBg = Colors.red[50]!;
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[100]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              userName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: labelBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                action,
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: labelColor),
                              ),
                            ),
                          ],
                        ),
                        if (time != null)
                          Text(
                            _formatDateTime(time),
                            style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      text,
                      style: TextStyle(fontSize: 13, color: Colors.grey[800]),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
