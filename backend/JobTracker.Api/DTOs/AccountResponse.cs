namespace JobTracker.Api.DTOs;

public sealed record AccountResponse(
    string Id,
    string Email,
    string? DisplayName,
    bool IsAdmin,
    bool HasPassword,
    bool GoogleConnected);
