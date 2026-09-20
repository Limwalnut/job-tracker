using System.ComponentModel.DataAnnotations;
using JobTracker.Api.Models;

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

    [Required]
    [EnumDataType(typeof(ApplicationStatus))]
    public ApplicationStatus? Status { get; set; }

    [Url]
    [StringLength(2000)]
    public string? JobDescriptionUrl { get; set; }

    [StringLength(200)]
    public string? ContactName { get; set; }

    [Phone]
    [StringLength(50)]
    public string? ContactPhone { get; set; }

    [EmailAddress]
    [StringLength(320)]
    public string? ContactEmail { get; set; }

    [StringLength(20000)]
    public string? JobDescription { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}
