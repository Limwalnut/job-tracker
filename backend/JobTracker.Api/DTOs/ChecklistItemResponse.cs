using System.Linq.Expressions;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public record ChecklistItemResponse(
    int Id,
    int ApplicationId,
    string Title,
    string Stage,
    DateOnly? DueDate,
    bool IsCompleted,
    DateTimeOffset? CompletedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc)
{
    public static readonly Expression<Func<ApplicationChecklistItem, ChecklistItemResponse>> Projection =
        item => new ChecklistItemResponse(
            item.Id,
            item.ApplicationId,
            item.Title,
            item.Stage,
            item.DueDate,
            item.IsCompleted,
            item.CompletedAtUtc,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
}
