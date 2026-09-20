namespace JobTracker.Api.Models;

public class ApplicationStatusHistory
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public JobApplication Application { get; set; } = null!;
    public ApplicationStatus? FromStatus { get; set; }
    public ApplicationStatus ToStatus { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
    public ApplicationStatusChangeSource Source { get; set; }
    public int? ApplicationEventId { get; set; }
    public ApplicationEvent? ApplicationEvent { get; set; }
    public bool IsReverted { get; set; }
    public DateTimeOffset? RevertedAt { get; set; }
}
