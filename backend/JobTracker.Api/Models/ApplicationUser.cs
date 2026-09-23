using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Models;

public class ApplicationUser : IdentityUser
{
    [MaxLength(80)]
    public string? DisplayName { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? LastSeenAtUtc { get; set; }

    public DateTimeOffset? DisabledAtUtc { get; set; }
}
