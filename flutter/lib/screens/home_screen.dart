import 'package:devtodollars/services/metadata_notifier.dart';
import 'package:devtodollars/services/notifications_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:devtodollars/services/auth_notifier.dart';
import 'package:url_launcher/url_launcher.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, required this.title});

  final String title;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  void _showNotificationsSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: Consumer(
            builder: (context, ref, child) {
              final notificationsAsync = ref.watch(notificationsProvider);
              return Container(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                height: MediaQuery.of(context).size.height * 0.5,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "الإشعارات",
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          TextButton(
                            onPressed: () {
                              NotificationsService.markAllAsRead();
                            },
                            child: const Text("تحديد الكل كمقروء"),
                          ),
                        ],
                      ),
                    ),
                    const Divider(),
                    Expanded(
                      child: notificationsAsync.when(
                        data: (list) {
                          if (list.isEmpty) {
                            return const Center(
                              child: Text("لا توجد إشعارات حالياً"),
                            );
                          }
                          return ListView.builder(
                            itemCount: list.length,
                            itemBuilder: (context, index) {
                              final notif = list[index];
                              final isRead = notif['is_read'] == true;
                              IconData icon;
                              Color iconColor;
                              switch (notif['type']) {
                                case 'approval_request':
                                  icon = Icons.hourglass_empty;
                                  iconColor = Colors.amber[800]!;
                                  break;
                                case 'approved':
                                case 'completed':
                                  icon = Icons.check_circle_outline;
                                  iconColor = Colors.green;
                                  break;
                                case 'rejected':
                                  icon = Icons.error_outline;
                                  iconColor = Colors.red;
                                  break;
                                default:
                                  icon = Icons.notifications_none;
                                  iconColor = Colors.grey;
                              }

                              return ListTile(
                                leading: Icon(icon, color: iconColor),
                                title: Text(
                                  notif['title'] ?? '',
                                  style: TextStyle(
                                    fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                  ),
                                ),
                                subtitle: notif['body'] != null ? Text(notif['body']) : null,
                                trailing: !isRead
                                    ? Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          color: Colors.blue,
                                          shape: BoxShape.circle,
                                        ),
                                      )
                                    : null,
                                onTap: () {
                                  NotificationsService.markAsRead(notif['id']);
                                  Navigator.pop(context);

                                  final link = notif['link'] as String?;
                                  if (link != null && link.contains('/approvals/')) {
                                    final id = link.split('/approvals/').last;
                                    if (id.isNotEmpty) {
                                      context.go('/approvals/$id');
                                    }
                                  }
                                },
                              );
                            },
                          );
                        },
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (err, _) => Center(child: Text("خطأ: $err")),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authNotif = ref.watch(authProvider.notifier);
    final metaAsync = ref.watch(metadataProvider);
    final notificationsAsync = ref.watch(notificationsProvider);
    final unreadCount = notificationsAsync.maybeWhen(
      data: (list) => list.where((n) => n['is_read'] == false).length,
      orElse: () => 0,
    );

    final pricingUrl = Uri.parse(
        "https://github.com/devtodollars/mvp-boilerplate/blob/main/flutter/README.md");
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          title: Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold)),
          actions: [
            Stack(
              alignment: Alignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications),
                  onPressed: () => _showNotificationsSheet(context, ref),
                ),
                if (unreadCount > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            TextButton(
              onPressed: () => context.replaceNamed("payments"),
              child: const Text("الاشتراكات", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            TextButton(
              onPressed: authNotif.signOut,
              child: const Text("تسجيل الخروج", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                // Welcome and status card
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey[200]!),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        metaAsync.when(
                          data: (metadata) {
                            final subscription = metadata?.subscription;
                            return Text(
                              subscription != null
                                  ? "أنت مشترك حالياً في خطة: ${subscription.prices?.products?.name}"
                                  : "أنت لست مشتركاً في أي خطة حالياً.",
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                              textAlign: TextAlign.center,
                            );
                          },
                          loading: () => const CircularProgressIndicator(),
                          error: (_, __) => const Text("فشل في تحميل خطة الاشتراك الحالي"),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => launchUrl(pricingUrl),
                          child: const Text("عرض خطط الأسعار"),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Approvals System Quick Access Card
                InkWell(
                  onTap: () => context.go('/approvals'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Theme.of(context).primaryColor, Theme.of(context).primaryColor.withOpacity(0.8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context).primaryColor.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        )
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'نظام المراسلات',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 6),
                              Text(
                                'إدارة طلبات الموافقة والمراسلات الرسمية وسلسلة الموافقات',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(width: 16),
                        Icon(
                          Icons.assignment_turned_in,
                          color: Colors.white,
                          size: 40,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
