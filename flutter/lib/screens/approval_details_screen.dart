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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(action == 'approve' ? 'تمت الموافقة بنجاح' : 'تم الرفض بنجاح'),
            backgroundColor: action == 'approve' ? Colors.green : Colors.red,
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
          title: const Text('تفاصيل طلب الاعتماد', style: TextStyle(fontWeight: FontWeight.bold)),
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

            final bool canAct = myStep.id.isNotEmpty && doc.status != 'completed' && doc.status != 'cancelled';

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
                      ],
                    ),
                  ),
                ),

                // Bottom Action Box (if user is the pending approver)
                if (canAct) _buildActionPanel(),
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
            'سلسلة الموافقات والاعتماد',
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
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.grey[50],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[200]!),
                                ),
                                child: Text(
                                  step.comment!,
                                  style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                                ),
                              ),
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
                hintText: 'اكتب تعليقك هنا (اختياري)...',
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
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('موافقة', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => _handleAction('reject'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      foregroundColor: Colors.red,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.red, strokeWidth: 2))
                        : const Text('رفض الاعتماد', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
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
}
