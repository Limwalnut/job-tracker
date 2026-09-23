using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public sealed class UpdateProfileRequest
{
    [MaxLength(80)]
    public string? DisplayName { get; init; }
}
