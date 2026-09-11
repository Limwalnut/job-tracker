namespace JobTracker.Api.Models;

public enum ApplicationStatus
{
    Applied,
    Screening,
    Assessment,
    Interviewing,
    Offer,
    Accepted,
    Rejected,
    Withdrawn
}