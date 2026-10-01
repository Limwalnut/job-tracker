namespace JobTracker.Api.DTOs;

public sealed record ChecklistPreparationItem(
    int Id,
    string Title,
    DateOnly? DueDate,
    bool IsCompleted);