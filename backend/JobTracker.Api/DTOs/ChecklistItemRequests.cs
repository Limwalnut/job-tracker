using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public class CreateChecklistItemRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    public DateOnly? DueDate { get; set; }
}

public sealed class UpdateChecklistItemRequest : CreateChecklistItemRequest
{
    public bool IsCompleted { get; set; }
}
