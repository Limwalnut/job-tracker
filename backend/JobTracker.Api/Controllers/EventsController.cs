using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEvents(
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] bool includeCancelled = false)
    {
        if (!from.HasValue || !to.HasValue || to <= from || to.Value - from.Value > TimeSpan.FromDays(93))
            return BadRequest(new ProblemDetails { Title = "Provide a valid date range of up to 93 days." });

        var start = from.Value.ToUniversalTime();
        var end = to.Value.ToUniversalTime();
        return Ok(await context.ApplicationEvents.AsNoTracking()
            .Where(e => e.StartsAt < end && e.EndsAt > start &&
                (includeCancelled || e.Status != ApplicationEventStatus.Cancelled))
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Select(ApplicationEventResponse.Projection).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEvent(int id)
    {
        var result = await context.ApplicationEvents.AsNoTracking()
            .Where(e => e.Id == id).Select(ApplicationEventResponse.Projection).SingleOrDefaultAsync();
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateEvent(int id, UpdateApplicationEventRequest request)
    {
        if (request.UpdateApplicationStatus)
            return BadRequest(new ProblemDetails { Title = "Automatic application status updates are only supported when creating an event." });
        var e = await context.ApplicationEvents.FindAsync(id);
        if (e is null) return NotFound();

        e.Title = request.Title.Trim();
        e.Type = request.Type!.Value;
        e.Status = request.Status!.Value;
        e.StartsAt = request.StartsAt!.Value.ToUniversalTime();
        e.EndsAt = request.EndsAt!.Value.ToUniversalTime();
        e.TimeZone = request.TimeZone.Trim();
        e.LocationOrLink = request.LocationOrLink?.Trim();
        e.Notes = request.Notes?.Trim();
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var e = await context.ApplicationEvents.FindAsync(id);
        if (e is null) return NotFound();
        context.ApplicationEvents.Remove(e);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
