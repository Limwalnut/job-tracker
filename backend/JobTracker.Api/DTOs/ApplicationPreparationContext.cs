namespace JobTracker.Api.DTOs;

public sealed record ApplicationPreparationContext(
    int ApplicationId,
    string CompanyName,
    string JobTitle,
    string? JobDescription,
    string? Notes);