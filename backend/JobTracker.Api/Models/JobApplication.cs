namespace JobTracker.Api.Models;

public class JobApplication
{
    public int Id { get; set; }
    public required string CompanyName { get; set; }
    public required string JobTitle { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    public DateOnly AppliedDate { get; set; }
    public string? Notes { get; set; }
}