import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:devtodollars/services/approvals_service.dart';
import 'package:devtodollars/models/approvals.dart';

class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final approvalsAsync = ref.watch(approvalsProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: const Text(
            'نظام الاعتمادات',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
          ),
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          bottom: TabBar(
            controller: _tabController,
            labelColor: Theme.of(context).primaryColor,
            unselectedLabelColor: Colors.grey[600],
            indicatorColor: Theme.of(context).primaryColor,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            tabs: const [
              Tab(text: 'بانتظار موافقتك'),
              Tab(text: 'الطلبات المرسلة'),
              Tab(text: 'تمت الموافقة عليها'),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 28),
              onPressed: () => context.go('/approvals/new'),
            ),
          ],
        ),
        body: approvalsAsync.when(
          data: (data) {
            if (data == null) {
              return const Center(child: Text('يرجى تسجيل الدخول أولاً'));
            }

            // Filter data
            final userId = data.userId;

            // Pending: current user has a pending step
            final pendingDocs = data.pending.where((doc) {
              return doc.approvalSteps.any(
                (step) => step.approverId == userId && step.status == 'pending',
              );
            }).toList();

            // Approved: current user has an approved step
            final approvedDocs = data.pending.where((doc) {
              return doc.approvalSteps.any(
                (step) => step.approverId == userId && step.status == 'approved',
              );
            }).toList();

            final sentDocs = data.sent;

            return Column(
              children: [
                // Stats banner
                _buildStatsBanner(pendingDocs.length, sentDocs.length, approvedDocs.length),

                // Search Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val.trim().toLowerCase();
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'البحث عن طلب...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[200]!),
                      ),
                    ),
                  ),
                ),

                // Tab Content
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildDocumentList(pendingDocs, data.profiles, true),
                      _buildDocumentList(sentDocs, data.profiles, false),
                      _buildDocumentList(approvedDocs, data.profiles, false),
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('حدث خطأ: $err')),
        ),
      ),
    );
  }

  Widget _buildStatsBanner(int pending, int sent, int approved) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard('تنتظر موافقتك', pending.toString(), Colors.amber[700]!, Colors.amber[50]!),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard('إجمالي المرسلة', sent.toString(), Colors.blue[700]!, Colors.blue[50]!),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard('تمت الموافقة', approved.toString(), Colors.green[700]!, Colors.green[50]!),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: color.withOpacity(0.8)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentList(List<Document> docs, Map<String, Profile> profiles, bool isPendingTab) {
    final filtered = docs.where((doc) {
      if (_searchQuery.isEmpty) return true;
      return doc.title.toLowerCase().contains(_searchQuery) ||
          (doc.description?.toLowerCase().contains(_searchQuery) ?? false) ||
          doc.requestNumber.toString().contains(_searchQuery);
    }).toList();

    if (filtered.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => ref.read(approvalsProvider.notifier).refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 100),
            Center(
              child: Column(
                children: [
                  Icon(Icons.inbox, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('لا توجد طلبات اعتماد حالياً', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(approvalsProvider.notifier).refresh(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final doc = filtered[index];
          final creator = profiles[doc.creatorId];

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
              border: Border.all(color: Colors.grey[150]!),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => context.go('/approvals/${doc.id}'),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '#${doc.requestNumber}',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            color: Colors.grey[500],
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        _buildStatusBadge(doc.status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Title
                    Text(
                      doc.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    if (doc.description != null && doc.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        doc.description!,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const Divider(height: 24),
                    // Bottom row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                              child: Text(
                                creator?.fullName?.isNotEmpty == true ? creator!.fullName![0] : '؟',
                                style: TextStyle(fontSize: 10, color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              creator?.fullName ?? 'غير معروف',
                              style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                            ),
                          ],
                        ),
                        Text(
                          _formatDate(doc.createdAt),
                          style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ),
          );
        },
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

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return '${date.year}/${date.month}/${date.day}';
    } catch (_) {
      return dateStr;
    }
  }
}
