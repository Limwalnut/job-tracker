using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Models;

public class ApplicationUser : IdentityUser
{
    [MaxLength(80)]
    public string? DisplayName { get; set; }
}
