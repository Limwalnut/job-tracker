namespace JobTracker.Api.DTOs;

public sealed record InterviewPreparationAdvice(
    int? ApplicationId,
    string Summary,
    IReadOnlyList<string> PreparationPlan,
    IReadOnlyList<string> PracticeQuestions,
    IReadOnlyList<SuggestedChecklistItem> SuggestedChecklistItems);

public sealed record SuggestedChecklistItem(
    string Title,
    DateOnly? DueDate);
