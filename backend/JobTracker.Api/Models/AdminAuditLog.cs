using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Models;

public sealed class AdminAuditLog
{
    public long Id { get; set; }

    [MaxLength(450)]
    public required string AdminUserId { get; set; }

    [MaxLength(450)]
    public string? TargetUserId { get; set; }

    [MaxLength(100)]
    public required string Action { get; set; }

    [MaxLength(1000)]
    public string? Detail { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
