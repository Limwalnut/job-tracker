using System.Linq.Expressions;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public record ApplicationEventResponse(
    int Id, int ApplicationId, string CompanyName, string JobTitle,
    string Title, ApplicationEventType Type, ApplicationEventStatus Status,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt, string TimeZone,
    string? LocationOrLink, string? Notes)
{
    public static readonly Expression<Func<ApplicationEvent, ApplicationEventResponse>> Projection =
        e => new ApplicationEventResponse(e.Id, e.ApplicationId,
            e.Application.CompanyName, e.Application.JobTitle, e.Title, e.Type,
            e.Status, e.StartsAt, e.EndsAt, e.TimeZone, e.LocationOrLink, e.Notes);
}
