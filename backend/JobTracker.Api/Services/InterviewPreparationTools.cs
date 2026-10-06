using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace JobTracker.Api.Services;

public sealed class InterviewPreparationTools(AppDbContext context)
{
    public async Task<bool> OwnsApplicationAsync(
        string userId,
        int applicationId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        return await context.Applications
            .AsNoTracking()
            .AnyAsync(application =>
                application.Id == applicationId &&
                application.UserId == userId,
                cancellationToken);
    }

    public async Task<ApplicationEventResponse?> GetApplicationInterviewAsync(
        string userId,
        int applicationId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        var now = DateTimeOffset.UtcNow;

        return await context.ApplicationEvents
            .AsNoTracking()
            .Where(applicationEvent =>
                applicationEvent.ApplicationId == applicationId &&
                applicationEvent.Application.UserId == userId &&
                applicationEvent.Type == ApplicationEventType.Interview &&
                applicationEvent.Status == ApplicationEventStatus.Scheduled &&
                applicationEvent.StartsAt >= now)
            .OrderBy(applicationEvent => applicationEvent.StartsAt)
            .ThenBy(applicationEvent => applicationEvent.Id)
            .Select(ApplicationEventResponse.Projection)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ApplicationEventResponse?> GetNextInterviewAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        var now = DateTimeOffset.UtcNow;

        return await context.ApplicationEvents
            .AsNoTracking()
            .Where(e =>
                e.Application.UserId == userId &&
                e.Type == ApplicationEventType.Interview &&
                e.Status == ApplicationEventStatus.Scheduled &&
                e.StartsAt >= now)
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Select(ApplicationEventResponse.Projection)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ApplicationPreparationContext?> GetApplicationContextAsync(
    string userId,
    int applicationId,
    CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        return await context.Applications
            .AsNoTracking()
            .Where(application =>
                application.Id == applicationId &&
                application.UserId == userId)
            .Select(application => new ApplicationPreparationContext(
                application.Id,
                application.CompanyName,
                application.JobTitle,
                application.JobDescription,
                application.Notes))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<List<ChecklistPreparationItem>> GetChecklistAsync(
    string userId,
    int applicationId,
    CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        return await context.ApplicationChecklistItems
            .AsNoTracking()
            .Where(item =>
                item.ApplicationId == applicationId &&
                item.Application.UserId == userId)
            .OrderBy(item => item.IsCompleted)
            .ThenBy(item => item.Id)
            .Take(20)
            .Select(item => new ChecklistPreparationItem(
                item.Id,
                item.Title,
                item.DueDate,
                item.IsCompleted))
            .ToListAsync(cancellationToken);
    }

    public async Task<string> ExecuteAsync(
    string userId,
    int scopedApplicationId,
    string toolName,
    string arguments,
    CancellationToken cancellationToken)
    {
        if (scopedApplicationId <= 0)
        {
            return JsonSerializer.Serialize(new
            {
                error = "The current application is invalid."
            });
        }

        if (toolName is not (
            "get_application_interview" or
            "get_application_context" or
            "get_checklist"))
        {
            return JsonSerializer.Serialize(new
            {
                error = "Unknown tool."
            });
        }

        JsonDocument document;

        try
        {
            document = JsonDocument.Parse(arguments);
        }
        catch (JsonException)
        {
            return JsonSerializer.Serialize(new
            {
                error = "Tool arguments must be valid JSON."
            });
        }

        using (document)
        {
            var root = document.RootElement;

            if (root.ValueKind != JsonValueKind.Object)
            {
                return JsonSerializer.Serialize(new
                {
                    error = "Tool arguments must be an object."
                });
            }

            if (root.EnumerateObject().Any())
            {
                return JsonSerializer.Serialize(new
                {
                    error = "These tools use the current application and do not accept arguments."
                });
            }

            if (toolName == "get_application_interview")
            {
                var interview = await GetApplicationInterviewAsync(
                    userId,
                    scopedApplicationId,
                    cancellationToken);

                return JsonSerializer.Serialize(new
                {
                    found = interview is not null,
                    interview = interview is null ? null : new
                    {
                        interview.Id,
                        interview.ApplicationId,
                        interview.Title,
                        interview.InterviewRound,
                        interview.InterviewStage,
                        interview.StartsAt,
                        interview.EndsAt,
                        interview.IsAllDay,
                        interview.TimeZone,
                        interview.Notes
                    }
                });
            }

            if (toolName == "get_application_context")
            {
                var application = await GetApplicationContextAsync(
                    userId,
                    scopedApplicationId,
                    cancellationToken);

                return JsonSerializer.Serialize(new
                {
                    found = application is not null,
                    application
                });
            }

            var items = await GetChecklistAsync(
                userId,
                scopedApplicationId,
                cancellationToken);

            return JsonSerializer.Serialize(new
            {
                applicationId = scopedApplicationId,
                items,
                limit = 20
            });
        }
    }
}
