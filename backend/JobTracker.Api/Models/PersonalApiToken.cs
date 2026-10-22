using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Models;

public sealed class PersonalApiToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(450)]
    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string SecretHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string DisplayPrefix { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string SecurityStampAtCreation { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ExpiresAtUtc { get; set; }

    public DateTimeOffset? LastUsedAtUtc { get; set; }

    public DateTimeOffset? RevokedAtUtc { get; set; }
}
