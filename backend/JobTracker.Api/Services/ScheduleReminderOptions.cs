namespace JobTracker.Api.Services;

public sealed class ScheduleReminderOptions
{
    public const string SectionName = "ScheduleReminders";

    public int LookaheadHours { get; init; } = 24;
    public int PollIntervalMinutes { get; init; } = 5;
}
