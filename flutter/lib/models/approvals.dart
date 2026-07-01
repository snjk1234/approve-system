class Profile {
  final String id;
  final String? fullName;
  final String? avatarUrl;
  final String? email;

  Profile({
    required this.id,
    this.fullName,
    this.avatarUrl,
    this.email,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'avatar_url': avatarUrl,
      'email': email,
    };
  }
}

class ApprovalStep {
  final String id;
  final String documentId;
  final String approverId;
  final int sequence;
  final String status; // 'waiting' | 'pending' | 'approved' | 'rejected'
  final String? comment;
  final String? actedAt;

  ApprovalStep({
    required this.id,
    required this.documentId,
    required this.approverId,
    required this.sequence,
    required this.status,
    this.comment,
    this.actedAt,
  });

  factory ApprovalStep.fromJson(Map<String, dynamic> json) {
    return ApprovalStep(
      id: json['id'] as String,
      documentId: json['document_id'] as String,
      approverId: json['approver_id'] as String,
      sequence: json['sequence'] as int,
      status: json['status'] as String,
      comment: json['comment'] as String?,
      actedAt: json['acted_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'document_id': documentId,
      'approver_id': approverId,
      'sequence': sequence,
      'status': status,
      'comment': comment,
      'acted_at': actedAt,
    };
  }
}

class Document {
  final String id;
  final int requestNumber;
  final String title;
  final String? description;
  final String creatorId;
  final String? fileUrl;
  final String? fileName;
  final String status; // 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
  final bool isArchived;
  final String createdAt;
  final String updatedAt;
  final List<ApprovalStep> approvalSteps;

  Document({
    required this.id,
    required this.requestNumber,
    required this.title,
    this.description,
    required this.creatorId,
    this.fileUrl,
    this.fileName,
    required this.status,
    required this.isArchived,
    required this.createdAt,
    required this.updatedAt,
    this.approvalSteps = const [],
  });

  factory Document.fromJson(Map<String, dynamic> json) {
    var stepsList = json['approval_steps'] as List?;
    List<ApprovalStep> steps = stepsList != null
        ? stepsList.map((s) => ApprovalStep.fromJson(s as Map<String, dynamic>)).toList()
        : [];

    return Document(
      id: json['id'] as String,
      requestNumber: json['request_number'] as int? ?? 0,
      title: json['title'] as String,
      description: json['description'] as String?,
      creatorId: json['creator_id'] as String,
      fileUrl: json['file_url'] as String?,
      fileName: json['file_name'] as String?,
      status: json['status'] as String,
      isArchived: json['is_archived'] as bool? ?? false,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
      approvalSteps: steps,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'request_number': requestNumber,
      'title': title,
      'description': description,
      'creator_id': creatorId,
      'file_url': fileUrl,
      'file_name': fileName,
      'status': status,
      'is_archived': isArchived,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'approval_steps': approvalSteps.map((s) => s.toJson()).toList(),
    };
  }
}
