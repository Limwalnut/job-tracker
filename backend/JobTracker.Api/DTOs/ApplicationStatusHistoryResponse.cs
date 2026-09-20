using System.Linq.Expressions;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public record ApplicationStatusHistoryResponse(
    int Id,
    int ApplicationId,
    ApplicationStatus? FromStatus,
    ApplicationStatus ToStatus,
    DateTimeOffset ChangedAt,
    ApplicationStatusChangeSource Source,
    int? ApplicationEventId,
    bool IsReverted,
    DateTimeOffset? RevertedAt,
    bool CanUndo)
{
    public static readonly Expression<Func<ApplicationStatusHistory, ApplicationStatusHistoryResponse>> Projection =
        history => new ApplicationStatusHistoryResponse(
            history.Id,
            history.ApplicationId,
            history.FromStatus,
            history.ToStatus,
            history.ChangedAt,
            history.Source,
            history.ApplicationEventId,
            history.IsReverted,
            history.RevertedAt,
            false);
}
