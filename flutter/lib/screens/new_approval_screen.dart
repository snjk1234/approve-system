import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:devtodollars/services/approvals_service.dart';
import 'package:devtodollars/models/approvals.dart';

class NewApprovalScreen extends ConsumerStatefulWidget {
  const NewApprovalScreen({super.key});

  @override
  ConsumerState<NewApprovalScreen> createState() => _NewApprovalScreenState();
}

class _NewApprovalScreenState extends ConsumerState<NewApprovalScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final List<Profile> _selectedApprovers = [];
  List<Profile> _availableProfiles = [];
  bool _loadingProfiles = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadProfiles();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadProfiles() async {
    try {
      final profiles = await ref.read(approvalsProvider.notifier).getAllProfiles();
      final approvalsData = ref.read(approvalsProvider).value;
      final currentUserId = approvalsData?.userId;

      setState(() {
        // Exclude current user from the potential approver list
        _availableProfiles = profiles.where((p) => p.id != currentUserId).toList();
        _loadingProfiles = false;
      });
    } catch (_) {
      setState(() {
        _loadingProfiles = false;
      });
    }
  }

  void _addApprover(Profile profile) {
    if (!_selectedApprovers.any((p) => p.id == profile.id)) {
      setState(() {
        _selectedApprovers.add(profile);
      });
    }
  }

  void _removeApprover(int index) {
    setState(() {
      _selectedApprovers.removeAt(index);
    });
  }

  void _showApproverSelector() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'اختر معتمد للمرحلة',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: _availableProfiles.isEmpty
                      ? const Center(child: Text('لا يوجد موظفون متاحون'))
                      : ListView.builder(
                          itemCount: _availableProfiles.length,
                          itemBuilder: (context, index) {
                            final p = _availableProfiles[index];
                            final isSelected = _selectedApprovers.any((selected) => selected.id == p.id);

                            return ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                                child: Text(
                                  p.fullName?.isNotEmpty == true ? p.fullName![0] : '؟',
                                  style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Text(p.fullName ?? 'غير معروف'),
                              subtitle: Text(p.email ?? ''),
                              trailing: isSelected
                                  ? const Icon(Icons.check_circle, color: Colors.green)
                                  : const Icon(Icons.add_circle_outline),
                              onTap: isSelected
                                  ? null
                                  : () {
                                      _addApprover(p);
                                      Navigator.pop(context);
                                    },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedApprovers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يجب إضافة معتمد واحد على الأقل للموافقة'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() {
      _submitting = true;
    });

    try {
      final approverIds = _selectedApprovers.map((p) => p.id).toList();
      await ref.read(approvalsProvider.notifier).createDocument(
            title: _titleController.text,
            description: _descriptionController.text,
            approverIds: approverIds,
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إنشاء طلب المراسلة بنجاح'), backgroundColor: Colors.green),
        );
        context.go('/approvals');
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
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: const Text('طلب مراسلة جديد', style: TextStyle(fontWeight: FontWeight.bold)),
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
        ),
        body: _loadingProfiles
            ? const Center(child: CircularProgressIndicator())
            : Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Form Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey[200]!),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('تفاصيل الطلب', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _titleController,
                              decoration: InputDecoration(
                                labelText: 'عنوان طلب المراسلة *',
                                hintText: 'مثال: مراسلة فاتورة المشتريات لشهر يونيو',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'يرجى إدخال عنوان الطلب';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _descriptionController,
                              decoration: InputDecoration(
                                labelText: 'تفاصيل إضافية (اختياري)',
                                hintText: 'اكتب هنا أي تفاصيل أو ملاحظات تفيد المعتمدين...',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              maxLines: 3,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Approvers Flow Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
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
                                const Text('تسلسل المعتمدين (حسب الدور)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                TextButton.icon(
                                  onPressed: _showApproverSelector,
                                  icon: const Icon(Icons.add, size: 18),
                                  label: const Text('أضف معتمد'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (_selectedApprovers.isEmpty)
                              Center(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 24.0),
                                  child: Column(
                                    children: [
                                      Icon(Icons.people_outline, size: 48, color: Colors.grey[400]),
                                      const SizedBox(height: 8),
                                      Text(
                                        'لم يتم تحديد معتمدين للمستند بعد',
                                        style: TextStyle(color: Colors.grey[500], fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            else
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _selectedApprovers.length,
                                itemBuilder: (context, index) {
                                  final approver = _selectedApprovers[index];
                                  return Card(
                                    elevation: 0,
                                    margin: const EdgeInsets.symmetric(vertical: 4),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      side: BorderSide(color: Colors.grey[200]!),
                                    ),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: Colors.grey[100],
                                        child: Text(
                                          '${index + 1}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                      ),
                                      title: Text(approver.fullName ?? 'غير معروف'),
                                      subtitle: Text(approver.email ?? ''),
                                      trailing: IconButton(
                                        icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                                        onPressed: () => _removeApprover(index),
                                      ),
                                    ),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _submitting
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text(
                                  'إرسال طلب المراسلة',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      )
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}
