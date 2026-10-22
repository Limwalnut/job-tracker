namespace JobTracker.Api.DTOs;

using System.Text.Json.Serialization;

public sealed record PersonalApiTokenResponse(
    Guid Id,
    string Name,
    string DisplayPrefix,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset? LastUsedAtUtc,
    DateTimeOffset? RevokedAtUtc,
    string Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? Token = null);
