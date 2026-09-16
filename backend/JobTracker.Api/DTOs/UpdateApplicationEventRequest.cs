using System.ComponentModel.DataAnnotations;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public class UpdateApplicationEventRequest : CreateApplicationEventRequest
{
    [Required]
    [EnumDataType(typeof(ApplicationEventStatus))]
    public ApplicationEventStatus? Status { get; set; }
}
