namespace JobTracker.Api.Services;

public sealed class ApplicationNotFoundException(int applicationId)
    : Exception($"Application {applicationId} was not found.");
