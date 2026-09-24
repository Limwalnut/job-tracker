using System.Security.Claims;
using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/applications/{applicationId:int}/checklist")]
public sealed class ApplicationChecklistController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetItems(int applicationId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var applicationExists = await context.Applications.AnyAsync(application =>
            application.Id == applicationId && application.UserId == userId);
        if (!applicationExists) return NotFound();

        var items = await context.ApplicationChecklistItems
            .AsNoTracking()
            .Where(item => item.ApplicationId == applicationId)
            .OrderBy(item => item.IsCompleted)
            .ThenBy(item => item.DueDate == null)
            .ThenBy(item => item.DueDate)
            .ThenBy(item => item.Id)
            .Select(ChecklistItemResponse.Projection)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateItem(int applicationId, CreateChecklistItemRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var applicationExists = await context.Applications.AnyAsync(application =>
            application.Id == applicationId && application.UserId == userId);
        if (!applicationExists) return NotFound();

        var title = request.Title.Trim();
        if (title.Length == 0) ModelState.AddModelError(nameof(request.Title), "Enter a checklist item.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var now = DateTimeOffset.UtcNow;
        var item = new ApplicationChecklistItem
        {
            ApplicationId = applicationId,
            Title = title,
            DueDate = request.DueDate,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        context.ApplicationChecklistItems.Add(item);
        await context.SaveChangesAsync();

        var response = await context.ApplicationChecklistItems.AsNoTracking()
            .Where(candidate => candidate.Id == item.Id)
            .Select(ChecklistItemResponse.Projection)
            .SingleAsync();
        return Created($"/api/checklist/{item.Id}", response);
    }
}
