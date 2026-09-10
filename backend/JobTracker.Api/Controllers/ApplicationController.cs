using JobTracker.Api.Data;
using JobTracker.Api.Models;
using JobTracker.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

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
        var applications = await _context.Applications
            .AsNoTracking()
            .OrderByDescending(application => application.AppliedDate)
            .ThenByDescending(application => application.Id)
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobApplication>> GetApplication(int id)
    {
        var application = await _context.Applications
            .AsNoTracking()
            .SingleOrDefaultAsync(application => application.Id == id);

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
        var application = new JobApplication
        {
            CompanyName = request.CompanyName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            AppliedDate = request.AppliedDate!.Value,
            Notes = request.Notes?.Trim(),
            Status = "Applied"
        };

        _context.Applications.Add(application);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetApplication),
            new { id = application.Id },
            application);
    }
}