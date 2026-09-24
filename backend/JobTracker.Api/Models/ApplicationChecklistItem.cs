namespace JobTracker.Api.Models;

public class ApplicationChecklistItem
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public JobApplication Application { get; set; } = null!;
    public required string Title { get; set; }
    public required string Stage { get; set; }
    public DateOnly? DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
