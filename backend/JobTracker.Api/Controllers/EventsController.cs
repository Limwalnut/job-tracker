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

        applicationEvent.Title = request.Title.Trim();
        applicationEvent.Type = request.Type!.Value;
        applicationEvent.Status = request.Status!.Value;
        applicationEvent.StartsAt = request.StartsAt!.Value.ToUniversalTime();
        applicationEvent.EndsAt = request.EndsAt!.Value.ToUniversalTime();
        applicationEvent.TimeZone = request.TimeZone.Trim();
        applicationEvent.LocationOrLink = request.LocationOrLink?.Trim();
        applicationEvent.Notes = request.Notes?.Trim();

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applicationEvent = await _context.ApplicationEvents
            .SingleOrDefaultAsync(applicationEvent =>
                applicationEvent.Id == id &&
                applicationEvent.Application.UserId == userId);

        if (applicationEvent is null)
        {
            return NotFound();
        }

        _context.ApplicationEvents.Remove(applicationEvent);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
