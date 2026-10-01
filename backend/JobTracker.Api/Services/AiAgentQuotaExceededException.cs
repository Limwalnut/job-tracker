namespace JobTracker.Api.Services;

public sealed class AiAgentQuotaExceededException(
    int dailyRunLimit,
    DateTimeOffset resetAtUtc)
    : Exception("The daily AI agent run limit has been reached.")
{
    public int DailyRunLimit { get; } = dailyRunLimit;

    public DateTimeOffset ResetAtUtc { get; } = resetAtUtc;
}
