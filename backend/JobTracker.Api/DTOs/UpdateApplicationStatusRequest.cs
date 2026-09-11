using System.ComponentModel.DataAnnotations;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public class UpdateApplicationStatusRequest
{
    [Required]
    [EnumDataType(typeof(ApplicationStatus))]
    public ApplicationStatus? Status { get; set; }
}