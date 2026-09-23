namespace JobTracker.Api.DTOs;

public sealed record AccountResponse(
    string Id,
    string Email,
    string? DisplayName,
    bool HasPassword,
    bool GoogleConnected);
