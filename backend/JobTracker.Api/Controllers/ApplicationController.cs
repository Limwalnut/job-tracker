using JobTracker.Api.Data;
using JobTracker.Api.Models;
using JobTracker.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using JobTracker.Api.Services;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/applications")]
public class ApplicationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ApplicationsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<JobApplication>>> GetApplications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applications = await _context.Applications
            .AsNoTracking()
            .Where(application => application.UserId == userId)
            .OrderByDescending(application => application.AppliedDate)
            .ThenByDescending(application => application.Id)
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("paged")]
    public async Task<ActionResult<PagedApplicationsResponse>> GetPagedApplications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string scope = "active",
        [FromQuery] ApplicationStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string sort = "newest")
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        if (page < 1)
        {
            ModelState.AddModelError(nameof(page), "Page must be at least 1.");
        }

        if (pageSize is < 1 or > 100)
        {
            ModelState.AddModelError(nameof(pageSize), "Page size must be between 1 and 100.");
        }

        var normalizedScope = scope.Trim().ToLowerInvariant();
        if (normalizedScope is not ("active" or "closed" or "all"))
        {
            ModelState.AddModelError(nameof(scope), "Scope must be active, closed, or all.");
        }

        var normalizedSort = sort.Trim().ToLowerInvariant();
        if (normalizedSort is not ("newest" or "oldest" or "company"))
        {
            ModelState.AddModelError(nameof(sort), "Sort must be newest, oldest, or company.");
        }

        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var closedStatuses = new[]
        {
            ApplicationStatus.Accepted,
            ApplicationStatus.Rejected,
            ApplicationStatus.Withdrawn
        };

        var userApplications = _context.Applications
            .AsNoTracking()
            .Where(application => application.UserId == userId);

        var allCount = await userApplications.CountAsync();
        var closedCount = await userApplications.CountAsync(application =>
            closedStatuses.Contains(application.Status));
        var activeCount = allCount - closedCount;
        var groupedStatusCounts = await userApplications
            .GroupBy(application => application.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync();
        var statusCounts = Enum.GetValues<ApplicationStatus>()
            .ToDictionary(
                applicationStatus => applicationStatus,
                applicationStatus => groupedStatusCounts
                    .FirstOrDefault(item => item.Status == applicationStatus)?.Count ?? 0);

        IQueryable<JobApplication> filtered = userApplications;
        if (normalizedScope == "active")
        {
            filtered = filtered.Where(application =>
                !closedStatuses.Contains(application.Status));
        }
        else if (normalizedScope == "closed")
        {
            filtered = filtered.Where(application =>
                closedStatuses.Contains(application.Status));
        }

        if (status is not null)
        {
            filtered = filtered.Where(application => application.Status == status.Value);
        }

        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrEmpty(normalizedSearch))
        {
            var escapedSearch = normalizedSearch
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            var pattern = $"%{escapedSearch}%";
            filtered = filtered.Where(application =>
                EF.Functions.ILike(application.CompanyName, pattern, "\\") ||
                EF.Functions.ILike(application.JobTitle, pattern, "\\"));
        }

        var totalCount = await filtered.CountAsync();
        var totalPages = totalCount == 0
            ? 1
            : (int)Math.Ceiling(totalCount / (double)pageSize);
        var normalizedPage = Math.Min(page, totalPages);

        var ordered = normalizedSort switch
        {
            "oldest" => filtered
                .OrderBy(application => application.AppliedDate)
                .ThenBy(application => application.Id),
            "company" => filtered
                .OrderBy(application => application.CompanyName)
                .ThenBy(application => application.JobTitle)
                .ThenByDescending(application => application.Id),
            _ => filtered
                .OrderByDescending(application => application.AppliedDate)
                .ThenByDescending(application => application.Id)
        };

        var items = await ordered
            .Skip((normalizedPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedApplicationsResponse(
            items,
            normalizedPage,
            pageSize,
            totalCount,
            totalPages,
            activeCount,
            closedCount,
            allCount,
            statusCounts));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobApplication>> GetApplication(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await _context.Applications
            .AsNoTracking()
            .SingleOrDefaultAsync(application => application.Id == id && application.UserId == userId);

        if (application == null)
        {
            return NotFound();
        }

        return Ok(application);
    }

    [HttpPost]
    public async Task<ActionResult<JobApplication>> CreateApplication(
        [FromBody] CreateApplicationRequest request
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = request.CompanyName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            AppliedDate = request.AppliedDate!.Value,
            JobDescriptionUrl = request.JobDescriptionUrl?.Trim(),
            ContactName = request.ContactName?.Trim(),
            ContactPhone = request.ContactPhone?.Trim(),
            ContactEmail = request.ContactEmail?.Trim(),
            JobDescription = request.JobDescription?.Trim(),
            Notes = request.Notes?.Trim(),
            Status = ApplicationStatus.Applied
        };

        _context.Applications.Add(application);
        ApplicationStatusTimeline.RecordInitialStatus(_context, application);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetApplication),
            new { id = application.Id },
            application);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateApplication(
        int id,
        [FromBody] UpdateApplicationRequest request
    )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await _context.Applications
            .SingleOrDefaultAsync(application =>
                application.Id == id &&
                application.UserId == userId);

        if (application is null)
        {
            return NotFound();
        }

        ApplicationStatusTimeline.ChangeStatus(
            _context,
            application,
            request.Status!.Value,
            ApplicationStatusChangeSource.Manual);

        application.CompanyName = request.CompanyName.Trim();
        application.JobTitle = request.JobTitle.Trim();
        application.AppliedDate = request.AppliedDate!.Value;
        application.JobDescriptionUrl = request.JobDescriptionUrl?.Trim();
        application.ContactName = request.ContactName?.Trim();
        application.ContactPhone = request.ContactPhone?.Trim();
        application.ContactEmail = request.ContactEmail?.Trim();
        application.JobDescription = request.JobDescription?.Trim();
        application.Notes = request.Notes?.Trim();
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteApplication(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await _context.Applications
            .SingleOrDefaultAsync(application =>
                application.Id == id &&
                application.UserId == userId);

        if (application is null)
        {
            return NotFound();
        }

        _context.Applications.Remove(application);

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(
        int id,
        [FromBody] UpdateApplicationStatusRequest request
    )
    {

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var application = await _context.Applications
            .SingleOrDefaultAsync(application =>
                application.Id == id &&
                application.UserId == userId);

        if (application is null)
        {
            return NotFound();
        }

        ApplicationStatusTimeline.ChangeStatus(
            _context,
            application,
            request.Status!.Value,
            ApplicationStatusChangeSource.Manual);

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:int}/timeline")]
    public async Task<IActionResult> GetStatusTimeline(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Unauthorized();
        }

        var applicationStatus = await _context.Applications
            .Where(application => application.Id == id && application.UserId == userId)
            .Select(application => (ApplicationStatus?)application.Status)
            .SingleOrDefaultAsync();

        if (applicationStatus is null) return NotFound();

        var timeline = await _context.ApplicationStatusHistories
            .AsNoTracking()
            .Where(history =>
                history.ApplicationId == id &&
                history.Application.UserId == userId)
            .OrderBy(history => history.ChangedAt)
            .ThenBy(history => history.Id)
            .Select(ApplicationStatusHistoryResponse.Projection)
            .ToListAsync();

        var latestActiveIndex = timeline.FindLastIndex(history =>
            !history.IsReverted && history.FromStatus is not null);

        if (latestActiveIndex >= 0 &&
            timeline[latestActiveIndex].ToStatus == applicationStatus.Value)
        {
            timeline[latestActiveIndex] = timeline[latestActiveIndex] with { CanUndo = true };
        }

        return Ok(timeline);
    }

    [HttpPost("{id:int}/timeline/undo")]
    public async Task<IActionResult> UndoLatestStatusChange(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var application = await _context.Applications.SingleOrDefaultAsync(application =>
            application.Id == id && application.UserId == userId);
        if (application is null) return NotFound();

        if (!await ApplicationStatusTimeline.UndoLatestChange(_context, application))
        {
            return Conflict(new ProblemDetails
            {
                Title = "The latest status change cannot be undone.",
                Detail = "The application status changed after this timeline entry. Refresh and try again."
            });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
