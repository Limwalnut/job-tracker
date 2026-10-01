namespace JobTracker.Api.DTOs;

public sealed record InterviewPreparationResult(
    InterviewPreparationAdvice? Advice,
    bool Completed,
    string StopReason,
    int ModelCalls,
    int ToolExecutions,
    int InputTokens,
    int OutputTokens,
    IReadOnlyList<string> ToolsUsed);
