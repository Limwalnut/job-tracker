using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace JobTracker.Api.Services;

public sealed class InterviewPreparationTools(AppDbContext context)
{
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
    string toolName,
    string arguments,
    CancellationToken cancellationToken)
    {
        if (toolName is not (
            "get_next_interview" or
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

            if (toolName == "get_next_interview")
            {
                if (root.EnumerateObject().Any())
                {
                    return JsonSerializer.Serialize(new
                    {
                        error = "This tool does not accept arguments."
                    });
                }

                var interview = await GetNextInterviewAsync(
                    userId,
                    cancellationToken);

                return JsonSerializer.Serialize(new
                {
                    found = interview is not null,
                    interview = interview is null ? null : new
                    {
                        interview.ApplicationId,
                        interview.CompanyName,
                        interview.JobTitle,
                        interview.StartsAt,
                        interview.TimeZone,
                        interview.IsAllDay
                    }
                });
            }

            if (root.EnumerateObject().Count() != 1 ||
                !root.TryGetProperty("applicationId", out var idElement) ||
                idElement.ValueKind != JsonValueKind.Number ||
                !idElement.TryGetInt32(out var applicationId) ||
                applicationId <= 0)
            {
                return JsonSerializer.Serialize(new
                {
                    error = "Provide exactly one positive integer applicationId."
                });
            }

            if (toolName == "get_application_context")
            {
                var application = await GetApplicationContextAsync(
                    userId,
                    applicationId,
                    cancellationToken);

                return JsonSerializer.Serialize(new
                {
                    found = application is not null,
                    application
                });
            }

            var items = await GetChecklistAsync(
                userId,
                applicationId,
                cancellationToken);

            return JsonSerializer.Serialize(new
            {
                applicationId,
                items,
                limit = 20
            });
        }
    }
}

