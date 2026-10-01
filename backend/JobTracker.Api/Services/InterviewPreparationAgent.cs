using JobTracker.Api.DTOs;
using OpenAI.Responses;
using System.Text.Json;

#pragma warning disable OPENAI001

namespace JobTracker.Api.Services;

public sealed class InterviewPreparationAgent(
    AiModelService ai,
    InterviewPreparationTools tools,
    AiAgentRunRecorder recorder,
    ILogger<InterviewPreparationAgent> logger)
{
    private const int MaxModelCalls = 5;
    private const int MaxToolExecutions = 4;
    private const int MaxToolResultCharacters = 12_000;

    public async Task<InterviewPreparationResult> RunAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException(
                "A current user ID is required.", nameof(userId));
        }

        var run = await recorder.StartAsync(
            userId,
            AiModelService.AgentModel,
            cancellationToken);

        using var timeout = CancellationTokenSource
            .CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(90));

        var history = new List<ResponseItem>
        {
            ResponseItem.CreateUserMessageItem(
                "Help me prepare for my next interview.")
        };
        var toolsUsed = new List<string>();
        var modelCalls = 0;
        var toolExecutions = 0;
        var inputTokens = 0;
        var outputTokens = 0;
        string? text = null;
        InterviewPreparationAdvice? advice = null;

        Task SaveProgressAsync(CancellationToken token) =>
            recorder.SaveProgressAsync(
                run,
                modelCalls,
                toolExecutions,
                inputTokens,
                outputTokens,
                token);

        async Task<InterviewPreparationResult> FinishAsync(string stopReason)
        {
            using var saveTimeout = new CancellationTokenSource(
                TimeSpan.FromSeconds(5));

            await SaveProgressAsync(saveTimeout.Token);
            await recorder.FinishAsync(
                run,
                stopReason == "completed" ? "completed" : "stopped",
                stopReason,
                saveTimeout.Token);

            return new InterviewPreparationResult(
                advice,
                stopReason == "completed",
                stopReason,
                modelCalls,
                toolExecutions,
                inputTokens,
                outputTokens,
                toolsUsed.ToArray());
        }

        async Task RecordFailureAsync(string reason)
        {
            using var saveTimeout = new CancellationTokenSource(
                TimeSpan.FromSeconds(5));

            try
            {
                await SaveProgressAsync(saveTimeout.Token);
                await recorder.FinishAsync(
                    run,
                    "failed",
                    reason,
                    saveTimeout.Token);
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Failed to finalize AI agent run {RunId}.",
                    run.Id);
            }
        }

        try
        {
            while (modelCalls < MaxModelCalls)
            {
                timeout.Token.ThrowIfCancellationRequested();
                modelCalls++;
                await SaveProgressAsync(timeout.Token);

                var response = await ai.GenerateAsync(history, timeout.Token);
                inputTokens += response.Usage?.InputTokenCount ?? 0;
                outputTokens += response.Usage?.OutputTokenCount ?? 0;
                await SaveProgressAsync(timeout.Token);

                text = response.GetOutputText();

                if (response.Status != ResponseStatus.Completed)
                {
                    return await FinishAsync("model_response_not_completed");
                }

                var calls = response.OutputItems
                    .OfType<FunctionCallResponseItem>()
                    .ToArray();

                if (calls.Length == 0)
                {
                    var refused = response.OutputItems
                        .OfType<MessageResponseItem>()
                        .SelectMany(message => message.Content)
                        .Any(part => !string.IsNullOrWhiteSpace(part.Refusal));

                    if (refused)
                    {
                        return await FinishAsync("model_refusal");
                    }

                    if (string.IsNullOrWhiteSpace(text))
                    {
                        return await FinishAsync("empty_response");
                    }

                    try
                    {
                        var jsonOptions = new JsonSerializerOptions(
                            JsonSerializerDefaults.Web)
                        {
                            RespectNullableAnnotations = true,
                            RespectRequiredConstructorParameters = true
                        };

                        var parsed = JsonSerializer.Deserialize<
                            InterviewPreparationAdvice>(text, jsonOptions);

                        if (parsed is null ||
                            string.IsNullOrWhiteSpace(parsed.Summary) ||
                            parsed.ApplicationId is <= 0 ||
                            parsed.PreparationPlan.Any(string.IsNullOrWhiteSpace) ||
                            parsed.PracticeQuestions.Any(string.IsNullOrWhiteSpace) ||
                            parsed.SuggestedChecklistItems.Any(item =>
                                item is null || string.IsNullOrWhiteSpace(item.Title)))
                        {
                            return await FinishAsync("invalid_structured_output");
                        }

                        advice = parsed;
                        return await FinishAsync("completed");
                    }
                    catch (JsonException)
                    {
                        return await FinishAsync("invalid_structured_output");
                    }
                }

                if (modelCalls == MaxModelCalls)
                {
                    return await FinishAsync("model_call_limit");
                }

                if (toolExecutions + calls.Length > MaxToolExecutions)
                {
                    return await FinishAsync("tool_execution_limit");
                }

                history.AddRange(response.OutputItems);

                foreach (var call in calls)
                {
                    toolExecutions++;
                    toolsUsed.Add(call.FunctionName);
                    await SaveProgressAsync(timeout.Token);

                    var toolResult = await tools.ExecuteAsync(
                        userId,
                        call.FunctionName,
                        call.FunctionArguments.ToString(),
                        timeout.Token);

                    if (toolResult.Length > MaxToolResultCharacters)
                    {
                        return await FinishAsync("tool_result_too_large");
                    }

                    history.Add(
                        ResponseItem.CreateFunctionCallOutputItem(
                            call.CallId,
                            toolResult));
                }
            }

            return await FinishAsync("model_call_limit");
        }
        catch (OperationCanceledException)
        {
            await RecordFailureAsync(
                cancellationToken.IsCancellationRequested
                    ? "request_cancelled"
                    : "timeout");
            throw;
        }
        catch (Exception)
        {
            await RecordFailureAsync("execution_failed");
            throw;
        }
    }
}
