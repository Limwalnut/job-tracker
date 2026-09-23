using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public sealed class ChangePasswordRequest
{
    [MaxLength(256)]
    public string? CurrentPassword { get; init; }

    [Required]
    [StringLength(128, MinimumLength = 6)]
    public string NewPassword { get; init; } = string.Empty;
}
