using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.DTOs;

public class CreateChecklistItemRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Stage { get; set; } = "General";

    public DateOnly? DueDate { get; set; }
}

public sealed class UpdateChecklistItemRequest : CreateChecklistItemRequest
{
    public bool IsCompleted { get; set; }
}
