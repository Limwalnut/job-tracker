namespace JobTracker.Api.Models;

public class ApplicationEvent
{
    public int Id { get; set; }

    public int ApplicationId { get; set; }

    public JobApplication Application { get; set; } = null!;

    public required string Title { get; set; }

    public ApplicationEventType Type { get; set; }

    public ApplicationEventStatus Status { get; set; }
        = ApplicationEventStatus.Scheduled;

    public int? InterviewRound { get; set; }

    public string? InterviewStage { get; set; }

    public InterviewOutcome? InterviewOutcome { get; set; }

    public DateTimeOffset StartsAt { get; set; }

    public DateTimeOffset EndsAt { get; set; }

    public bool IsAllDay { get; set; }

    public required string TimeZone { get; set; }

    public string? LocationOrLink { get; set; }

    public string? Notes { get; set; }

    public ICollection<ApplicationStatusHistory> StatusChanges { get; set; }
        = new List<ApplicationStatusHistory>();
}
