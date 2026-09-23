using System.Security.Claims;
using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin")]
public sealed class AdminController(
    AppDbContext context,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewResponse>> GetOverview()
    {
        var now = DateTimeOffset.UtcNow;
        var firstTrendDay = DateOnly.FromDateTime(now.UtcDateTime.Date.AddDays(-13));
        var trendStart = new DateTimeOffset(
            firstTrendDay.ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);

        var totalUsers = await context.Users.CountAsync();
        var activeUsers7Days = await context.Users.CountAsync(user =>
            user.LastSeenAtUtc >= now.AddDays(-7) && user.DisabledAtUtc == null);
        var activeUsers30Days = await context.Users.CountAsync(user =>
            user.LastSeenAtUtc >= now.AddDays(-30) && user.DisabledAtUtc == null);
        var disabledUsers = await context.Users.CountAsync(user => user.DisabledAtUtc != null);
        var totalApplications = await context.Applications.CountAsync();
        var totalEvents = await context.ApplicationEvents.CountAsync();
        var recentUsers = await context.Users
            .AsNoTracking()
            .Where(user => user.CreatedAtUtc >= trendStart)
            .Select(user => user.CreatedAtUtc)
            .ToListAsync();
        var groupedStatusCounts = await context.Applications
            .AsNoTracking()
            .GroupBy(application => application.Status)
            .Select(group => new AdminStatusCount(group.Key, group.Count()))
            .ToListAsync();
        var auditLog = await context.AdminAuditLogs
            .AsNoTracking()
            .OrderByDescending(log => log.CreatedAtUtc)
            .Take(12)
            .Select(log => new AdminAuditEntryResponse(
                log.Id,
                log.AdminUserId,
                log.TargetUserId,
                log.Action,
                log.Detail,
                log.CreatedAtUtc))
            .ToListAsync();

        var usersByDay = recentUsers
            .GroupBy(value => DateOnly.FromDateTime(value.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());
        var trend = Enumerable.Range(0, 14)
            .Select(offset => firstTrendDay.AddDays(offset))
            .Select(date => new AdminTrendPoint(
                date,
                usersByDay.GetValueOrDefault(date)))
            .ToList();
        var statusCounts = Enum.GetValues<ApplicationStatus>()
            .Select(status => new AdminStatusCount(
                status,
                groupedStatusCounts.FirstOrDefault(item => item.Status == status)?.Count ?? 0))
            .ToList();

        return Ok(new AdminOverviewResponse(
            totalUsers,
            activeUsers7Days,
            activeUsers30Days,
            disabledUsers,
            totalApplications,
            totalEvents,
            trend,
            statusCounts,
            auditLog));
    }

    [HttpGet("users")]
    public async Task<ActionResult<AdminUsersResponse>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string status = "all")
    {
        if (page < 1)
        {
            ModelState.AddModelError(nameof(page), "Page must be at least 1.");
        }

        if (pageSize is < 1 or > 100)
        {
            ModelState.AddModelError(nameof(pageSize), "Page size must be between 1 and 100.");
        }

        var normalizedStatus = status.Trim().ToLowerInvariant();
        if (normalizedStatus is not ("all" or "active" or "disabled"))
        {
            ModelState.AddModelError(nameof(status), "Status must be all, active, or disabled.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var users = context.Users.AsNoTracking();
        if (normalizedStatus == "active")
        {
            users = users.Where(user => user.DisabledAtUtc == null);
        }
        else if (normalizedStatus == "disabled")
        {
            users = users.Where(user => user.DisabledAtUtc != null);
        }

        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrEmpty(normalizedSearch))
        {
            var escapedSearch = normalizedSearch
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            var pattern = $"%{escapedSearch}%";
            users = users.Where(user =>
                EF.Functions.ILike(user.Email ?? string.Empty, pattern, "\\") ||
                EF.Functions.ILike(user.DisplayName ?? string.Empty, pattern, "\\"));
        }

        var totalCount = await users.CountAsync();
        var items = await ProjectUsers(users)
            .OrderByDescending(user => user.CreatedAtUtc)
            .ThenBy(user => user.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new AdminUsersResponse(
            items,
            page,
            pageSize,
            totalCount,
            Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize))));
    }

    [HttpGet("users/{id}")]
    public async Task<ActionResult<AdminUserDetailResponse>> GetUser(string id)
    {
        var user = await ProjectUsers(context.Users.AsNoTracking().Where(user => user.Id == id))
            .SingleOrDefaultAsync();
        if (user is null)
        {
            return NotFound();
        }

        var groupedCounts = await context.Applications
            .AsNoTracking()
            .Where(application => application.UserId == id)
            .GroupBy(application => application.Status)
            .Select(group => new AdminStatusCount(group.Key, group.Count()))
            .ToListAsync();
        var statusCounts = Enum.GetValues<ApplicationStatus>()
            .Select(status => new AdminStatusCount(
                status,
                groupedCounts.FirstOrDefault(item => item.Status == status)?.Count ?? 0))
            .ToList();

        return Ok(new AdminUserDetailResponse(user, statusCounts));
    }

    [HttpPatch("users/{id}/status")]
    public async Task<ActionResult<AdminUserDetailResponse>> UpdateUserStatus(
        string id,
        [FromBody] UpdateAdminUserStatusRequest request)
    {
        var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (adminId is null)
        {
            return Unauthorized();
        }

        if (request.Disabled && id == adminId)
        {
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]>
                {
                    ["user"] = ["You cannot disable your own administrator account."]
                }));
        }

        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        if ((user.DisabledAtUtc is not null) != request.Disabled)
        {
            user.DisabledAtUtc = request.Disabled ? DateTimeOffset.UtcNow : null;
            var updateResult = await userManager.UpdateSecurityStampAsync(user);
            if (!updateResult.Succeeded)
            {
                return Problem("Unable to update the account status.");
            }

            context.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = adminId,
                TargetUserId = user.Id,
                Action = request.Disabled ? "user.disabled" : "user.enabled",
                Detail = request.Disabled
                    ? "Account access was disabled."
                    : "Account access was restored."
            });
            await context.SaveChangesAsync();
        }

        return await GetUser(id);
    }

    private IQueryable<AdminUserListItemResponse> ProjectUsers(IQueryable<ApplicationUser> users)
    {
        return users.Select(user => new AdminUserListItemResponse(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.CreatedAtUtc,
            user.LastSeenAtUtc,
            user.DisabledAtUtc,
            user.PasswordHash != null,
            context.UserLogins.Any(login =>
                login.UserId == user.Id && login.LoginProvider == "Google"),
            context.Applications.Count(application => application.UserId == user.Id),
            context.ApplicationEvents.Count(applicationEvent =>
                applicationEvent.Application.UserId == user.Id)));
    }
}
