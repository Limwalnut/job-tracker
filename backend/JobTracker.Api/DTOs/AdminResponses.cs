using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public sealed record AdminTrendPoint(DateOnly Date, int Count);

public sealed record AdminStatusCount(ApplicationStatus Status, int Count);

public sealed record AdminAuditEntryResponse(
    long Id,
    string AdminUserId,
    string? TargetUserId,
    string Action,
    string? Detail,
    DateTimeOffset CreatedAtUtc);

public sealed record AdminOverviewResponse(
    int TotalUsers,
    int ActiveUsers7Days,
    int ActiveUsers30Days,
    int DisabledUsers,
    int TotalApplications,
    int TotalEvents,
    IReadOnlyList<AdminTrendPoint> NewUsers,
    IReadOnlyList<AdminStatusCount> ApplicationStatuses,
    IReadOnlyList<AdminAuditEntryResponse> RecentAuditLog);

public sealed record AdminUserListItemResponse(
    string Id,
    string Email,
    string? DisplayName,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastSeenAtUtc,
    DateTimeOffset? DisabledAtUtc,
    bool HasPassword,
    bool GoogleConnected,
    int ApplicationCount,
    int EventCount);

public sealed record AdminUsersResponse(
    IReadOnlyList<AdminUserListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record AdminUserDetailResponse(
    AdminUserListItemResponse User,
    IReadOnlyList<AdminStatusCount> ApplicationStatuses);

public sealed record UpdateAdminUserStatusRequest(bool Disabled);
