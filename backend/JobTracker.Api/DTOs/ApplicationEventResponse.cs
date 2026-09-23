using System.Linq.Expressions;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public record ApplicationEventResponse(
    int Id, int ApplicationId, string CompanyName, string JobTitle,
    string Title, ApplicationEventType Type, ApplicationEventStatus Status,
    int? InterviewRound, string? InterviewStage, InterviewOutcome? InterviewOutcome,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt, bool IsAllDay, string TimeZone,
    string? LocationOrLink, string? Notes, bool UpdatedApplicationStatus)
{
    public static readonly Expression<Func<ApplicationEvent, ApplicationEventResponse>> Projection =
        e => new ApplicationEventResponse(e.Id, e.ApplicationId,
            e.Application.CompanyName, e.Application.JobTitle, e.Title, e.Type,
            e.Status, e.InterviewRound, e.InterviewStage, e.InterviewOutcome,
            e.StartsAt, e.EndsAt, e.IsAllDay, e.TimeZone, e.LocationOrLink, e.Notes,
            e.StatusChanges.Any(history => !history.IsReverted));
}
