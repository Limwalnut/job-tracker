using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Services;

public static class ApplicationStatusTimeline
{
    public static void RecordInitialStatus(
        AppDbContext context,
        JobApplication application)
    {
        var appliedAt = new DateTimeOffset(
            application.AppliedDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

        context.ApplicationStatusHistories.Add(new ApplicationStatusHistory
        {
            Application = application,
            FromStatus = null,
            ToStatus = application.Status,
            ChangedAt = appliedAt,
            Source = ApplicationStatusChangeSource.System
        });
    }

    public static bool ChangeStatus(
        AppDbContext context,
        JobApplication application,
        ApplicationStatus nextStatus,
        ApplicationStatusChangeSource source,
        ApplicationEvent? applicationEvent = null)
    {
        // Event-backed transitions also represent individual pipeline stages.
        // Recording them when the broad status is unchanged lets Interview 2
        // return to Interview 1 (and Assessment 2 to Assessment 1) without
        // introducing a separate status value for every round.
        if (application.Status == nextStatus && applicationEvent is null)
        {
            return false;
        }

        context.ApplicationStatusHistories.Add(new ApplicationStatusHistory
        {
            ApplicationId = application.Id,
            FromStatus = application.Status,
            ToStatus = nextStatus,
            ChangedAt = DateTimeOffset.UtcNow,
            Source = source,
            ApplicationEvent = applicationEvent
        });

        application.Status = nextStatus;
        return true;
    }

    public static async Task<bool> UndoLatestChange(
        AppDbContext context,
        JobApplication application,
        int? requiredApplicationEventId = null)
    {
        var latest = await context.ApplicationStatusHistories
            .Where(history =>
                history.ApplicationId == application.Id &&
                history.FromStatus != null &&
                !history.IsReverted)
            .OrderByDescending(history => history.ChangedAt)
            .ThenByDescending(history => history.Id)
            .FirstOrDefaultAsync();

        if (latest is null ||
            latest.ToStatus != application.Status ||
            (requiredApplicationEventId.HasValue &&
             latest.ApplicationEventId != requiredApplicationEventId.Value))
        {
            return false;
        }

        latest.IsReverted = true;
        latest.RevertedAt = DateTimeOffset.UtcNow;
        application.Status = latest.FromStatus!.Value;
        return true;
    }
}
