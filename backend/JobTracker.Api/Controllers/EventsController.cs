using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using JobTracker.Api.Services;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EventsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents(
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] bool includeCancelled = false)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        if (!from.HasValue || !to.HasValue || to <= from || to.Value - from.Value > TimeSpan.FromDays(93))
        {
            return BadRequest(new ProblemDetails { Title = "Provide a valid date range of up to 93 days." });
        }

        var start = from.Value.ToUniversalTime();
        var end = to.Value.ToUniversalTime();

        var events = await _context.ApplicationEvents
            .AsNoTracking()
            .Where(applicationEvent =>
                applicationEvent.Application.UserId == userId &&
                applicationEvent.StartsAt < end &&
                applicationEvent.EndsAt > start &&
                (includeCancelled ||
                    applicationEvent.Status != ApplicationEventStatus.Cancelled))
            .OrderBy(applicationEvent => applicationEvent.StartsAt)
            .ThenBy(applicationEvent => applicationEvent.Id)
            .Select(ApplicationEventResponse.Projection)
            .ToListAsync();

        return Ok(events);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEvent(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applicationEvent = await _context.ApplicationEvents
            .AsNoTracking()
            .Where(applicationEvent =>
                applicationEvent.Id == id &&
                applicationEvent.Application.UserId == userId)
            .Select(ApplicationEventResponse.Projection)
            .SingleOrDefaultAsync();

        if (applicationEvent is null)
        {
            return NotFound();
        }

        return Ok(applicationEvent);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateEvent(int id, UpdateApplicationEventRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.UpdateApplicationStatus)
        {
            return BadRequest(new ProblemDetails { Title = "Automatic application status updates are only supported when creating an event." });
        }

        var applicationEvent = await _context.ApplicationEvents
            .SingleOrDefaultAsync(applicationEvent =>
                applicationEvent.Id == id &&
                applicationEvent.Application.UserId == userId);

        if (applicationEvent is null)
        {
            return NotFound();
        }

        if (request.Status == ApplicationEventStatus.Cancelled &&
            applicationEvent.Status != ApplicationEventStatus.Cancelled)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Use the cancel action to cancel an event."
            });
        }

        if (request.Type == ApplicationEventType.Interview &&
            request.InterviewOutcome is InterviewOutcome.Passed or InterviewOutcome.Failed &&
            request.Status != ApplicationEventStatus.Completed)
        {
            ModelState.AddModelError(
                nameof(request.Status),
                "An interview with a passed or failed result must be completed.");
            return ValidationProblem(ModelState);
        }

        var previousStartsAt = applicationEvent.StartsAt;
        applicationEvent.Title = request.Title.Trim();
        applicationEvent.Type = request.Type!.Value;
        applicationEvent.Status = request.Status!.Value;
        applicationEvent.InterviewRound = request.Type == ApplicationEventType.Interview
            ? request.InterviewRound
            : null;
        applicationEvent.InterviewStage = request.Type == ApplicationEventType.Interview
            ? request.InterviewStage?.Trim()
            : null;
        applicationEvent.InterviewOutcome = request.Type == ApplicationEventType.Interview
            ? request.InterviewOutcome ?? InterviewOutcome.Pending
            : null;
        applicationEvent.StartsAt = request.StartsAt!.Value.ToUniversalTime();
        applicationEvent.EndsAt = request.EndsAt!.Value.ToUniversalTime();
        applicationEvent.IsAllDay = request.IsAllDay;
        applicationEvent.TimeZone = request.TimeZone.Trim();
        applicationEvent.LocationOrLink = request.LocationOrLink?.Trim();
        applicationEvent.Notes = request.Notes?.Trim();

        if (applicationEvent.StartsAt != previousStartsAt)
        {
            applicationEvent.ReminderSentAtUtc = null;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEvent(
        int id,
        [FromQuery] bool revertApplicationStatus = false)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applicationEvent = await _context.ApplicationEvents
            .Include(item => item.Application)
            .SingleOrDefaultAsync(item =>
                item.Id == id && item.Application.UserId == userId);

        if (applicationEvent is null)
        {
            return NotFound();
        }

        if (revertApplicationStatus &&
            !await ApplicationStatusTimeline.UndoLatestChange(
                _context,
                applicationEvent.Application,
                applicationEvent.Id))
        {
            return Conflict(new ProblemDetails
            {
                Title = "The application status cannot be returned automatically.",
                Detail = "A newer status change exists. Delete the event without changing the application status."
            });
        }

        _context.ApplicationEvents.Remove(applicationEvent);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
