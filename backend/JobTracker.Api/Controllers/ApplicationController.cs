using JobTracker.Api.Data;
using JobTracker.Api.Models;
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
}