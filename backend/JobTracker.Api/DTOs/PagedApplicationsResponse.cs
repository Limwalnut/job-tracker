using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public sealed record PagedApplicationsResponse(
    IReadOnlyList<JobApplication> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    int ActiveCount,
    int ClosedCount,
    int AllCount,
    IReadOnlyDictionary<ApplicationStatus, int> StatusCounts);
