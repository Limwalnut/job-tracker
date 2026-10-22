using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public sealed class CreatePersonalApiTokenRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;

    public DateTimeOffset? ExpiresAt { get; init; }
}
