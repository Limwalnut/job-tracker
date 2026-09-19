using JobTracker.Api.Data;
using JobTracker.Api.Models;
using JobTracker.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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
            JobDescription = request.JobDescription?.Trim(),
            Notes = request.Notes?.Trim(),
            Status = ApplicationStatus.Applied
        };

        _context.Applications.Add(application);
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

        application.CompanyName = request.CompanyName.Trim();
        application.JobTitle = request.JobTitle.Trim();
        application.AppliedDate = request.AppliedDate!.Value;
        application.JobDescription = request.JobDescription?.Trim();
        application.Notes = request.Notes?.Trim();
        application.Status = request.Status!.Value;

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

        application.Status = request.Status!.Value;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
