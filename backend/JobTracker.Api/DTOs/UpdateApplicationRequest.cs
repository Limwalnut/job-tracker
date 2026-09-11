using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public class UpdateApplicationRequest
{
    [Required]
    [StringLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    public DateOnly? AppliedDate { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}