using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/applications/{applicationId:int}/events")]
public class ApplicationEventsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ApplicationEventsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent(
        int applicationId,
        [FromBody] CreateApplicationEventRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await _context.Applications
            .SingleOrDefaultAsync(application =>
                application.Id == applicationId &&
                application.UserId == userId);

        if (application is null)
        {
            return NotFound();
        }

        var timeZoneId = request.TimeZone.Trim();

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            ModelState.AddModelError(
                nameof(request.TimeZone),
                "The time zone was not found.");

            return ValidationProblem(ModelState);
        }
        catch (InvalidTimeZoneException)
        {
            ModelState.AddModelError(
                nameof(request.TimeZone),
                "The time zone is invalid.");

            return ValidationProblem(ModelState);
        }

        var eventType = request.Type!.Value;

        if (request.UpdateApplicationStatus)
        {
            ApplicationStatus? targetStatus = eventType switch
            {
                ApplicationEventType.Interview =>
                    ApplicationStatus.Interviewing,

                ApplicationEventType.Assessment =>
                    ApplicationStatus.Assessment,

                _ => null
            };

            if (targetStatus is null)
            {
                ModelState.AddModelError(
                    nameof(request.UpdateApplicationStatus),
                    "Follow-up events cannot automatically update application status.");

                return ValidationProblem(ModelState);
            }

            var canUpdate = targetStatus.Value switch
            {
                ApplicationStatus.Interviewing =>
                    application.Status is ApplicationStatus.Applied
                        or ApplicationStatus.Screening
                        or ApplicationStatus.Assessment
                        or ApplicationStatus.Interviewing,

                ApplicationStatus.Assessment =>
                    application.Status is ApplicationStatus.Applied
                        or ApplicationStatus.Screening
                        or ApplicationStatus.Assessment,

                _ => false
            };

            if (!canUpdate)
            {
                return Conflict(new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Application status cannot be updated automatically.",
                    Detail = "Create the event without updating the application status, or edit the application status first."
                });
            }

            application.Status = targetStatus.Value;
        }

        var applicationEvent = new ApplicationEvent
        {
            ApplicationId = application.Id,
            Title = request.Title.Trim(),
            Type = eventType,
            Status = ApplicationEventStatus.Scheduled,
            StartsAt = request.StartsAt!.Value.ToUniversalTime(),
            EndsAt = request.EndsAt!.Value.ToUniversalTime(),
            TimeZone = timeZoneId,
            LocationOrLink = request.LocationOrLink?.Trim(),
            Notes = request.Notes?.Trim()
        };

        _context.ApplicationEvents.Add(applicationEvent);

        await _context.SaveChangesAsync();

        var response = await _context.ApplicationEvents.AsNoTracking()
            .Where(e => e.Id == applicationEvent.Id)
            .Select(ApplicationEventResponse.Projection).SingleAsync();

        return CreatedAtAction(nameof(EventsController.GetEvent), "Events",
            new { id = applicationEvent.Id }, response);
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents(int applicationId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applicationExists = await _context.Applications
            .AnyAsync(application =>
                application.Id == applicationId &&
                application.UserId == userId);

        if (!applicationExists)
            return NotFound();

        var events = await _context.ApplicationEvents
            .AsNoTracking()
            .Where(applicationEvent =>
                applicationEvent.ApplicationId == applicationId)
            .OrderBy(applicationEvent => applicationEvent.StartsAt)
            .ThenBy(applicationEvent => applicationEvent.Id)
            .Select(ApplicationEventResponse.Projection)
            .ToListAsync();

        return Ok(events);
    }
}
