using JobTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.Api.Controllers;

[ApiController]
[Route("api/applications")]
public class ApplicationController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<JobApplication>> GetApplications()
    {
        var applications = new List<JobApplication>
        {
            new JobApplication
            {
                Id = 1,
                CompanyName = "Company A",
                JobTitle = "Software Engineer",
                Status = "Applied",
                AppliedDate = new DateOnly(2023, 1, 15),
                Notes = "Follow up in 2 weeks"
            },
            new JobApplication
            {
                Id = 2,
                CompanyName = "Company B",
                JobTitle = "Frontend Developer",
                Status = "Interview Scheduled",
                AppliedDate = new DateOnly(2023, 2, 10),
                Notes = "Interview on March 5th"
            }
        };
        return Ok(applications);
    }
}