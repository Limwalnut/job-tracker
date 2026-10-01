namespace JobTracker.Api.Models;

public sealed class AiAgentRun
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string UserId { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public required string Model { get; set; }

    public string Status { get; set; } = "running";

    public string? StopReason { get; set; }

    public int ModelCalls { get; set; }

    public int ToolExecutions { get; set; }

    public int InputTokens { get; set; }

    public int OutputTokens { get; set; }

    public DateTimeOffset StartedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? FinishedAtUtc { get; set; }
}
