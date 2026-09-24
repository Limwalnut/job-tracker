using System.Security.Claims;
using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/checklist")]
public sealed class ChecklistController(AppDbContext context) : ControllerBase
{
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, UpdateChecklistItemRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var item = await context.ApplicationChecklistItems.SingleOrDefaultAsync(candidate =>
            candidate.Id == id && candidate.Application.UserId == userId);
        if (item is null) return NotFound();

        var title = request.Title.Trim();
        var stage = request.Stage.Trim();
        if (title.Length == 0) ModelState.AddModelError(nameof(request.Title), "Enter a checklist item.");
        if (stage.Length == 0) ModelState.AddModelError(nameof(request.Stage), "Enter a stage.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var now = DateTimeOffset.UtcNow;
        item.Title = title;
        item.Stage = stage;
        item.DueDate = request.DueDate;
        if (item.IsCompleted != request.IsCompleted)
        {
            item.IsCompleted = request.IsCompleted;
            item.CompletedAtUtc = request.IsCompleted ? now : null;
        }
        item.UpdatedAtUtc = now;
        await context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var item = await context.ApplicationChecklistItems.SingleOrDefaultAsync(candidate =>
            candidate.Id == id && candidate.Application.UserId == userId);
        if (item is null) return NotFound();

        context.ApplicationChecklistItems.Remove(item);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
